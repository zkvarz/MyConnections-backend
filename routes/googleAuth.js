var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
   res.sendFile('googleAuth.html', { root: __dirname });
});

module.exports = router;