var express = require('express');
var router = express.Router();
var constants = require("../constants");
var assert = require('assert');
var jwt = require('jwt-simple');

var mongo = require('mongodb');

var passport = require('passport');


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

            // current time + 15days, 1296000 seconds
            var tokenTimeExpired = Math.round(new Date().getTime() / 1000) + 1296000;

            var token = jwt.encode({
                id: user._id,
                exp: tokenTimeExpired
            }, global.app.get('jwtTokenSecret'));

            return res.end(JSON.stringify({
                phone: user.phone,
                id: user._id,
                "facebookId": facebookId,
                social: "facebook",
                token: token,
                expires: tokenTimeExpired,
                facebookToken: facebookToken
            }));
        }
    }
    else {
        return res.sendStatus(400);
    }
})

router.get('/googleLogin', passport.authenticate('google', { scope : ['profile', 'email'] }));

/*router.get('/googleLogin',
  passport.authenticate('google', { scope: ['profile'] }));*/

router.get('/googleLogin/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    console.log("Google Login Success!");
    res.redirect('/');
  });


/*router.get('/googleLogin', passport.authenticate('google', { scope: 
    [ 'https://www.googleapis.com/auth/plus.login',
    , 'https://www.googleapis.com/auth/plus.profile.emails.read' ]  }));

router.post("/googleLogin/callback", function(req, res, next) {
    // the callback after google has authenticated the user
    passport.authenticate('google', {
       uccessRedirect: '/index',
        failureRedirect: '/index'
    }),
    function(req, res) {
        // Successful authentication, redirect to your app. 
        res.end("seccess!!!");
    }(req, res, next);

})*/

/* USER UPDATE  */
router.post("/updateUser", function(req, res, next) {
    if (!isHeaderValid(req, res)) return res.sendStatus(400);

    console.log("updateUser");

    var token = req.body.token;
    var phone = req.body.phone;
    var facebookId = req.body.facebookId;

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


module.exports = router;