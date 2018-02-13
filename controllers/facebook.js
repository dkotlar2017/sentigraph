const async = require('async');
const md5 = require('md5');
const request = require('request'); 
const users = require(__dirname + "/../models/users.js");
const lib = require(__dirname + "/../libs/functions.js");
const memcache = require(__dirname + "/../libs/memcache.js");

exports.facebook = function(req, res) {
        res.render('pages/facebook');
};

exports.facebook_login = function(req, res) {
        var user_id = req.body.id,
                token = req.body.token;

        async.waterfall([
		function(cb) {
			request({
				url: "https://graph.facebook.com/me?access_token=" + token,
				method: "GET",
				json: true
			}, 
			function(err, response, body){
				if(err) { 
					cb(err);
					return;
				}

				if (body.id !== user_id) {
					cb({CODE : 101, message : "User not identified"});
					return;
				}

				req.session.token = token;
				cb(null);
			});			
		},
		function(cb) {
			users.checkEmailExists(user_id + "@facebook.com", function(err, exists) {
				if(err) {
					cb(err);
					return;
				}

				if(exists === false) {
					users.addUser({email : user_id + "@facebook.com", password : "password",  verified : '1'}, function(err, results) {
                                              users.checkEmailExists(user_id + "@facebook.com", function(err, exists) {
                                                        if(exists !== false) {
                                                                req.session.user_id = exists;
                                                        }
                                              });
					});
				} else {
					req.session.user_id = exists;
				}

				cb(null, {user_id : user_id, data: {} });
			});
		}
        ], function(err, result) {
               if(err) {
                        res.send(JSON.stringify(err));
                        return;
                }
                res.send(JSON.stringify(result));
        });
};

exports.facebook_logout = function(req, res) {
        async.waterfall([
                function(cb) {
                        users.logout(req.session.token, cb);
                }
        ], function(err, result) {
               if(err) {
                        res.send(JSON.stringify(err));
                        return;
                }
                res.render('pages/facebooklogout');
        });
};
