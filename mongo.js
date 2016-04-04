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
        callback(err);
    });
}

global.db = db;
module.exports.mongodb = mongodb;