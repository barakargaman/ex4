what was hard?
understanding where to put every part of the server (HttpRequest, HttpResponse, middlewares, etc.)

what was fun?
all of it.

if you were a hacker and you could add a dynamic function that answers the URL /hello/hacker, write 2 different ‘bad’ dynamic functions that will cause DOS.
(1)
function(req, res) { process.exit(1); }

(2)
function(req, res) { while(true) {} }


how would you make sure that those functions will get executed? 
i would put these hadlers on top of the routes list and/or remove any other handlers of routes starting with '/hello/hacker' (of course that will be seen to the server developers, so it's not as good solution as the first one).
