const async = require('async');
const md5 = require('md5');
const sha256 = require('sha256');
const fs = require('fs');
const db = require(__dirname + "/../models/db.js");
const eth = require(__dirname + "/../models/ethereum.js");
const watson = require(__dirname + "/../models/watson.js");
const mongo = require(__dirname + "/../models/mongo.js");
const users = require(__dirname + "/../models/users.js");
const lib = require(__dirname + "/../libs/functions.js");
const memcache = require(__dirname + "/../libs/memcache.js");
const twitter = require(__dirname + "/../models/twitter.js");

exports.getQ = function(req, res) {
	var result = {},
	 	scores = {
			"0.50" : "Excellent Initiative/High crowd approval",
                        "0.70" : "Very Good Initiative/moderate crowd interest",
                        "0.90" : "Fair initiative/Event/low crowd interest",
                        "1.50" : "Manageable initiative/ crowd accommodation",
                        "2.00" : "Struggling Initiative/ moderate crowd criticism",
                        "10.00" : "Bad Idea / high crowd disapproval"
		},
		q = Math.round(Math.random() * 250) / 100;
	result['q'] = q;	

	for(var i in scores) {
		if(parseFloat(i) > q) {
			result['message'] = scores[i];
			break;
		}
	}

	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Content-Type', 'application/json');

	res.send(req.query.callback + '('  + JSON.stringify(result) + ')');
}


exports.oath_token = function(req, res) {
        var auth = req.headers['authorization'];  // auth is in base64(username:password)  so we need to decode the base64
        console.log("Authorization Header is: ", auth);

        if(!auth) {     // No Authorization header was passed in so it's the first time the browser hit us

                // Sending a 401 will require authentication, we need to send the 'WWW-Authenticate' to tell them the sort of authentication to use
                // Basic auth is quite literally the easiest and least secure, it simply gives back  base64( username + ":" + password ) from the browser
                res.statusCode = 401;
                res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
		res.setHeader('Content-Type', 'application/json');

                res.end('{Error : { code: 1, message: "No authentication header."}}');
        }

        else if(auth) {    // The Authorization was passed in so now we validate it

                var tmp = auth.split(' ');   // Split on a space, the original auth looks like  "Basic Y2hhcmxlczoxMjM0NQ==" and we need the 2nd part

                var buf = new Buffer(tmp[1], 'base64'); // create a buffer and tell it the data coming in is base64
                var plain_auth = buf.toString();        // read it back out as a string

                // At this point plain_auth = "username:password"

                var creds = plain_auth.split(/:(.+)/);      // split on a ':'
                var username = creds[0];
                var password = creds[1];
		var token = randomPassword();
		var d = new Date(),
			 d2 = new Date().setDate(d.getDate() + 30);
			d = new Date(d2);
		var expires = d.getFullYear() + '-0' + (d.getMonth() + 1) + '-0' + d.getDate() + ' 01:00:00';
		expires = expires.replace(/-0(\d\d)/gi, "-$1");

		db.query('SELECT * FROM oauth_users WHERE username=?', [username], function(err, result) {
			if(err) {
				res.statusCode = 401; // Force them to retry authentication
				res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
				res.end('{Error :10, message: "User does not exist."}');
			}

			if(typeof result[0].password !== "undefined" && result[0].password === md5(sha256(password))) {
				res.statusCode = 200;
				db.query('DELETE FROM oauth_tokens WHERE oauth_users_id=?', [result[0].id], function(err, result2){
console.log("INSERT INTO oauth_tokens (token, expires_date) VALUES('" + token + "', '" + expires + "')");
					db.query("INSERT INTO oauth_tokens (oauth_users_id, token, expire_date) VALUES('" + result[0].id + "', '" + token + "', '" + expires + "')", null, function(err, result3) {
			res.end('{ success : 1, token : "' + token + '"}');
});
				});			
			} else {
				res.statusCode = 401; // Force them to retry authentication
				res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
				res.end('{Error: 11, message: "Username/password does not match."}');
			}
		});
        }
}

function randomPassword() {
	var alphabet = "abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789",
		l = alphabet.length,
		n, pass = '';
    
	for (var i = 0; i < 64; i++) {
        	n = Math.floor(Math.random() * l);
        	pass += alphabet[n];
    	}
    	return pass;
}
