var express = require('express');
var router = express.Router();
var constants = require("../constants");
var assert = require('assert');

// var users = "users";
// var phone = "phone";
// var password = "password";

/* POST account. */
router.post('/create', function(req, res, next) {

    if (!isHeaderValid(req, res)) return res.sendStatus(400);

    var phoneString = req.body.phone;
    var passwordString = req.body.password;

    // check phone & password
    if (phoneString && passwordString) {

        global.mongoclient.connect(global.databaseUrl, function(err, db) {
            assert.equal(null, err);
            
            createIndex(db, function(collection) {
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
                            db.close();
                            res.writeHead(400, {
                                'Content-Type': 'text/plain'
                            });
                            //  res.end('ok');
                            return res.end("Sorry, user already exists.");
                        }
                        else {
                            db.close();
                            console.log("Inserted a document into the users collection.");
                            return res.sendStatus(200);
                        }
                    });
                });
            });
        });

        var createIndex = function(db, callback) {
            // Get the documents collection
            var collection = db.collection(constants.USERS);

            collection.createIndex({
                    "phone": 1
                }, {
                    unique: true
                },
                // null,
                function(err, results) {
                    if (err) console.log(err)
                        // assert.equal(err, null);
                    console.log("user createIndex")
                    console.log(results);

                    callback(collection);

                }
            );
        }


    }
    else {
        return res.sendStatus(400);
    }

});

/* GET users. */
router.get('/getUsers', function(req, res, next) {
    // if (!isHeaderValid(req, res)) return res.sendStatus(400);

    var findUsers = function(db, callback) {
        var jsonString = "";

        var cursor = db.collection(constants.USERS).find();
        cursor.each(function(err, doc) {
            assert.equal(err, null);
            if (doc != null) {
                console.dir(doc);

                jsonString += JSON.stringify(doc);
                console.log(jsonString);
            }
            else {
                console.log("No Users Found");
                res.end(jsonString);
                callback();
            }
        });

    };

    global.mongoclient.connect(global.databaseUrl, function(err, db) {
        assert.equal(null, err);
        findUsers(db, function() {
            db.close();
        });
    });

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