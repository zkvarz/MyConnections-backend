// sender id
//356569675251

var gcm = require('node-gcm');

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

// Now the sender can be used to send messages
/*sender.send(message, { topic: '/topics/global'  }, function (err, response) {
    if(err) console.error(err);
    else    console.log("message sent" + response);
});*/

exports.sendMessage = function(messageObject) {
    var message = new gcm.Message();
    message.addData('data', messageObject);
    
    // TEMP SOLUTION~
    message.addData('flag', 'group');
    message.addNotification('title', 'Hello');

    sender.send(message, {
        topic: '/topics/global'
        // topic: '/topics/' + messageObject.chat_room_id
    }, function(err, response) {
        if (err) console.error(err);
        else console.log("message sent" + response);
    });
};
