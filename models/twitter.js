const api_base = 'https://api.twitter.com/';
const lib = require(__dirname + "/../libs/functions.js");
const config = require(__dirname + "/../../twitterconfig.js").config;

var request = require('request');

exports.retrieveTweetsByHashtag = function(hashtag, cb) {
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

		var bearer_token = result.access_token,
			url = api_base + '1.1/search/tweets.json';

		url += '?q=' + hashtag.replace('#', '%23');
		
/*
		if(item.since_id > 0) {
			url += '&since_id=' + item.since_id;
		}
*/
		url += '&lang=en&locale=en&result_type=recent&count=100&include_entities=false';

		request({
			url : url,
			method: 'GET',
			headers: {
				'Authorization' : 'Bearer ' + bearer_token
			}
		}, function(error, response, body) {
			var r = JSON.parse(body),
				a = r.statuses.map(function(s) { 
				return {data: s.text,created_at: s.created_at, dateAdded: new Date()};  
			});

			cb(null, a);
		});

	});
};
