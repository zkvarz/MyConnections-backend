// reference the http module so we can create a webserver
var http = require("http");
var url = require('url');

function startServer(route, handle) {
    // create a server
    function onRequest (req, response) {
        // on every request, we'll output 'Hello world'
        //response.end("Hello world from Cloud9! Welcome to this page!");

        var pathname = url.parse(req.url).pathname;
        console.log("Pathname is : " + pathname);
        
        route(handle, pathname, response);
   
    }
    
    http.createServer(onRequest).listen(process.env.PORT, process.env.IP);
    console.log("Console text: Hello World!");
    // Note: when spawning a server on Cloud9 IDE, 
    // listen on the process.env.PORT and process.env.IP environment variables

    // Click the 'Run' button at the top to start your server,
    // then click the URL that is emitted to the Output tab of the console
}
exports.start = startServer;