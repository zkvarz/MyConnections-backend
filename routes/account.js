var express = require('express');
var router = express.Router();
var constants = require("../constants");
var assert = require('assert');

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
                res.end(jsonString);
                callback();
            }
        });

    };

    console.log("account: global.db exists? " + global.db);

    findUsers(global.db, function() {
        console.log("findUsers finish");
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