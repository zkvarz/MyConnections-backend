var express = require('express');
var router = express.Router();
var constants = require("../constants");
var assert = require('assert');
var jwt = require('jwt-simple');

var mongo = require('mongodb');

var passport = require('passport');

var configAuth = require('../auth');

var User = require('../models/user.js');

var twitterAPI = require('node-twitter-api');
var twitter = new twitterAPI({
    consumerKey: configAuth.twitterAuth.consumerKey,
    consumerSecret: configAuth.twitterAuth.consumerSecret,
    callback: configAuth.twitterAuth.consumerSecret
});


/* CREATE account. */
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
                unique: true,
                sparse: true
            },
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

/* USER LOGIN  */
router.post('/login', function(req, res, next) {
    console.log("/login post triggered");

    passport.authenticate('user-login', {
            failureRedirect: '/login',
            session: false
        },
        function(err, user, info) {
            if (err) {
                return next(err);
            }
            if (!user) {
                return res.status(401).json({
                    error: 'Incorrect credentials!'
                });
            }
            // current time + 15days, 1296000 seconds
            var tokenTimeExpired = Math.round(new Date().getTime() / 1000) + 1296000;

            var token = jwt.encode({
                id: user._id,
                exp: tokenTimeExpired
            }, global.app.get('jwtTokenSecret'));

            res.json({
                token: token,
                expires: tokenTimeExpired,
                phone: user.phone,
                id: user._id
            });
        })(req, res, next);
});


/* FACEBOOK LOGIN  */
router.post("/facebookLogin", function(req, res, next) {
    if (!isHeaderValid(req, res)) return res.sendStatus(400);

    var facebookId = req.body.id;
    var facebookToken = req.body.facebookToken;

    if (facebookId && facebookToken) {
        // Get the documents collection
        var users = global.db.collection(constants.USERS);
        users.createIndex({
                "phone": 1,
                "facebookId": 1
            }, {
                unique: true,
                sparse: true
            },
            function(err, results) {
                if (err) console.log(err)
                assert.equal(err, null);
                console.log("user createIndex")
                console.log(results);

                findFacebookUser(global.db, users);
            }
        );

        var findFacebookUser = function(db, users) {
            users.findOne({
                facebookId: facebookId
            }, function(err, document) {
                if (err)
                    console.log(err)
                else {
                    if (!document)
                        insertUser(global.db, users);
                    else {
                        console.log("document found! " + document.facebookId);
                        console.log({
                            "facebookId": facebookId,
                            phone: document.phone,
                            social: "facebook",
                            facebookToken: facebookToken
                        });
                        console.log("DOCUMENT OBJECT" + document);
                        facebookAuthorization(document);
                    }
                }
            });
        }

        var insertUser = function(db, users) {
            console.log("user insertion " + users)

            // Insert user document
            users.insertOne({
                social: "facebook",
                facebookId: facebookId,
                facebookToken: facebookToken
            }, function(err, result) {
                if (err) {
                    console.log("Sorry, facebook login error!");
                    console.log(err)
                    res.writeHead(400, {
                        'Content-Type': 'text/plain'
                    });
                    return res.end(JSON.stringify({
                        error: "Sorry, facebook login error."
                    }));
                }
                else {
                    console.log("Inserted a document into the users collection.");
                    console.log({
                        "facebookId": facebookId,
                        social: "facebook",
                        facebookToken: facebookToken
                    });
                    findFacebookUser(global.db, users);
                }
            });
        };

        var facebookAuthorization = function(user) {
            console.log("facebookAuthorization function");

            return res.end(JSON.stringify({
                phone: user.phone,
                id: user._id,
                "facebookId": facebookId,
                social: "facebook",
                token: getToken(user),
                expires: getTokenTimeExpired(),
                facebookToken: facebookToken
            }));
        }
    }
    else {
        return res.sendStatus(400);
    }
})


// We need this to build our post string
var querystring = require('querystring');
var http = require('http');

