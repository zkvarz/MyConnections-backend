// expose our config directly to our application using module.exports
module.exports = {

    'facebookAuth' : {
        'clientID'      : 'your-secret-clientID-here', // your App ID
        'clientSecret'  : 'your-client-secret-here', // your App Secret
        'callbackURL'   : 'http://localhost:8080/auth/facebook/callback'
    },

    'twitterAuth' : {
        'consumerKey'       : 'your-consumer-key-here',
        'consumerSecret'    : 'your-client-secret-here',
        'callbackURL'       : 'http://localhost:8080/auth/twitter/callback'
    },

    'googleAuth' : {
        'clientID'      : '356569675251-vcq1jmfqsiccvidtsap7nfckvama6228.apps.googleusercontent.com',
        'clientSecret'  : 'vIxsuxFBXAp4mLbnFNaEWjBU',
        'callbackURL'   : 'http://myconnections-backend-zkvarz.c9users.io/account/googleLogin/callback'
    }

};