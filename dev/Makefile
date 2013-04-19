
REPORTER ?= dot

install:
	cd helpers/p2p-relay-server; npm install
	cd helpers/websocket-test-server; npm install
	cd helpers/finder-server; npm install

test:
	./node_modules/.bin/mocha --reporter $(REPORTER) tests-server/*.js
	cd helpers/p2p-relay-server; make test

.PHONY: install test
