
const SERVER = require("../server");
const GRUNT = require("grunt");


describe("run-ui-tests", function() {

    it("grunt-phantomjs", function(done) {

        this.timeout(120 * 1000);

        return SERVER.main(function(err, info) {
            if (err) return done(err);

            GRUNT.initConfig({
                mocha: {
                    all: {
                        options: {
                            reporter: "List",
                            urls: [
                                //"http://localhost:" + info.port + "/test/flow/10-ConnectToFinder"
                                "http://localhost:" + info.port + "/test"
                            ],
                            // PhantomJS options
                            "--ignore-ssl-errors": "yes"
                        }
                    }
                }
            });

            GRUNT.loadNpmTasks("grunt-mocha");

            GRUNT.registerInitTask('default', function() {
                GRUNT.task.run(["mocha"]);
            });
            return GRUNT.tasks(['default'], {
                //debug: true
            }, function(err) {
                if (err) return done(err);
                return info.server.close(function() {
                    return done(null);
                });
            });
        });
    });

});
