
const PATH = require("path");
const EXPRESS = require("express");
const HBS = require("hbs");
const GLOB = require("glob");
const FS = require("fs-extra");


function main(callback) {

    var app = EXPRESS();

    var hbs = HBS.create();
    
    app.set("view engine", "hbs");

    app.engine("html", hbs.__express);
    app.engine("hbs", hbs.__express);
    app.set("views", PATH.join(__dirname, "www"));
    app.get(/^\/($|test$|test\/.*$)/, function(req, res, next) {
        var page = req.params[0] || "index";
        return getTemplateData(page, function(err, data) {
            if (err) return next(err);
            try {
                res.render(page.split("/")[0], data);
            } catch(err) {
                return next();
            }
        });
    });

    mountStaticDir(app, /^\/ui\/(.*)$/, PATH.join(__dirname, "ui"));
    mountStaticDir(app, /^\/tests\/(.*)$/, PATH.join(__dirname, "tests"));
    mountStaticDir(app, /^\/mocks\/(.*)$/, PATH.join(__dirname, "mocks"));
    mountStaticDir(app, /^\/lib\/opjs\/(.*)$/, PATH.join(__dirname, "../lib"));
    mountStaticDir(app, /^\/lib\/cifre\/(.*)$/, PATH.join(__dirname, "node_modules/cifre"));
    mountStaticDir(app, /^\/lib\/q\/(.*)$/, PATH.join(__dirname, "node_modules/q"));

    app.use(EXPRESS.static(PATH.join(__dirname, "www")));

    app.listen(8080);
    console.log("open http://localhost:8080/");
}


function mountStaticDir(app, route, path) {
    app.get(route, function(req, res, next) {
        var originalUrl = req.url;
        req.url = req.params[0];
        EXPRESS.static(path)(req, res, function() {
            req.url = originalUrl;
            return next.apply(null, arguments);
        });
    });
};


var tests = null;
function getTemplateData(page, callback) {
    if (page === "index") {
        if (tests) return callback(null, tests);        
        return getTests(function(err, files) {
            if (err) return callback(err);
            tests = {
                tests: {}
            };
            files.forEach(function(filepath) {
                var parts = filepath.split("/");
                if (!tests.tests[parts[0]]) {
                    tests.tests[parts[0]] = {
                        label: parts[0],
                        tests: []
                    };
                }
                var name = parts[1].replace(/\.js$/, "");
                tests.tests[parts[0]].tests.push({
                    url: "/test/" + parts[0] + "/" + name,
                    label: name.replace(/^(\d*)-/, "$1 - ")
                });
            });
            return callback(null, tests);
        });
    } else
    if (page === "test") {
        return getTests(function(err, files) {
            if (err) return callback(err);
            var tests = [];
            files.forEach(function(filepath, index) {
                tests.push({
                    id: "tests/" + filepath.replace(/\.js$/, ""),
                    more: (index < (files.length-1)) ? true : false
                });
            });
            return callback(null, {
                tests: tests
            });
        });
    } else {
        var m = page.match(/^test\/(.*)$/)
        if (!m) return callback(null, {});
        return callback(null, {
            tests: [
                {
                    id: "tests/" + m[1],
                    more: false
                }
            ]
        });
    }
}

function getTests(callback) {
    return GLOB("**/*.js", {
        cwd: PATH.join(__dirname, "tests")
    }, function (err, files) {
        if (err) return callback(err);
        if (!files || files.length === 0) return callback(new Error("No tests found! This should not happen."));
        return callback(null, files);
    });
}


if (require.main === module) {
    main(function(err) {
        if (err) {
            console.error(err.stack);
            process.exit(1);
        }
        process.exit(0);
    });
}
