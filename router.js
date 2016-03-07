function route(handle, pathname, response) {
    if (typeof handle[pathname] == 'function') {
        console.log("Request found: " + pathname);
        handle[pathname](response);
    } else {
        console.log("Request not found: " + pathname);
        response.end("Request not found!");
    }
}

exports.route = route;