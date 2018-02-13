const config = require(__dirname + "/../../db.js");
var DBWrapper = require('node-dbi').DBWrapper;

dbWrapper = new DBWrapper('pg', { host: '127.0.0.1', user: config.username, password: config.password, database: config.db } );
dbWrapper.connect();

exports.query = function() {
	var args = Array.from(arguments);
	//var cb = args.splice(0, -1);
	dbWrapper.fetchAll.apply(dbWrapper, args);
};

