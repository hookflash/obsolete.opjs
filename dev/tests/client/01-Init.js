
describe("Init", function() {

	describe("OpenPeer", function() {

		it("should be a global function", function() {
			assert.isFunction(OpenPeer);
		});

		describe("when instanciated", function() {
			it("should give us an object", function() {
				assert.isObject(new OpenPeer());
			});
		});

	});

});
