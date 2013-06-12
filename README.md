*Status: DEV*

Open Peer SDK for JavaScript
============================

WebRTC P2P signalling, federated identities and more.

Based on the following specifications:

  * [Open Peer Protocol](http://docs.openpeer.org/OpenPeerProtocolSpecification)
  * [WebRTC 1.0: Real-time Communication Between Browsers](http://dev.w3.org/2011/webrtc/editor/webrtc.html)

For sample integration see: https://github.com/openpeer/opjs-demo

Usage
-----

*TODO: Instructions on how to use the SDK*


Development
-----------

Development of this SDK is done via a development UI:

    make install
    make run
    open http://localhost:8081/

Development Process:

  1. `make test` (this runs server-side and dev UI tests)
  2. Launch dev UI
  3. Run all dev UI tests
  4. Make changes
  5. Run/write individual tests to verify changes
  6. `make test`
  7. Commit


License
=======

[BSD-2-Clause](http://opensource.org/licenses/BSD-2-Clause)
