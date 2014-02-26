/**
 * Mini Express library
 */

var fs = require('fs'),
    url = require('url'),
    miniHttp = require('./miniHttp');

var VERBOSE = true;

var CONTENT_TYPES = {
    'txt': 'text/plain',
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif'
};

var DEFAULT_DIRECTORY_FILE = 'index.html';

var HANDLERS = {
        get: [],
        post: [],
        delete: [],
        put: []
    },
    MIDDLEWARE = [];


module.exports = createApplication;

function createApplication() {
    var app = router;

    app.route = HANDLERS;
    app.use = setMiddleware;
    app.listen = listen;
    ['GET', 'POST', 'DELETE', 'PUT'].forEach(function (method) {
        app[method.toLowerCase()] = function(resource, handler) {
            setHandler(method, resource, handler);
        };
    });

    return app;
}

function router(req, res) {
    // filter middlewares and handlers that match the request
    var handlers = MIDDLEWARE
        .concat(HANDLERS[req.method.toLowerCase()])
        .filter(function (item) {
            return item.regexp.test(req.path);
        });
    req.handlers = handlers;
    req.handler_i = 0;

    handlers[0].callbacks[0](req, res, function next() {
        var handler = req.handlers[++req.handler_i];
        if (typeof handler != 'undefined') {
            req.params = parsePathParams(req.path, handler.regexp, handler.keys);
            req.resource = req.path.substring(handler.path.length);
            if (handler.method == 'middleware') {
                handler.callbacks[0](req, res, next);
            }
            else {
                handler.callbacks[0](req, res);
            }
        }
        else {
            // no handlers left and no response sent
            res.error(404);
        }
    });
}

function parsePathParams(path, regexp, keys) {
    var params = {};
    regexp.exec(path).forEach(function (param, i) {
        if (i == 0) return; // first place holds the whole expression - pass
        params[keys[i-1].name] = param;
    });
    return params;
}

function listen(port) {
    return miniHttp.createServer(this).listen(port);
}

function resourceToRouteParser(resource, isPrefix) {
    if (typeof isPrefix == 'undefined') {
        isPrefix = false;
    }
    var keys = [], re = '^';
    resource.split('/').forEach(function (part) {
        if (part.indexOf(':') == 0) { // is parameter
            part = part.substr(1); // remove ':'
            keys.push({name: part, optional: false});
            re += '(?:([^\/]+?))\/';
        }
        else {
            re += part + '\/';
        }
    });
    if (isPrefix) {
        re += '?.*$'; // enable trailing characters
    }
    else {
        re += '?$';
    }

    return {re: re, keys: keys};
}

function setHandler(method, resource, handler) {
    method = method.toLowerCase();

    var route = resourceToRouteParser(resource);
    HANDLERS[method].push({
        path: resource,
        method: method,
        callbacks: [handler],
        keys: route.keys,
        regexp: new RegExp(route.re, 'i')
    });
}

function setMiddleware(resource, handler) {
    // enable default route
    if (typeof handler == 'undefined') {
        handler = resource;
        resource = '/';
    }
    var route = resourceToRouteParser(resource, true);
    MIDDLEWARE.push({
        path: resource,
        callbacks: [handler],
        keys: route.keys,
        regexp: new RegExp(route.re, 'i'),
        method: 'middleware'
    });
}


module.exports.static = staticMiddleware;

function staticMiddleware(directory) {
    return function (req, res, next) {
        var resource = req.resource.replace('../', ''), // prevent accessing files outside of root
            fileType = resource.split('.')[1];

        fs.stat(directory+resource, function (err, stat) {
            try {
                if (err) throw err;

                // if directory requested - load its default file
                if (stat.isDirectory()) {
                    var suffix = (resource.slice(-1) == '/') ? '' : '/';
                    suffix += DEFAULT_DIRECTORY_FILE;
                    resource += suffix;
                }
                // read file
                fs.readFile(directory+resource, 'binary', function (err, data) {
                    // send it
                    res.set('Content-Type', CONTENT_TYPES[fileType]);
                    res.encoding = 'binary';
                    res.send(data);
                    if (VERBOSE) console.log('--  serving', req.resource);
                });
            } catch (err) {
                // can't find file
                res.error(404, 'file not found: '+resource);
            }
        });
    };
}


module.exports.cookieParser = cookieParserMiddleware;

function cookieParserMiddleware() {
    return function (req, res, next) {
        if (Object.keys(req.cookies).length) return next(); // cookies are already set

        if (req.get('Cookie')) {
            var cookies = {};

            req.get('Cookie').split('; ').forEach(function (item) {
                parts = item.split('=');
                cookies[parts[0]] = parts[1];
            });

            req.cookies = cookies;
        }
        next();
    };
}


module.exports.json = jsonMiddleware;

function jsonMiddleware() {
    return function (req, res, next) {
        if (Object.keys(req.body).length) return next(); // body is already set
        // check Content-Type
        if (!req.get('Content-Type') ||
            'application/json' != req.get('Content-Type').split(';')[0])
            return next();

        try {
            req.body = JSON.parse(req.rawBody);
            next();
        }
        catch (e) {
            res.error(500, "Couldn't parse json");
        }
    };
}


module.exports.urlencoded = urlencodedMiddleware;

function urlencodedMiddleware() {
    return function (req, res, next) {
        if (Object.keys(req.body).length) return next(); // body is already set
        // check Content-Type
        if (!req.get('Content-Type') ||
            'application/x-www-form-urlencoded' != req.get('Content-Type').split(';')[0])
            return next();

        try {
            var body = {}, parts;
            decodeURIComponent(req.rawBody).split('&').forEach(function (param) {
                parts = param.split('=');
                body[parts[0]] = parts[1];
            });
            req.body = body;
            next();
        }
        catch (e) {
            res.error(500, "Couldn't parse form");
        }
    };
}


module.exports.bodyParser = bodyParserMiddleware;

function bodyParserMiddleware() {
    return function (req, res, next) {
        if (req.method == 'GET' || req.method == 'DELETE') return next(); // body has no meaning

        var data = '';
        req.on('data', function (chunk) {
            data += chunk;
        });
        req.on('end', function () {
            req.rawBody = data;
            urlencodedMiddleware()(req, res, function () {
                jsonMiddleware()(req, res, next);
            });
        });
    };
}