/* GOOGLE LOGIN */
router.post('/googleLogin', function(req, res, next) {
    console.log("googleLogin");
    if (!isHeaderValid(req, res)) return res.sendStatus(400);

    var googleId;

    var idToken = req.body.token;
    if (idToken) {
        verifyGoogleTokenId(idToken);
    }
    else {
        res.sendStatus(400);
    }

    function verifyGoogleTokenId(tokenId) {
        console.log("verifyGoogleTokenId");
        // var tokenId = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjA3YjlhZDg5ZWFhMTQxNWM1NzA3Y2ZkNWViMDU4ZGJmOWIwOTY4NTkifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhdWQiOiIzNTY1Njk2NzUyNTEtdmNxMWptZnFzaWNjdmlkdHNhcDduZmNrdmFtYTYyMjguYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMDIxMTQ5MDk2OTQ2NzIwNDk5OTQiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiYXpwIjoiMzU2NTY5Njc1MjUxLW8yZHNuam43bTA3OGcwMWwxNjg5YTkxYzFxa29zdWJxLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwiZW1haWwiOiJ6a3ZhcnpAZ21haWwuY29tIiwiaWF0IjoxNDU5MzYzNDk5LCJleHAiOjE0NTkzNjcwOTksIm5hbWUiOiJLaXJpbGwgVmFyaXZvZGEiLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDQuZ29vZ2xldXNlcmNvbnRlbnQuY29tLy1KYVNqSjBWa0lrNC9BQUFBQUFBQUFBSS9BQUFBQUFBQUFFby9FRXUzdWJrd0Y1Yy9zOTYtYy9waG90by5qcGciLCJnaXZlbl9uYW1lIjoiS2lyaWxsIiwiZmFtaWx5X25hbWUiOiJWYXJpdm9kYSIsImxvY2FsZSI6InJ1In0.M4C6EuEseb3XTWdPrQ2_GuogaiJm6Q1xKJYhL6oRS0QWzpdpZB13NJ1_2lvAadwEJtS0WpgEZ4AVXf31pyZl494iYj6ujcsGVo-K6hxyeljsegIeQ9m9a6njpQreA_NYWtY-xMKLEVlaiDKW5CU0ezDE1KSwqd7fyyvBOlb4UI8sa1QE7SKCp-G3nmL8dFJAmdWSyjWAjAPtavfud3K6li2SKMnCmOrJJLVQOoBW3tM3y2agK5H53oyQOAujmP3BBaMIEt4943gSw3MMQIcqnZFO7SocwvKrbY05lQu86doNiIf1WdvSfjFhayaBtTHjzqw6uMq8uLmtPkoACXJBqg';
        var http = require('https');

        http.get('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=' + tokenId, function(response) {
            var str = '';
            console.log('Response is ' + response.statusCode);

            response.on('data', function(chunk) {
                str += chunk;
            });

            response.on('end', function() {
                console.log(str);
                var obj = JSON.parse(str);
                console.log(obj.sub);
                googleId = obj.sub;
                if (obj.aud === configAuth.googleAuth.clientID) {
                    console.log("Google Token Valid!");
                    createIndex();
                }
                else {
                    res.sendStatus(400);
                }
            });
        })
    }

    var createIndex = function() {
        var users = global.db.collection(constants.USERS);
        users.createIndex({
                "phone": 1,
                "googleId": 1
            }, {
                unique: true,
                sparse: true
            },
            function(err, results) {
                if (err) console.log(err)
                assert.equal(err, null);
                console.log("user createIndex")
                console.log(results);

                findGoogleUser(global.db, users);
            }
        );
    }

    var findGoogleUser = function(db, users) {
        users.findOne({
            googleId: googleId
        }, function(err, document) {
            if (err)
                console.log(err)
            else {
                if (!document)
                    insertUser(global.db, users);
                else {
                    console.log("document found! " + document.googleId);
                    console.log({
                        "googleId": googleId,
                        phone: document.phone,
                        social: "google",
                    });
                    console.log("DOCUMENT OBJECT" + document);
                    authorizationResponse(document);
                }
            }
        });
    }

    var insertUser = function(db, users) {
        console.log("user insertion " + users)

        // Insert user document
        users.insertOne({
            social: "google",
            googleId: googleId,
        }, function(err, result) {
            if (err) {
                console.log("Sorry, facebook login error!");
                console.log(err)
                res.writeHead(400, {
                    'Content-Type': 'text/plain'
                });
                return res.end(JSON.stringify({
                    error: "Sorry, facebook login error."
                }));
            }
            else {
                console.log("Inserted a document into the users collection.");
                console.log({
                    "googleId": googleId,
                    social: "google",
                });
                findGoogleUser(global.db, users);
            }
        });
    };

    var authorizationResponse = function(user) {
        console.log("facebookAuthorization function");

        return res.end(JSON.stringify({
            phone: user.phone,
            id: user._id,
            "googleId": googleId,
            social: "google",
            token: getToken(user),
            expires: getTokenTimeExpired(),
        }));
    }

});

