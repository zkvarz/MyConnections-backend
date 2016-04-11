var express = require('express');
var router = express.Router();
var jwt = require('jwt-simple');
var mongo = require('../mongo.js');
var User = require('../models/user.js');
var gcm = require("../gcm.js");

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
        mongo.chatRooms.find().toArray(function(err, docs) {
            if (!err)
                console.log("retrieved records:");
            console.log(docs);
            res.end(JSON.stringify(docs));
        });
    };

});


/* GET Chat PRIVATE Room messages. */
router.post('/getChatPrivateRoom', function(req, res, next) {
    if (!isHeaderValid(req, res)) return res.sendStatus(400);

    var decodedToken = getDecodedToken(req, res);
    var chatUserId = req.body.id;

    getPrivateChatRoom();

    function getPrivateChatRoom() {
        var cursor = mongo.chatRoomsPrivate.find({
            $and: [{
                'users.by': chatUserId
            }, {
                'users.by': decodedToken.id
            }]

        });
        cursor.each(function(err, doc) {
            if (err) console.log(err);
            if (doc != null) {
                console.log("private chat room found!")

                console.dir(doc);
                var sendMessage = {
                    chatRoomId: doc._id,
                };
                console.log("sendMessage: " + sendMessage)

                // return res.end(JSON.stringify(doc));
                return res.end(JSON.stringify(sendMessage));
            }
            else {
                console.log("private chat room NOT found!")
                createPrivateChatRoom();
            }
        });
    }

    function createPrivateChatRoom() {
        var array = [{
            userId: req.body.userId
        }, {
            userId: decodedToken.id
        }];
        var insertObject = {
            users: array
        };

        mongo.chatRoomsPrivate.insert(insertObject,
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
                    var sendMessage = {
                        chatRoomId: insertObject._id,
                    };
                    console.log("Inserted a document into the collection.");
                    console.log("response object: " + JSON.stringify(sendMessage));

                    // gcm.sendMessage(sendMessage);
                    return res.end(JSON.stringify(sendMessage));
                }
            });

    }


});

/* GET Chat Room messages. */
router.post('/getChatRoomMessages', function(req, res, next) {
    if (!isHeaderValid(req, res)) return res.sendStatus(400);

    var chatRoomId;

    var decodedToken = getDecodedToken(req, res);
    if (decodedToken) {
        /* if (req.body.userId) {
             getPrivateChatRoom();
         }
         else */
        if (req.body.chatRoomId) {
            console.log("chatRoomId " + req.body.chatRoomId);
            chatRoomId = req.body.chatRoomId;
            findChatRoomMessages();
        }

    }
    else {
        console.log("TOKEN NOT FOUND")
        next();
    }

    function findChatRoomMessages() {
        console.log("findChatRoomMessages")

        var messagesArray = [];
        var itemsProcessed = 0;

        mongo.messages.find({
            chat_room_id: chatRoomId
        }).toArray(function(err, docs) {
            if (!err)
                console.log("retrieved records:");
            console.log(docs);
            messagesArray = docs;
            iterateMessagesArray();
        });

        var iterateMessagesArray = function() {

            var arrayLength = messagesArray.length;
            for (var i = 0; i < arrayLength; i++) {
                console.log("user_id " + messagesArray[i].user_id);
                console.log("messagesArray[i] " + messagesArray[i]);
                modifyMessage(i);
            }
        }

        var modifyMessage = function(i) {
            User.findById(messagesArray[i].user_id, function(err, user) {
                if (err) {
                    console.log("findById error")
                }
                else {
                    messagesArray[i].loginResponse = user;
                    console.log("processItem modified: " + JSON.stringify(messagesArray[i]))
                    itemsProcessed++;
                    if (itemsProcessed === messagesArray.length) {
                        makeResponse();
                    }
                }
            });
        }

        var makeResponse = function() {
            console.log("RESPONSE messagse")
            res.end(JSON.stringify(messagesArray));
        }
    };

});

/* Send Message. */
router.post('/sendMessage', function(req, res, next) {
    if (!isHeaderValid(req, res)) return res.sendStatus(400);

    var decodedToken = getDecodedToken(req, res);
    if (decodedToken) {
        saveMessage();
    }
    else {
        console.log("TOKEN NOT FOUND")
        next();
    }

    var userObject;

    function saveMessage() {

        User.findById(decodedToken.id, function(err, user) {
            if (err) {
                console.log("findById error")
            }
            else {
                userObject = user;
            }
        });

        var currentTimeStamp = new Date().getTime();
        var insertObject = {
            chat_room_id: req.body.chatRoomId,
            user_id: decodedToken.id,
            message: req.body.message,
            timestamp: currentTimeStamp,
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
                    var sendMessage = {
                        id: insertObject._id,
                        message: req.body.message,
                        chat_room_id: req.body.chatRoomId,
                        timestamp: currentTimeStamp,
                        loginResponse: userObject
                    };
                    console.log("Inserted a document into the collection.");
                    console.log("response object: " + JSON.stringify(sendMessage));
                    gcm.sendMessage(sendMessage);
                    return res.end(JSON.stringify(sendMessage));
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