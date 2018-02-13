const memcached = require('memcached');

var cbs = [], connected = false, client = null;

function _run(b) {
	if(connected) {
		b.call(this);
		return;
	} else {
		cbs.push(b);

		if(client !== null) {
			return;
		}
	}

	client = new memcached('127.0.0.1:11211');
	client.connect( '127.0.0.1:11211', function( err, conn ){
		if( err ) throw new Error( err );
		console.log( conn.server );

		for(var i = 0; i < cbs.length; i++) {
			cbs[i].call(this);
		}

		connected = true;
	});
}

exports.flash = function(key, value, cb) {
	if(typeof value === "function") {

		exports.get(key, function(data){
			value(data);
			exports.delete(key);
		});
	} else {
		exports.set(key, value, 120, function(err){
			if(err) throw err;

			if(cb) cb();
		});
	}
}


exports.get = function(key, cb){
	_run(function() {
		if(typeof key === "object") {
			client.getMulti(key, function(err, data){
				if(err) throw err;

				cb(data);
			});			
		} else {
			client.get(key, function(err, data){
				if(err) throw err;

				cb(data);
			});
		}
	});
}

exports.set = function(key, value, lifetime, cb) {

	_run(function(){
		client.set(key, value, lifetime, function(err){
			if(err) throw err;

			cb();
		});
	});
}

exports.delete = function(key, cb) {
	_run(function() {
		client.del(key, function(err){
			if(err) throw err;

			if(cb) cb();
		});
	});
}

