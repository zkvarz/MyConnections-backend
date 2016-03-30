var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var constants = require("./constants");
var passport = require('passport');
var JsonStrategy = require('passport-json').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

var auth = require('./auth');

var routes = require('./routes/index');
var users = require('./routes/users');
var account = require('./routes/account');
var googleAuth = require('./routes/googleAuth');

//mongodb database
var MongoClient = require('mongodb').MongoClient;
var assert = require("assert");
var db;

//database connection
var databaseUrl = 'mongodb://localhost:27017/myconnections-backend';
MongoClient.connect(databaseUrl, function(err, database) {
  assert.equal(err);
  if (err) console.log("Error in database connect occured: " + err);
  console.log("Connected correctly to server");
  this.db = database;
  console.log("global.db exists? " + global.db);
  initPassportStrategy();
  initFacebookPassportStrategy();
  initGoogleLoginStrategy()
});


//AUTHORIZATION PASSPORT STRATEGY =====================
function initPassportStrategy() {

  passport.use('user-login', new JsonStrategy({
      usernameProp: 'phone',
      passwordProp: 'password',
    },
    function(phone, password, done) {
      console.log("Check username & password! Search for: username " + phone + " pass " + password);
      global.db.collection(constants.USERS).findOne({
        "phone": phone,
        "password": password
      }, function(err, user) {
        if (err) {
          console.log("User not found");
          return done(err);
        }
        if (!user) {
          return done(null, false, {
            message: 'Incorrect credentials!'
          });
        }

        if (user.phone == phone && user.password == password) {
          console.log("User found! " + phone);
          console.log("phone" + user.phone);
          console.log("user" + user.password);
        }
        else {
          console.log("User Not found! " + phone);
        }

        return done(null, user);
      });
    }
  ));

}

//========================================================

//AUTHORIZATION FACEBOOK PASSPORT STRATEGY =====================
function initFacebookPassportStrategy() {
  console.log("initFacebookPassportStrategy");

  passport.use('facebook-login', new JsonStrategy(
    function(facebookId, password, done) {
      console.log("Check facebook username & password! Search for: username " + facebookId);
      global.db.collection(constants.USERS).findOne({
        facebookId: facebookId
      }, function(err, user) {
        if (err) {
          console.log("User not found");
          return done(err);
        }
        if (!user) {
          console.log("Incorrect !USER facebook.");
          return done(null, false, {
            message: 'Incorrect credentials!'
          });
        }

        if (user.facebookId == facebookId) {
          console.log("facebookId! " + user.facebookId);
        }
        else {
          console.log("User Not found! " + facebookId);
        }

        return done(null, user);
      });
    }
  ));

}

//========================================================

//AUTHORIZATION GOOGLE STRATEGY =====================
function initGoogleLoginStrategy() {
  console.log("initGoogleLoginStrategy");

  passport.use(new GoogleStrategy({
      clientID: '356569675251-vcq1jmfqsiccvidtsap7nfckvama6228.apps.googleusercontent.com',
      clientSecret: 'vIxsuxFBXAp4mLbnFNaEWjBU',
      callbackURL: "http://myconnections-backend-zkvarz.c9users.io/account/googleLogin/callback"
    },
    function(accessToken, refreshToken, profile, cb) {
      console.log("collection findOrCreate");
      console.log("accessToken " + accessToken);
      console.log("refreshToken " + refreshToken);

      global.db.collection(constants.USERS).createIndex({
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

          insertUser(profile);
        }
      );

      var insertUser = function(profile) {
        console.log("user createIndex " + profile.id);
        global.db.collection(constants.USERS).insert({
          googleId: profile.id
        }, function(err, user) {
          return cb(err, user);
        });
      }


    }
  ));


  /*passport.use('google', new GoogleStrategy({
      clientID: auth.googleAuth.clientID,
      clientSecret: auth.googleAuth.clientSecret,
      callbackURL: auth.googleAuth.callbackURL,
    },
    function(token, tokenSecret, profile, cb) {
      console.log("Google tokenSecret " + tokenSecret);
      console.log("Google Auth " + profile.id);
      global.db.collection(constants.USERS).findOrCreate({
        googleId: profile.id
      }, function(err, user) {
        console.log("Google Auth Done!");
        return cb(err, user);
      });
    }
  ));
*/
}

//========================================================

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('jwtTokenSecret', 'my-super-secret');

// FOR LOGIN POST ===============================================================

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// Use application-level middleware for common functionality, including
// logging, parsing, and session handling.
app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({
  extended: true
}));
app.use(require('express-session')({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
}));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.json());

// Define routes.
app.get('/login',
  function(req, res) {
    console.log("/login get triggered!");
    res.sendStatus(400);
  });


//====================================================================

app.use('/', routes);
app.use('/users', users);
app.use('/account', account);
app.use('/googleAuth', googleAuth);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/* Error handlers */

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;

global.db = db;
global.databaseUrl = databaseUrl;
global.app = app;
