var http = require('http');
var urlParse = require('url').parse;
var pathJoin = require('path').join;
var send = require('send');

var server = http.createServer(function (req, res) {
  var pathname = urlParse(req.url).pathname;

  if (pathname.slice(0, 6) === "/opjs/") {
    send(req, pathname.slice(5))
      .root(pathJoin(__dirname, "..", "lib"))
      .pipe(res);
    return;
  }

  send(req, pathname)
    .root(pathJoin(__dirname, "public"))
    .pipe(res);
});

server.listen(8080, function () {
  console.log("Server listening at", server.address());
});
