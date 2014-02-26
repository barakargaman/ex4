/**
 * Mini HTTP library
 */

var EventEmitter = require('events').EventEmitter,
    net = require('net'),
    url = require('url');

var VERBOSE = true;

var REQUEST_LINE_RE = /([^\s]+)\s+([^\s]+)\s+HTTP\/([^\s]+)\s*/
    , HEADER_RE     = /([^\s]+):\s*(.+)$/
    , CR            = '\r'
    , LF            = '\n'
    , CRLF          = CR+LF;


module.exports.STATUS_CODES = STATUS_CODES;

var STATUS_CODES = {
    200: 'OK',
    301: 'Moved Permanently',
    400: 'Bad Request',
    403: 'Method Not Allowed',
    404: 'Not Found',
    405: 'Unsupported Method',
    500: 'Internal Server Error',
    502: 'Bad Gateway'
};


module.exports.createServer = createServer;

function createServer(requestHandler) {
    if (!(this instanceof createServer)) {
        createServer.prototype = new net.Server(); // comes with event emitter
        return new createServer(requestHandler);
    }

    var that = this;
    this.on('connection', function (socket) {
        connectionHandler.call(that, socket);
    });
    this.on('request', requestHandler);
}

function connectionHandler(socket) {
    var server = this
        , req
        , res;
    socket._busy = false;

    function socketOnData(data) {
        if (!socket._busy) {
            // create new request
            HttpRequest.prototype = new EventEmitter();
            req = new HttpRequest(socket);
            req.on('ready', function () {
                server.emit('request', req, res);
            });
            HttpResponse.prototype = new EventEmitter();
            res = new HttpResponse(req);
            socket._busy = true;
        }
        try {
            req.parse(data);
        }
        catch (e) {
            res.error(400);
        }
    }

    socket.setTimeout(2000, function () {
        if (VERBOSE) console.log('-- timeout');
        socket.end();
    });

    socket.setEncoding('utf8');

    socket.on('data', socketOnData);

    socket.on('error', function (e) {
        if (VERBOSE) console.log('-- socket error', e);
    });
}


module.exports.HttpRequest = HttpRequest;

function HttpRequest(socket) {
    var that = this;

    this.has = {
        'request line': false,
        'double breakline': false
    };
    this.rawData = this.rawBody = '';
    this.headers = {};
    this.cookies = {};
    this.body = {};
    this.contentLength = 0;
    this.socket = socket;

    this.parse = function(data) {
        that.rawData += data;
        var line, lfIndex;

        while (!that.has['double breakline'] && data.length) {
            // take one line out of data
            lfIndex = data.indexOf(LF);
            line = data.substring(0, lfIndex).replace(RegExp(CR+'$'), '');
            data = data.substring(lfIndex+1);
            // parse it
            parseLine(line);
        }

        if (that.has['double breakline']) {
            // add data to current request body
            that.emit('data', data);
            that.contentLength += data.length;
            if (that.contentLength == that.get('Content-Length')
                || !that.get('Content-Length')) { // if got all data or content length not sent
                that.emit('end');
            }
        }
    };

    function parseLine(line) {
        var lineParams;

        if (!that.has['request line']) {
            // parse as request line
            lineParams = REQUEST_LINE_RE.exec(line);
            if (lineParams == null) {
                throw { code: 400 } // bad request
            }

            that.method = lineParams[1];
            that.url = lineParams[2];
            that.version = lineParams[3];
            that.has['request line'] = true;
            var url_parse = url.parse(that.url);
            that.path = url_parse.pathname;
            that.host = url_parse.host;
            that.protocol = url_parse.protocol;
            var query = {};
            if (url_parse.query) {
                url_parse.query.split('&').forEach(function (item) {
                    parts = item.split('=');
                    query[parts[0]] = parts[1];
                });
            }
            that.query = query;
        }
        else {
            // parse as header / empty line
            lineParams = HEADER_RE.exec(line);
            if (lineParams !== null) {
                that.headers[lineParams[1]] = lineParams[2].toLowerCase();
            }
            else if (line.length == 0) {
                // empty line - pass to user
                that.has['double breakline'] = true;
                that.emit('ready');
            }
            else {
                throw { code: 400 } // bad request
            }
        }
    }

    this.get = function(key) {
        var camelKey = key
            .toLowerCase()
            .replace(/((\-|^)[a-z])/g, function ($1) {
                return $1.toUpperCase();
            });
        return that.headers[camelKey];
    }

    this.param = function(key) {
        return that.params[key] || that.body[key] || that.query[key];
    }

    this.is = function(type) {
        var ct = that.get('Content-Type'),
            parts = ct.split('/');

        return (type == parts[0]+'/*' || type == parts[1] || type == ct);
    }
}


