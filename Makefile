
test: test-dev test-demo


install-dev:
	npm install --production
	cd dev; npm install --production

install-dev-test:
	npm install
	cd dev; npm install

run-dev:
	node dev

test-dev:
	cd dev; make test


install-demo:
	npm install --production
	cd demo; npm install --production

install-demo-test:
	npm install
	cd demo; npm install

run-demo:
	node demo

test-demo:
	if ! hash grunt 2>/dev/null; then npm install -g grunt-cli; fi
	cd demo; npm test

deploy-demo:
	cd demo; dotcloud push


.PHONY: test install-dev run-dev test-dev install-demo run-demo test-demo deploy-demo
