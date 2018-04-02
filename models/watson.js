const request = require('request');
const util = require('util');
const config = require(__dirname + "/../../watsonconfig.js").config;

exports.getData = function(text, cb) {

	request({
	    url: "https://gateway.watsonplatform.net/tone-analyzer/api/v3/tone?version=2016-05-19",
	    method: "POST",
	    auth : {
		username : config.username,
		password : config.password,
		sendImmediately : true
	    },
	    json: true, 
	    body: { "text": text }
	}, function (error, response, body){
		var data = [];
		if(typeof body.sentences_tone == "undefined") {
			body.sentences_tone = [];
		}
		body.sentences_tone.forEach(function(item){
			var data2 = {};
			data2.text = item.text;

			if(typeof item.tone_categories === "undefined") {
				return;
			}

			item.tone_categories.forEach(function(category){
				data2[category.category_id] = category.tones.map(function(tone){
					var tmp = {};
					tmp[tone.tone_id] = tone.score;
					return tmp;
				});
			});
			data.push(data2);
		});
		cb(null, data);
	});
};