module.exports.HttpResponse = HttpResponse;

function HttpResponse(req) {
    var that = this;

    this.statusCode = 200; // default value = OK
    this.version = '1.1'; // default
    this.headers = {};
    this.cookies = {};
    this._headWritten = false;
    this._ended = false;
    this.body = '';


    function generateHead() {
        // update headers values
        that.set({'Date': Date(), 'Content-Length': that.body.length});

        // build status line
        var data = 'HTTP/'+that.version+' '+that.statusCode
            +' '+STATUS_CODES[that.statusCode]+CRLF;

        // build headers
        for (var header in that.headers) {
            data += header+": "+that.get(header)+CRLF;
        }

        // add breakline
        data += CRLF;

        return data;
    }

    function write(data, forceEnd) {
        that.body += data;
        if (!that._headWritten) {
            data = generateHead() + data;
            that._headWritten = true;
        }
        req.socket.write(data, that.encoding, function() {
            if (forceEnd) {
                that._ended = true;
                req.socket._busy = false;
            }
            if ( (that.version == '1.0' && that.get('Connection') !== 'keep-alive') ||
                (that.version == '1.1' && that.get('Connection') == 'close') ) {
                req.socket.end();
            }
        });
    }

    function end(data) {
        write(data, true);
    }

    this.set = function(key, value) {
        if (typeof key == 'object') { // got multiple values
            for (var item in key) {
                that.set(item, key[item]);
            }
        }
        else {
            that.headers[key] = value;
        }
        return that; // enable chaining calls
    };

    this.get = function(key) {
        var camelKey = key
            .toLowerCase()
            .replace(/((\-|^)[a-z])/g, function ($1) {
                return $1.toUpperCase();
            });
        return that.headers[camelKey];
    };

    this.send = function(status, body) {
        if (typeof body == 'undefined') {
            body = status;
            delete status;
        }

        var contentType = that.get('Content-Type');

        switch (typeof body) {
            case 'string': // textual response
                if (!contentType) that.set('Content-Type', 'text/html');
                break;
            case 'number': // status code
                if (!contentType) that.set('Content-Type', 'text/plain');
                that.status(body);
                body = STATUS_CODES[body];
                break;
            case 'object':
                if (body == null) { // null is object
                    body = '';
                } else if (Buffer.isBuffer(body)) {
                    if (!contentType) that.set('Content-Type', 'application/octet-stream');
                } else {
                    return that.json(body); // pass to json method and return for chaining
                }
                break;
        }

        end(body); // send body
        return that; // enable chaining calls
    };

    this.json = function(status, obj) {
        if (typeof obj == 'undefined') {
            obj = status;
            delete status;
        }

        if (typeof STATUS_CODES[status] != 'undefined') that.status(status);

        that.set('Content-Type', 'application/json; charset=utf-8');
        var body = JSON.stringify(obj, null, '\t');

        end(body); // send body
        return that; // enable chaining calls
    };

    this.cookie = function(name, val, options) {
        if (typeof options == 'undefined') options = {};

        if (typeof val == 'object') val = 'j:'+JSON.stringify(val);
        if (typeof val == 'number') val = ''+val;

        if ('maxAge' in options) {
            options.expires = new Date(Date.now()+options.maxAge);
            delete options.maxAge;
        }

        var cookieString = name + '=' + val;
        for (var key in options) {
            cookieString += '; ' + key + '=' + options[key];
        }
        that.set('Set-Cookie', cookieString);
        return that; // enable chaining calls
    };

    this.status = function(code) {
        that.statusCode = code;
        return that; // enable chaining calls
    };

    this.error = function(code, message) {
        if (typeof message == 'undefined') message = '';

        if (VERBOSE) console.log('-- error', code, message);
        that.statusCode = code || 500; // default internal server error
        that.set('Content-Type', 'text/plain');
        end(''+code+' '+STATUS_CODES[code]+CRLF+message);
    };
}
