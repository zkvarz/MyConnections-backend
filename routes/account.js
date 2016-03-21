var express = require('express');
var router = express.Router();
var constants = require("../constants");
var assert = require('assert');
var jwt = require('jwt-simple');
// var app = require("../app");

/* POST account. */
router.post('/create', function(req, res, next) {

    if (!isHeaderValid(req, res)) return res.sendStatus(400);

    var phoneString = req.body.phone;
    var passwordString = req.body.password;

    // check phone & password
    if (phoneString && passwordString) {

        // Get the documents collection
        var collection = global.db.collection(constants.USERS);
        collection.createIndex({
                "phone": 1
            }, {
                unique: true
            },
            // null,
            function(err, results) {
                if (err) console.log(err)
                assert.equal(err, null);
                console.log("user createIndex")
                console.log(results);

                insertUser(global.db, collection);
            }
        );

        var insertUser = function(db, collection) {
            console.log("user insertion " + collection)
            collection.ensureIndex({
                "phone": 1
            }, {
                unique: true
            }, function(err, indexName) {
                if (err) {
                    console.log(err)
                    return;
                }

                // Insert user document
                collection.insertOne({
                    phone: phoneString,
                    password: passwordString
                }, function(err, result) {
                    if (err) {
                        console.log("Duplicate key!");
                        console.log(err)
                        res.writeHead(400, {
                            'Content-Type': 'text/plain'
                        });
                        return res.end("Sorry, user already exists.");
                    }
                    else {
                        console.log("Inserted a document into the users collection.");
                        return res.sendStatus(200);
                    }
                });
            });
        };

    }
    else {
        return res.sendStatus(400);
    }

});

/* GET users. */
router.post('/getUsers', function(req, res, next) {
    // if (!isHeaderValid(req, res)) return res.sendStatus(400);
    
    //allow the client to attach a token in one of three ways – as a query 
    //string parameter, a form body parameter, or in an HTTP header
    console.log("req: " + req.body)
    console.log("req.body.token: " + req.body.token)
    var token = (req.body && req.body.token) || (req.query && req.query.token) || req.headers['x-access-token'];
    
    console.log("global.app.get('jwtTokenSecret') " + global.app.get('jwtTokenSecret'));
    
    if (token) {
        try {
            console.log("Decoding token...");
            var decoded = jwt.decode(token, global.app.get('jwtTokenSecret'));

            // handle token here
            console.log("handle token here");
            console.log("decoded.exp: " + decoded.exp);
            // console.log("decoded.user.id: " + decoded.user.id);
            console.log("Date.now(): " + new Date().getTime()/1000);

           if (decoded.exp <= new Date().getTime()/1000) {
                res.end('Access token has expired', 400);
            } else {
                findUsers();
                console.log("user id: " + decoded.id);
            }
        }
        catch (err) {
             console.log("Eror! " + err);
             res.statusCode = 401;
             res.end('Authorization error!');
            //  return next();
        }
    }
    else {
        console.log("TOKEN NOT FOUND")
        next();
    }
    
     console.log("account: global.db exists? " + global.db);

     function findUsers() {
         var jsonString = "";

         var cursor = global.db.collection(constants.USERS).find();
         cursor.each(function(err, doc) {
             assert.equal(err, null);
             if (doc != null) {
                 console.dir(doc);

                 jsonString += JSON.stringify(doc);
                 console.log(jsonString);
             }
             else {
                 res.end(jsonString);
                 //   callback();
             }
         });
     };
     


});

function isHeaderValid(req, res) {
    var contype = req.headers['content-type'];
    var isValid = true;
    // check content-type
    if (!contype || contype.indexOf('application/json') !== 0)
        isValid = false;
    return isValid;
}

module.exports = router;