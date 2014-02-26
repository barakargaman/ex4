/**
 * MiniExpress Load Script
 */

var http = require('http'),
    miniExpress = require('./miniExpress');

var PORT = 3005;

var defaultOptions = {
    method: 'GET',
    version: '1.1',
    path: '/',
    port: PORT
};

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

    app.get('/', function(req, res) { res.send('Welcome to MiniExpress.'); });

    app.listen(port).on('close', function () {
        console.log('closed', this);
    });
}

function request(name) {
    try {
        var res;
        var req = http.request(defaultOptions, function(response) {
            res = response;
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                if (chunk != 'Welcome to MiniExpress.') {
                    error(req, res, name);
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

// run server
//runServer(PORT);

// load the server
http.globalAgent.maxSockets = 3000;
for (var i=0; i<3000; i++) {
    request(i);
}
console.log('ALL SENT');