var express = require('express');
var router = express.Router();
var jwt = require('jwt-simple');
var mongo = require('../mongo.js');

/* GET chatRooms. */
router.post('/getChatRooms', function(req, res, next) {
    if (!isHeaderValid(req, res)) return res.sendStatus(400);

    var decodedToken = getDecodedToken(req, res);
    if (decodedToken) {
        findChatRooms();
    }
    else {
        console.log("TOKEN NOT FOUND")
        next();
    }

    function findChatRooms() {
        // var cursor = global.db.collection("chatRooms").find();
        mongo.chatRooms.find().toArray(function(err, docs) {
            if (!err)
                console.log("retrieved records:");
            console.log(docs);
            res.end(JSON.stringify(docs));
        });
    };

});

/* Send Message. */
router.post('/sendMessage', function(req, res, next) {
    if (!isHeaderValid(req, res)) return res.sendStatus(400);

    var decodedToken = getDecodedToken(req, res);
    if (decodedToken) {
        //req.body.message
        saveMessage();
    }
    else {
        console.log("TOKEN NOT FOUND")
        next();
    }

    function saveMessage() {
        // var cursor = global.db.collection("messages").find();
        var insertObject = {
                chat_room_id: req.body.chatRoomId,
                user_id: decodedToken.id,
                message: req.body.message,
                timestamp: new Date().getTime()
            };
        
        mongo.messages.insert(insertObject,
            function(err, records) {
                if (err) {
                    console.log("Duplicate key!");
                    console.log(err)
                    res.writeHead(400, {
                        'Content-Type': 'text/plain'
                    });
                    return res.end("Sorry, message send error.");
                }
                else {
                    console.log("Inserted a document into the collection.");
                    console.log("insertObject  " + insertObject);
                    console.log("insertObject id " + insertObject._id);
                    console.log("insertObject createdAt " + insertObject.createdAt);
                    console.log("records  " + records);
                    console.log("records id  " + records._id);
                    console.log("_ID is: " + records._id);
                    return res.end(JSON.stringify({
                        id: insertObject._id,
                        message: req.body.message,
                        createdAt: insertObject.timestamp
                    }));
                }
            });
    };

});

function getDecodedToken(req, res) {
    var token = (req.body && req.body.token) || (req.query && req.query.token) || req.headers['x-access-token'];

    console.log("global.app.get('jwtTokenSecret') " + global.app.get('jwtTokenSecret'));

    if (token) {
        try {
            console.log("Decoding token...");
            var decoded = jwt.decode(token, global.app.get('jwtTokenSecret'));

            // handle token here
            console.log("Date.now(): " + new Date().getTime() / 1000);

            if (decoded.exp <= new Date().getTime() / 1000) {
                res.end('Access token has expired', 400);
            }
            else {
                console.log("user id: " + decoded.id);
                return decoded;
            }
        }
        catch (err) {
            console.log("Eror! " + err);
            res.statusCode = 401;
            res.end('Authorization error!');
            return null;
        }
    }
    else {
        console.log("TOKEN NOT FOUND");
        return null;
    }
}

function isHeaderValid(req, res) {
    var contype = req.headers['content-type'];
    var isValid = true;
    // check content-type
    if (!contype || contype.indexOf('application/json') !== 0)
        isValid = false;
    return isValid;
}

module.exports = router;