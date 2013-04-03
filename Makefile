
install-dev:
	cd dev; npm install

run-dev:
	node dev

install-proto:
	cd prototype; npm install
	# TMP: Until `grunt-lib-phantomjs` is republished with `phantomjs@1.9.0-1` as dependency.
	cd prototype/node_modules/grunt-mocha/node_modules/grunt-lib-phantomjs; npm install phantomjs@1.9.0-1

run-proto:
	node prototype

test-proto:
	if ! hash grunt 2>/dev/null; then npm install -g grunt-cli; fi
	cd prototype; npm test
