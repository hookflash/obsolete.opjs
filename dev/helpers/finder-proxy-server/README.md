Open Peer Finder Proxy
======================

This proxy takes incoming websocket connections on port `3001` and connects to a finder
at `127.0.0.1:9292` using a TCP connection.

Websocket messages are framed using 64-bit big-endian unsigned integers length headers
and sent over the TCP connection. Responses are deframed and send back over the websocket connection.

One TCP connection is established for every websocket connection and as soon as one connection
in the pair closes the other si closed as well.


Usage
-----

This proxy server is designed to run on the same VM as the finder server it is proxying.

Install:

	npm install

Start proxy:

	node server --bind <public ip>

For all options see:

	node server -h


Development
-----------

To run connection tests against bootstrapper host `provisioning-stable-dev.hookflash.me` use:

	make test
