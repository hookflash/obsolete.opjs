
install:
	npm install
	cd dev; make install

run:
	@node dev

test:
	cd dev; make test

publish:
	mkdir .dist
	cp -Rf * .dist/
	cp -Rf .*ignore .dist/
	rm -Rf .dist/node_modules
	rm -Rf .dist/dev/node_modules
	rm -Rf .dist/dev/helpers/*/node_modules
	cd .dist; npm publish
	rm -Rf .dist

.PHONY: install run test publish
