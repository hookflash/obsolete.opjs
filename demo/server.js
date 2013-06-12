/*jshint node: true */
'use strict';

var https = require('https');
var http = require('http');
var url = require('url');
var fs = require('fs');
var querystring = require('querystring');
var pathJoin = require('path').join;
var send = require('send');

var SendGrid = require('sendgrid').SendGrid;


var config = JSON.parse(fs.readFileSync(pathJoin(__dirname, 'config.local.json')));


var sendgrid = new SendGrid(config.sendgrid.username, config.sendgrid.password);


// TODO: Only allow limited number of invites to be sent within X amout of time.
exports.getInviteRoute = function() {
    return function handler(req, res, next) {
        var pathname = url.parse(req.url, true);
        if (pathname.pathname === '/invite') {
            var message;
            if (pathname.query && pathname.query.contactemail) {
                console.log("send invite email to", pathname.query.contactemail);
                sendgrid.send({
                    to: pathname.query.contactemail,
                    from: pathname.query.useremail || "info@webrtc.hookflash.com",
                    subject: 'Invitation to OpenPeer Demo',
                    text: ('http://webrtc.hookflash.me/')
                }, function(success, message) {
                    if (!success) {
                        console.error("[sendgrid]", message);
                    }
                });
                message = {"done": "true"};
            } else {
                message = {"fail": "true"};
            }
            res.writeHeader(200, {"Content-Type": "application/json"});
            res.write(JSON.stringify(message));
            res.end();
        } else {
            next();
        }
    }
}

var inviteRoute = exports.getInviteRoute();

function handler(req, res) {
    inviteRoute(req, res, function(err) {
        if (err) {
            console.error("ERROR", err.stack);
            // TODO: Return error to client.
        }

        var pathname = url.parse(req.url, true);
        send(req, pathname.pathname).root(pathJoin(__dirname, 'public')).pipe(res);
    });
}


if (module === require.main) {
    // Start the server(s)
    // Run in production mode if the process is root
    var server = http.createServer(handler);

    server.listen(process.getuid() ? 8080 : 80);
    console.log('HTTP server listening at', server.address());

    // If a certificate file exists, start an https server too
    var pfx;
    try {
        pfx = require('fs').readFileSync('certificate.pfx');
    }
    catch (err) {

    }
    if (pfx) {
        server = https.createServer({
            pfx: pfx,
            honorCipherOrder: true
        }, handler);

        server.listen(process.getuid() ? 8443 : 443);
        console.log('HTTPS server listening at', server.address());
    }

    //drop to normal user after binding to the port
    if (!process.getuid()) {
        //  If we're running as root, drop down to a regular user after binding to 80
        var stat = require('fs').statSync(__filename);

        console.log('Dropping to normal user', {gid: stat.gid, uid: stat.uid});

        process.setgid(stat.gid);
        process.setuid(stat.uid);
    }
}