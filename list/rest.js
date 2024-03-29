console.log('Hello');
var items = require('./items.js');
var express = require('../miniExpress');
var app = express();
var port = process.env.PORT || 3000;



app.use(express.bodyParser());
app.use('/static', express.static(__dirname + '/static'));

app.get('/items', function(req, res){
	console.log('GET');
	res.json(items.get());
});

app.put('/items/:itemId',function(req, res){
	console.log('PUT', req.body);
	res.json(items.add(req.params.itemId,req.body));
});

app.delete('/items/:itemId',function(req, res){
	console.log("DELETE : " + req.params.itemId);
	res.json(items.remove(req.params.itemId));
});

app.listen(port);
