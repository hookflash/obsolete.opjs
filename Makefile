
install:
	npm install

test: test-dev test-demo


install-dev:
	$(MAKE) install
	cd dev; npm install

run-dev:
	node dev

test-dev:
	cd dev; make test


install-demo:
	$(MAKE) install
	cd demo; npm install

run-demo:
	node demo

test-demo:
	if ! hash grunt 2>/dev/null; then npm install -g grunt-cli; fi
	cd demo; npm test

deploy-demo:
	cd demo; dotcloud push


.PHONY: install test install-dev run-dev test-dev install-demo run-demo test-demo deploy-demo
