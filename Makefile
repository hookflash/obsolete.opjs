
install-dev:
	cd dev; npm install

run-dev:
	node dev

install-proto:
	cd prototype; npm install

run-proto:
	node prototype

test-proto:
	if ! hash grunt 2>/dev/null; then npm install -g grunt-cli; fi
	cd prototype; npm test
