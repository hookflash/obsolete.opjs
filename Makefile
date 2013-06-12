
install:
	npm install
	cd dev; make install

run:
	@node dev

test:
	cd dev; make test

.PHONY: install run test
