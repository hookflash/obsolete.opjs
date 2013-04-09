
install-dev:
	cd dev; npm install

run-dev:
	node dev

test-dev:
	cd dev; make test


install-demo:
	cd demo; npm install
	# TMP: Until `grunt-lib-phantomjs` is republished with `phantomjs@1.9.0-1` as dependency.
	cd demo/node_modules/grunt-mocha/node_modules/grunt-lib-phantomjs; npm install phantomjs@1.9.0-1

run-demo:
	node demo

test-demo:
	if ! hash grunt 2>/dev/null; then npm install -g grunt-cli; fi
	cd demo; npm test

deploy-demo:
	cd demo; dotcloud push


.PHONY: install-dev run-dev test-dev install-demo run-demo test-demo deploy-demo
