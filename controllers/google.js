const async = require('async');
const users = require(__dirname + "/../models/users.js");
const lib = require(__dirname + "/../libs/functions.js");
const memcache = require(__dirname + "/../libs/memcache.js");
const gconfig = require(__dirname + "/../../googleconfig.js").config;
var GoogleAuth = require('google-auth-library');


exports.google_login = function(req, res) {
	obj = {
		scripts: ["https://apis.google.com/js/platform.js"]
	};
	res.render('pages/google');	
};

exports.login = function(req, res) {
	var GoogleAuth = require('google-auth-library');
	var auth = new GoogleAuth();
	var client = new auth.OAuth2(gconfig.web.client_id, '', '');

	async.waterfall([
		function(cb) {
			client.verifyIdToken(req.body.token, gconfig.web.client_id, function(e, login) { //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
				if(typeof login === "undefined") {
					res.redirect('/login');
                                        process.exit(0);
                                        return;
				}

				req.session.token = req.body.token;
				var payload = login.getPayload();
				cb(null, payload);
			});
		},
		function(results, cb) {
			users.checkEmailExists(results.email, function(err, exists) {
				if(err) {
					cb(err);
					return;
				}

				if(exists === false) {
					users.addUser({email: results.email, password: "password", verified : '1'}, function(err, results) {
						users.checkEmailExists(results.email, function(err, exists) {
							if(exists !== false) {
								req.session.user_id = exists;
							}
						});
					});
				} else {
					req.session.user_id = exists;
				}

				cb(null, {email : results.email, token : req.body.token});
			});	
		}
	],
	function(err, result){
               if(err) {
                        res.send(JSON.stringify(err));
                        return;
                }
                res.send(JSON.stringify(result));
	});
};
