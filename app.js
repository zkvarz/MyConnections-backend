var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var constants = require("./constants");
var passport = require('passport');
var JsonStrategy = require('passport-json').Strategy;

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

        //no password verification yet
        // if (!user.verifyPassword(password)) { return done(null, false); }
        return done(null, user);
      });
    }
  ));

  console.log("Connecting to db again.");

}

//========================================================

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

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
  
app.post('/login', 
  passport.authenticate('json', { failureRedirect: '/login', session: false }),
  function(req, res) {
    console.log("/login post triggered");
    res.end("token should be there");
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