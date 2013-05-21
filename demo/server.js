/*jshint node: true */
'use strict';

var https = require('https');
var http = require('http');
var urlParse = require('url').parse;
var querystring = require('querystring');
var pathJoin = require('path').join;
var send = require('send');

function handler(req, res) {
    var pathname = urlParse(req.url).pathname;

    send(req, pathname).root(pathJoin(__dirname, 'public')).pipe(res);
}

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

