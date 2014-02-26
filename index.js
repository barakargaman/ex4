/**
 * Main server file.
 */

var util = require('util');
var miniExpress = require('./miniExpress');
var app = miniExpress();

var PORT = 3005;

app.use(miniExpress.cookieParser());
app.use(miniExpress.bodyParser());

app.use(function(req, res, next) { console.log('middleware:', req.url); next(); });

app.use('/static', miniExpress.static(__dirname + '/www'));

app.get('/', function(req, res) { res.send('Welcome to MiniExpress.'); });

app.post('/post-sent', function(req, res) {
    res.send('Hello ' + req.body.first + ' ' + req.body.last);
});
app.get('/post-sent', function(req, res) {
   res.status(301).set('Location', '/static/post.html').send();
});

var s = app.listen(PORT).on('close', function () {
    console.log('closed', this);
});

//setTimeout(function () {
//    s.close();
//}, 10000);