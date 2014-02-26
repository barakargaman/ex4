/**
 * MiniExpress Tester Script
 */

var http = require('http'),
    miniExpress = require('./miniExpress');

var PORT = 3005;

http.globalAgent.maxSockets = 1000;

var defaultOptions = {
    method: 'GET',
    version: '1.1',
    path: '/',
    port: PORT
};

// merges objects
function merge(obj1, obj2) {
    var obj = {};
    for (var opt in obj2) obj[opt] = obj2[opt];
    for (var opt in obj1) obj[opt] = obj1[opt];
    return obj;
}

// error printer
function error(req, res, message, err) {
    console.log('+ err:', message, err, res);
    process.exit(1);
}

// run test miniHttp server (optional)
function runServer(port) {
    var app = miniExpress();

    app.use(miniExpress.cookieParser());
    app.use(miniExpress.bodyParser());

    app.use('/static', miniExpress.static(__dirname + '/www'));

    app.get('/test', function(req, res) { res.json(req.query); });
    app.post('/test', function(req, res) { res.json(req.body); });
    app.put('/test/:id', function(req, res) { res.json(req.params); });
    app.delete('/test', function(req, res) { res.send("deleted"); });

    app.get('/', function(req, res) { res.send('Welcome to MiniExpress.'); });

    app.listen(port).on('close', function () {
        console.log('closed', this);
    });
}

// tests list
var TESTS = {
    getRoot: function(name) {
        try {
            var res;
            var req = http.request(defaultOptions, function(response) {
                res = response;
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    if (chunk != 'Welcome to MiniExpress.') {
                        error(req, res, name);
                    }
                    else {
                        console.log('+ done', name);
                    }
                });
            });

            req.on('error', function(e) {
                error(req, res, name, e);
            });

            // write data to request body
            req.end('');
        } catch (err) {
            error(req, null, 'unexpected error in '+name, err);
        }
    },

    simpleGetQueryData: function(name) {
        var options = merge({
            path: '/test?id=30'
        }, defaultOptions);
        try {
            var res;
            var req = http.request(options, function(response) {
                res = response;
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    if (chunk != JSON.stringify({id:"30"}, null, '\t')) {
                        error(null, null, name);
                    }
                    else {
                        console.log('+ done', name);
                    }
                });
            });

            req.on('error', function(e) {
                error(null, null, name, e);
            });

            // write data to request body
            req.end();
        } catch (err) {
            error(req, null, 'unexpected error in '+name, err);
        }
    },

    simplePostBodyData: function(name) {
        var options = merge({
            path: '/test',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': 7
            }
        }, defaultOptions);
        try {
            var res;
            var req = http.request(options, function(response) {
                res = response;
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    if (chunk != JSON.stringify({a:"1",b:"2"}, null, '\t')) {
                        error(null, null, name);
                    }
                    else {
                        console.log('+ done', name);
                    }
                });
            });

            req.on('error', function(e) {
                error(null, null, name, e);
            });

            // write data to request body
            req.end("a=1&b=2");
        } catch (err) {
            error(req, null, 'unexpected error in '+name, err);
        }
    },

    simplePutParamsData: function(name) {
        var options = merge({
            path: '/test/15',
            method: 'PUT',
            headers: {
                'Content-Length': 0
            }
        }, defaultOptions);
        try {
            var res;
            var req = http.request(options, function(response) {
                res = response;
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    if (chunk != JSON.stringify({id:"15"}, null, '\t')) {
                        error(null, null, name);
                    }
                    else {
                        console.log('+ done', name);
                    }
                });
            });

            req.on('error', function(e) {
                error(null, null, name, e);
            });

            // write data to request body
            req.end();
        } catch (err) {
            error(req, null, 'unexpected error in '+name, err);
        }
    },

    simpleDelete: function(name) {
        var options = merge({
            path: '/test',
            method: 'DELETE',
            headers: {
                'Content-Length': 0
            }

        }, defaultOptions);
        try {
            var res;
            var req = http.request(options, function(response) {
                res = response;
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    if (chunk != "deleted") {
                        error(null, null, name);
                    }
                    else {
                        console.log('+ done', name);
                    }
                });
            });

            req.on('error', function(e) {
                error(null, null, name, e);
            });

            // write data to request body
            req.end();
        } catch (err) {
            error(req, null, 'unexpected error in '+name, err);
        }
    },

    get404: function(name) {
        try {
            var options = merge({
                path: '/static/missing.html'
            }, defaultOptions);
            var res;
            var req = http.request(options, function(response) {
                res = response;
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    if (res.statusCode != 404) {
                        error(req, res, name);
                    }
                    else {
                        console.log('+ done', name);
                    }
                });
            });

            req.on('error', function(e) {
                error(req, res, name, e);
            });

            // write data to request body
            req.end('');
        } catch (err) {
            error(req, null, 'unexpected error in '+name, err);
        }
    },

    middlewareStatic: function(name) {
        try {
            var options = merge({
                path: '/static/index.html'
            }, defaultOptions);
            var res;
            var req = http.request(options, function(response) {
                res = response;
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    if (chunk != 'Welcome to miniExpress.') {
                        error(req, res, name);
                    }
                    else {
                        console.log('+ done', name);
                    }
                });
            });

            req.on('error', function(e) {
                error(req, res, name, e);
            });

            // write data to request body
            req.end('');
        } catch (err) {
            error(req, null, 'unexpected error in '+name, err);
        }
    }
};

// run server
runServer(PORT);

// run all tests
var i = 0;
var keys = Object.keys(TESTS);
function runNextTest() {
    if (i < keys.length) {
        // run test
        console.log('+ start testing:', keys[i]);
        TESTS[keys[i]](keys[i]);
        i++;
        setTimeout(runNextTest, 100);
    }
    else {
        console.log("PASSED ALL TESTS");
    }
}
runNextTest();
