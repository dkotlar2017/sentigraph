const fs = require('fs');
const async = require('async');
const md5 = require('md5');
const memcache = require(__dirname + "/../libs/memcache.js");
const db = require(__dirname + "/db.js");


exports.getUserByEmail = function(email, cb) {
	db.query("SELECT * FROM users WHERE email = ?", [email], cb);
};

exports.addUser = function(a, cb) {
	var sql;
	
	a['password'] = md5(a['password']);
	sql = "INSERT INTO users (" + Object.keys(a).join(',')  + ") VALUES (?, ?, ?)";
	db.query(sql, Object.keys(a).map(function(item) { return a[item]; }),  cb);
};

exports.checkEmailExists = function(email, cb) {
	db.query("SELECT id FROM users WHERE email = ?", [email], function(err, results) {
		if(err) {
			cb(err);
			return;
		}
		
		if (results.length === 0) {
			cb(null, false);
		} else {
			cb(null, results.map(function(item){ return item})[0].id);
		}
	});
};

function getPath(user_id, token) {                                                                                
        return __dirname + '/../../sentigraph_users/' + user_id + /*'-' + token +*/ '.json';                          
} 

exports.login = function(user_id, token, callback) {
        var path = getPath(user_id, token);

        async.waterfall([
                function(cb) {
                        if(!fs.existsSync(path)) {
                                cb(null, {user_id : user_id, data : {} });
                        } else {
                                fs.readFile(path, function(err, data) {
                                        if(err) {
                                                cb(err);
                                                return;
                                        }

                                        cb(null, JSON.parse(data));
                                });
                        }
                },
		function(results, cb) {
			exports.update(token, results, cb);	
		}
	], function(err, results) {
		if(err) callback(err);

		callback(null, results);
	});
};

exports.logout = function(token, cb) {
	memcache.set('_SESSION_' + token, {}, 1, function() {
		if(cb) cb(null);
	});
};

exports.isLoggedIn = function(token, cb) {
	memcache.get('_SESSION_' + token, function(data){
		if(data !== null && data !== undefined && data !== "") {
			cb(null, true);
		} else {
			cb(null, false);
		}
	}); 
};

exports.set = function(token, key, value, callback) {
	var d;

	memcache.get('_SESSION_' + token, function(data) {
		d = JSON.parse(data);
		d.data[key] = value;

		memcache.set('_SESSION_' + token, JSON.stringify(d), 3600 * 12, function() {
			exports.update(token, d, callback);
			//callback(null, d);
		});
	});
};

exports.getId = function(token, callback) {
	var d;

	memcache.get('_SESSION_' + token, function(data) {
		d = JSON.parse(data);

		callback(null, d.user_id);
	});
};

exports.getData = function(token, callback) {
        var d;

        memcache.get('_SESSION_' + token, function(data) {
                d = JSON.parse(data);

                callback(null, d.data);
        });
};

exports.get = function(token, key, callback) {
	var d;

        memcache.get('_SESSION_' + token, function(data) {
                d = JSON.parse(data);

		callback(null, d.data[key]);
        });
};

exports.update = function(token, data, callback) {

	async.parallel([
		function(cb) {
			memcache.set('_SESSION_' + token, JSON.stringify(data), 3600 * 12, function() {
				cb(null, data);
			});
		},
		function(cb) {
			fs.writeFile(getPath(data.user_id, token), JSON.stringify(data), function(err, r) {
				if(err) cb(err);

				cb(null, data);
			});
		}
	], function(err, results) {
		if(err) callback(err);

		callback(null, results[0]);
	});
};
