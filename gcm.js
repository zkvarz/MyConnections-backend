// sender id
//356569675251

var gcm = require('node-gcm');

var message = new gcm.Message();

message.addData('key1', 'msg1');

var regTokens = [];

// Set up the sender with you API key
var sender = new gcm.Sender('AIzaSyAR7tjjSQGeYR56Vh_lBdud-WIZlkqSC2w');

// Now the sender can be used to send messages
sender.send(message, { topic: '/topics/global'  }, function (err, response) {
    if(err) console.error(err);
    else    console.log(response);
});

/*// Send to a topic, with no retry this time
sender.sendNoRetry(message, { topic: '/topics/global' }, function (err, response) {
    if(err) console.error(err);
    else    console.log(response);
});*/