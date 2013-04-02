
const PATH = require("path");
const EXPRESS = require("express");
const PINF = require("pinf").for(module);
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
    mountStaticDir(app, /^\/lib\/opjs\/(.*)$/, PATH.join(__dirname, "../lib"));
    mountStaticDir(app, /^\/lib\/cifre\/(.*)$/, PATH.join(__dirname, "node_modules/cifre"));
    mountStaticDir(app, /^\/lib\/q\/(.*)$/, PATH.join(__dirname, "node_modules/q"));

    app.use(EXPRESS.static(PATH.join(__dirname, "www")));

    app.listen(8080);
    console.log("open http://localhost:8080/");
}


if (require.main === module) {
	PINF.run(main);
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
                    label: name
                });
            });
            return callback(null, tests);
        });
    } else
    if (page === "test") {
        return getTests(function(err, files) {
            if (err) return callback(err);
            var tests = [];
            files.forEach(function(filepath) {
                tests.push(FS.readFileSync(PATH.join(__dirname, "tests", filepath)).toString());
            });
            return callback(null, {
                tests: tests.join("\n")
            });
        });
    } else {
        var m = page.match(/^test\/(.*)$/)
        if (!m) return callback(null, {});
        return callback(null, {
            tests: FS.readFileSync(PATH.join(__dirname, "tests", m[1] + ".js")).toString()
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

