const MongoClient = require('mongodb').MongoClient;
const config = require(__dirname + "/../../mongoconfig.js").config;
const assert = require('assert');
var db = null, calls = [];


function connect() {
	if(db !== null) { return; }

	MongoClient.connect('mongodb://' + config.host + ':' + config.port + '/'+ config.db, function(err, d) {
		assert.equal(null, err);

		db = d;
		calls.forEach(function(item) {
			item.f.apply(this, [db, item.cb]);
		});
  
	});
}

exports.run = function(f, cb){
	connect();

	if(db !== null) {
		f.apply(this, [db,cb]);
	} else {
		calls.push({f : f, cb : cb});
	}
};

exports.getSalt = function() {
	return config.salt;
}

exports.close = function() {
	db.close();
}

