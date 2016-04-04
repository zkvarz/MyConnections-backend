// var app = require('./app');
var mongo = require('../mongo.js');

var jwt = require('jwt-simple');

var User = function(document) {
    console.log("Constructor called " + JSON.stringify(document));
    // this.data = data;
    this.id = document._id;
    this.phone = document.phone;
    this.twitterId = document.twitterId;
    this.social = document.social;
    this.token = getToken(document);
    this.expires = getTokenTimeExpired();
}

// User.prototype.data = {}

User.prototype.changeName = function(name) {
    this.data.name = name;
}

User.findById = function(id, callback) {
    console.log("find id " + id);
    mongo.users.findOne({
        _id: new mongo.mongodb.ObjectID(id)
    }, function(err, document) {
        if (err) {
            console.log(err);
            callback(err);
        }
        else {
            console.log("findById: user found!");
            callback(null, new User(document));
            console.log("document object! " + JSON.stringify(new User(document)));
        }
    });
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


module.exports = User;