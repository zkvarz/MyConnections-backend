var express = require('express');
var router = express.Router();

var assert = require('assert');

var USERS = "users";
var PHONE = "phone";
var PASSWORD = "password";

/* POST account. */
router.post('/create', function(req, res, next) {
    
    if(!isHeaderValid(req, res))  return res.sendStatus(400);

    var phone;
    var password;

    // check phone & password
    if (req.body.phone && req.body.password) {
        phone = req.body.phone;
        password = req.body.password;

        var insertDocument = function(db, callback) {
            // Get the documents collection
            var collection = db.collection(USERS);
            // Insert some documents
            collection.insertOne({
                PHONE: phone,
                PASSWORD: password
            }, function(err, result) {
                assert.equal(err, null);
                console.log("Inserted a document into the users collection.");
                callback(result);
            });
        }

        global.mongoclient.connect(global.databaseUrl, function(err, db) {
            assert.equal(null, err);
            insertDocument(db, function() {
                db.close();
            });
        });


        return res.sendStatus(201);
    }
    else {
    //   res.write("Incorrect parameters!");
      return res.sendStatus(400);
    }

});

/* GET users. */
router.get('/getUsers', function(req, res, next) {
//   if(!isHeaderValid(req, res))  return res.sendStatus(400);

    var findUsers = function(db, callback) {
        
/*         db.collection('teams', function(err, collection) {
        if (!err) {
          collection.find({
            'GroupName': PHONE
          }).toArray(function(err, docs) {
            if (!err) {
              db.close();
              var intCount = docs.length;
              if (intCount > 0) {
                var strJson = "";
                for (var i = 0; i < intCount;) {
                  strJson += '{"country":"' + docs[i].country + '"}'
                  i = i + 1;
                  if (i < intCount) {
                    strJson += ',';
                  }
                }
                strJson = '{"GroupName":"' + PHONE + '","count":' + intCount + ',"teams":[' + strJson + "]}"
                res.write(JSON.parse(strJson));
                callback("", JSON.parse(strJson));
              }
            } else {
              //onErr(err, callback);
            }
          }); //end collection.find 
        } else {
          //onErr(err, callback);
        }
      }); //end db.collection*/
        
        var cursor = db.collection(USERS).find();
        
        
        cursor.each(function(err, doc) {
            assert.equal(err, null);
            if (doc != null) {
               console.log("should be printed " + doc.length);
               console.dir(doc);
               return res.send(JSON.stringify(doc));
            }
            else {
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
    
    
    // return res.sendStatus(200);

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