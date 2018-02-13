const async = require('async');
const mongo = require(__dirname + "/../models/mongo.js"); 
const api_base = 'https://api.twitter.com/';
const lib = require(__dirname + "/../libs/functions.js");
const config = require(__dirname + "/../../twitterconfig.js").config;


var date = lib.getDateForNames(0);
//date = '17071014';
var request = require('request');

mongo.run(function(db) {
	var col = db.collection('twitterhashtags'),
	hashtags = [];

	col.find({}).toArray(function(err, items) {
		if(err !== null || items.length < 1) {
			return;
		}
		retrieveTweets(items);
	});


});

function retrieveTweets(hashtags) {
var bearer_token_cred = new Buffer(config.api_key + ":" + config.api_secret).toString('base64');

	request({
	url : api_base + 'oauth2/token?grant_type=client_credentials',
	    method: "POST",
		headers : {
'Authorization' : ' Basic ' + bearer_token_cred
		},
	    json: true, 
	body: {}
}, function(error, response, result){
	
	if(typeof result.token_type === "undefined" || result.token_type !== "bearer") {
		throw new Error("Could not retrieve token from twitter");
	}

	var bearer_token = result.access_token;
	async.mapLimit(hashtags, 5, function(item, cb) {
		var url = api_base + '1.1/search/tweets.json';
		url += '?q=' + item.data.replace('#', '%23');
		
		if(item.since_id > 0) {
			url += '&since_id=' + item.since_id;
		}
		url += '&lang=en&locale=en&result_type=recent&count=100&include_entities=false';

		request({
			url : url,
			method: 'GET',
			headers: {
				'Authorization' : 'Bearer ' + bearer_token
			}
		}, function(error, response, body) {
			var r = JSON.parse(body);

			mongo.run(function(db){
				var col = db.collection('sentences' + date);
				if(r.statuses.length > 0) {
					col.insertMany(r.statuses.map(function(s) { return {data: s.text, dateAdded: new Date()};  }), function(err, result){
						cb(null);
					}); 
				} else {
					cb(null);
				}
			});
		});
	}, function(err, data) {
		if(err) throw err;
		setTimeout(function() { process.exit(); } , 10000);
	});
});

}
