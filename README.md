*Status: DEV*

Open Peer SDK for JavaScript
============================

WebRTC P2P signalling, federated identities and more.

Based on the following specifications:

  * [Open Peer Protocol](http://docs.openpeer.org/OpenPeerProtocolSpecification)
  * [WebRTC 1.0: Real-time Communication Between Browsers](http://dev.w3.org/2011/webrtc/editor/webrtc.html)


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

  1. `make test-dev` (this runs server-side and dev UI tests)
  2. Launch dev UI
  3. Run all dev UI tests
  4. Make changes
  5. Run/write individual tests to verify changes
  6. `make test-dev`
  7. Commit

Notes:

  * OpenPeer library source: `./lib`
  * Client tests: `./dev/tests`
  * Mocks for client tests: `./dev/mocks`


Demo
----

Install:

    make install-demo

Run:

    make run-demo

Test:

    make test-demo

Deploy:

    make deploy-demo

First time deploy setup:

    sudo easy_install pip && sudo pip install dotcloud
    dotcloud setup
