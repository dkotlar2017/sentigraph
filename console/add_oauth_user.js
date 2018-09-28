const md5 = require('md5');
const sha256 = require('sha256')
const db = require(__dirname + "/../models/db.js"); 

if(typeof process.argv[2] === "undefined" || typeof process.argv[3] === "undefined" ) {
	console.log("Please use a username and password");
	process.exit(1);
}

db.query("INSERT into oauth_users (username, password) VALUES ('" + process.argv[2] + "', '" + md5(sha256(process.argv[3])) + "')", null, function(err, result){
	if(err) console.log("Error:" + err);
	else console.log("good");

	process.exit(1);
}); 
