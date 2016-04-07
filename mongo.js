//mongodb database
var MongoClient = require('mongodb').MongoClient;
var assert = require("assert");
var mongodb = require("mongodb");
var db;

module.exports.init = function(callback) {
    //database connection
    var databaseUrl = 'mongodb://localhost:27017/myconnections-backend';
    MongoClient.connect(databaseUrl, function(err, database) {
        assert.equal(err);
        if (err) console.log("Error in database connect occured: " + err);
        console.log("Connected correctly to server");
        this.db = database;
        console.log("global.db exists? " + global.db);

        module.exports.database = database;

        module.exports.users = database.collection('users');
        module.exports.chatRooms = database.collection('chatRooms');
        module.exports.messages = database.collection('messages');
        createUsersIndex();
        createChatRoomsIndex();
        createMessagesIndex();
        callback(err);
    });
}

var createUsersIndex = function() {
    console.log("this.db exists? " + this.db);
    var users = this.db.collection("users");
    users.createIndex({
            "phone": 1,
            "gcm_registration_id": 1,
        }, {
            unique: true,
            sparse: true
        },
        function(err, results) {
            if (err) console.log(err)
            assert.equal(err, null);
            console.log("user createIndex")
            console.log(results);
        }
    );
}

var createChatRoomsIndex = function() {
    var users = this.db.collection("chatRooms");
    users.createIndex({
            "name": 1,
        }, {
            unique: true,
        },
        function(err, results) {
            if (err) console.log(err)
            assert.equal(err, null);
            console.log("chatRooms createIndex")
            console.log(results);
        }
    );
}

var createMessagesIndex = function() {}

global.db = db;
module.exports.mongodb = mongodb;