*Status: DEV*

Open Peer SDK for JavaScript
============================

WebRTC P2P signalling, federated identities and more.


Usage
-----

*TODO: Instructions on how to use the SDK*


Development
-----------

Development of this SDK is done via a development UI:

	make install-dev
  make run-dev
	open http://localhost:8081/

Development Process:

  1. Launch UI
  2. Run all tests (only proceed if all pass)
  3. Make changes
  4. Run/write individual tests to verify changes
  5. Run all tests (only proceed if all pass)
  6. Commit

Notes:

  * OpenPeer library source: `./lib`
  * Client tests: `./dev/tests`
  * Mocks for client tests: `./dev/mocks`


Prototype
---------

Install:

  make install-proto

Run:

  make run-proto

Test:

  make test-proto
