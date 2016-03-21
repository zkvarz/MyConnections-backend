var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var constants = require("./constants");
var passport = require('passport');
var JsonStrategy = require('passport-json').Strategy;
var jwt = require('jwt-simple');

var routes = require('./routes/index');
var users = require('./routes/users');
var account = require('./routes/account');

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
});


//AUTHORIZATION PASSPORT STRATEGY =====================
function initPassportStrategy() {

  passport.use(new JsonStrategy({
      usernameProp: 'phone',
      passwordProp: 'password',

    },
    function(phone, password, done) {
      console.log("Check username & password! Search for: username " + phone + " pass " + password);
      global.db.collection(constants.USERS).findOne({
        "phone": phone
      }, function(err, user) {
        if (err) {
          console.log("User not found");
          return done(err);
        }
        if (!user) {
          return done(null, false, { message: 'Incorrect credentials!' });
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
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.json());  

// Define routes.
app.get('/login',
  function(req, res){
    console.log("/login get triggered!");
    res.sendStatus(400);
  });
  
app.post('/login', function(req, res, next) {
   console.log("/login post triggered");
   
  passport.authenticate('json', {
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
      }, app.get('jwtTokenSecret'));

      res.json({
        token: token,
        expires: tokenTimeExpired,
        user: {phone: user.phone, id: user._id}
      });
      
  //old implementation
 /*     var tokenSecret = "xxx";
      //user has authenticated correctly thus we create a JWT token 
      var token = jwt.encode({
        username: user.phone
      }, tokenSecret);
      res.json({
        token: token
      });*/

    })(req, res, next);

});

//====================================================================

app.use('/', routes);
app.use('/users', users);
app.use('/account', account);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

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