/* TWITTER LOGIN */
router.post('/twitterLogin', function(req, res, next) {
    console.log("Twitter login");

    var token = req.body.token;
    var secret = req.body.secret;
    var twitterId;

    if (!isHeaderValid(req, res)) return res.sendStatus(400);

    if (!token || !secret) {
        console.log("token not found");
        return res.sendStatus(400);
    }

    console.log("req.body.token " + req.body.token);

    twitter.verifyCredentials(token, secret, "", function(error, data, response) {
        if (error) {
            //something was wrong with either accessToken or accessTokenSecret 
            console.log("twitter token error! " + data);
            res.send(401);
        }
        else {
            //accessToken and accessTokenSecret can now be used to make api-calls (not yet implemented) 
            //data contains the user-data described in the official Twitter-API-docs 
            //you could e.g. display his screen_name 
            console.log("twitter token valid!");
            console.log(data["screen_name"]);
            console.log("twitterId: " + data["id"]);
            twitterId = data["id"].toString();
            createIndex();
        }
    });

    var createIndex = function() {
        var users = global.db.collection(constants.USERS);
        users.createIndex({
                "phone": 1,
                "twitterId": 1
            }, {
                unique: true,
                sparse: true
            },
            function(err, results) {
                if (err) console.log(err)
                assert.equal(err, null);
                console.log("user createIndex")
                console.log(results);

                findUser(global.db, users);
            }
        );
    }

    var findUser = function(db, users) {
        console.log("findUsers: twitterId " + twitterId);
        users.findOne({
            twitterId: twitterId
        }, function(err, document) {
            if (err)
                console.log(err)
            else {
                if (!document)
                    insertUser(global.db, users);
                else {
                    console.log("document found! " + document.twitterId);
                    console.log({
                        "twitterId": twitterId,
                        phone: document.phone,
                        social: "twitter",
                    });
                    console.log("DOCUMENT OBJECT" + document);
                    authorization(document);
                }
            }
        });
    }

    var insertUser = function(db, users) {
        console.log("user insertion " + users)

        users.insertOne({
            social: "twitter",
            "twitterId": twitterId,
        }, function(err, result) {
            if (err) {
                console.log("Sorry, twitter login error!");
                console.log(err)
                res.writeHead(400, {
                    'Content-Type': 'text/plain'
                });
                return res.end(JSON.stringify({
                    error: "Sorry, twitter login error."
                }));
            }
            else {
                console.log("Inserted a document into the users collection.");
                console.log({
                    "twitterId": twitterId,
                    social: "twitter",
                });
                findUser(global.db, users);
            }
        });
    };

    var authorization = function(user) {
        console.log("twitter authorization function");
        console.log("id is: " + user._id);

        User.findById(user._id, function(err, user) {
            if (err) {
                console.log("findById error")
            }
            else {
                return res.end(JSON.stringify(user));
            }
        });
    }

});

/* USER UPDATE  */
router.post("/updateUser", function(req, res, next) {
    if (!isHeaderValid(req, res)) return res.sendStatus(400);

    console.log("updateUser");

    var token = req.body.token;

    var users = global.db.collection(constants.USERS);

    try {
        console.log("Decoding token...");
        var decoded = jwt.decode(token, global.app.get('jwtTokenSecret'));
        console.log("user id! : " + decoded.id);

        users.update({
            "_id": new mongo.ObjectID(decoded.id)
        }, {
            $set: {
                phone: req.body.phone
            }
        }, function(err, user) {
            if (err) {
                console.log(err)
                res.end(JSON.stringify({
                    "error": "Account with this number already exists!"
                }));
            }
            else {
                if (!user)
                    console.log("Document not found");
                else {
                    console.log("UPDATE INFO" + user);
                    findUser(global.db, users, decoded.id);
                }
            }
        });

        var findUser = function(db, users, id) {
            users.findOne({
                "_id": new mongo.ObjectID(id)
            }, function(err, document) {
                if (err)
                    console.log(err)
                else {
                    if (!document)
                        console.log("Document not found");
                    else {
                        console.log("document updated! " + document.facebookId);
                        res.json({
                            "facebookId": document.facebookId,
                            phone: document.phone,
                            social: document.social,
                            facebookToken: document.facebookToken
                        });
                        console.log("DOCUMENT OBJECT" + document);
                    }
                }
            });

        }
    }
    catch (err) {
        console.log("Eror! " + err);
        res.statusCode = 401;
        res.end('Authorization error!');
    }

})

/* REMOVE users. */
router.post('/removeUser', function(req, res, next) {

    global.db.collection('users', function(err, collection) {
        if (err) {
            console.log(err);
            res.end("so bad!", 400);
        }
        collection.remove({
            _id: new mongo.ObjectID(req.body.id)
        }, function(err, results) {
            if (err) {
                console.log(err);
                res.end("so bad!", 400);
            }
            console.log(results);
            res.end("OK");
        });
    });

})

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
            console.log("Date.now(): " + new Date().getTime() / 1000);

            if (decoded.exp <= new Date().getTime() / 1000) {
                res.end('Access token has expired', 400);
            }
            else {
                findUsers();
                console.log("user id: " + decoded.id);
            }
        }
        catch (err) {
            console.log("Eror! " + err);
            res.statusCode = 401;
            res.end('Authorization error!');
        }
    }
    else {
        console.log("TOKEN NOT FOUND")
        next();
    }

    console.log("account: global.db exists? " + global.db);

    function findUsers() {
        var cursor = global.db.collection(constants.USERS).find();
        cursor.toArray(function(err, docs) {
            if (!err)
                console.log("retrieved records:");
            console.log(docs);
            res.end(JSON.stringify(docs));
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

function getTokenTimeExpired() {
    // current time + 15days, 1296000 seconds
    return Math.round(new Date().getTime() / 1000) + 1296000;
}

function getToken(user) {
    var token = jwt.encode({
        id: user._id,
        exp: getTokenTimeExpired()
    }, global.app.get('jwtTokenSecret'));
    return token;
}


module.exports = router;