// sender id
//356569675251

var gcm = require('node-gcm');
var mongo = require('./mongo.js');
var mongodb = require('mongodb');

var exports = module.exports = {};


/*var message = new gcm.Message({
    collapseKey: 'demo',
    priority: 'high',
    contentAvailable: true,
    delayWhileIdle: true,
    restrictedPackageName: "somePackageName",
    dryRun: true,
    data: {
        key1: 'message1',
        key2: 'message2'
    },
    notification: {
        title: "Hello, World",
        icon: "ic_launcher",
        body: "This is a notification that will be displayed ASAP."
    }
});*/

var regTokens = [];

// Set up the sender with you API key
var sender = new gcm.Sender('AIzaSyAR7tjjSQGeYR56Vh_lBdud-WIZlkqSC2w');

exports.sendGroupMessage = function(messageObject) {
    var message = new gcm.Message();
    message.addData('data', messageObject);

    // TEMP SOLUTION~
    message.addData('flag', 'group');
    message.addNotification('title', messageObject.message);

    sender.send(message, {
        topic: '/topics/global'
            // topic: '/topics/' + messageObject.chat_room_id
    }, function(err, response) {
        if (err) console.error(err);
        else console.log("message sent" + response);
    });
};

exports.sendPrivateMessage = function(messageObject, chatUserId) {
    console.log("sendPrivateMessage " + chatUserId)
    var message = new gcm.Message();
    message.addData('data', messageObject);

    var gcm_registration_id;

    message.addData('flag', 'group');
    message.addNotification('title', messageObject.message);

    // Add the registration tokens of the devices you want to send to
    var registrationTokens = [];

    mongo.users.findOne({
        "_id": new mongodb.ObjectID(chatUserId)
    }, function(err, document) {
        if (err)
            console.log(err)
        else {
            if (!document)
                console.log("User not found");
            else {
                console.log("document updated! " + document.facebookId);
                gcm_registration_id = document.gcm_registration_id;
                registrationTokens.push(gcm_registration_id);
                sendGcmMessage();
                console.log("DOCUMENT OBJECT" + document);
            }
        }
    });

    function sendGcmMessage() {
        sender.send(message, {
            registrationTokens: registrationTokens
        }, function(err, response) {
            if (err) console.error(err);
            else console.log("message sent" + response);
        });
    }

};
