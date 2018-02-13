const async = require('async');
const watson = require(__dirname + "/../models/watson.js");
const mongo = require(__dirname + "/../models/mongo.js");
const lib = require(__dirname + "/../libs/functions.js");


var date = lib.getDateForNames(-2);

mongo.run(function(db){
//	date = '17071014';
	var col = db.collection('sentences' + date),
	a, sa = [];

	col.find({}).toArray(function(err, docs) {
		if(err) throw err;
		a = docs.reduce(function(last, item){
			if(item.since_id === 0) {
				sa.push(item.data.replace(/[;,\.]/g, ' ').replace(/\s+/g, ' '));
			} else {
				last.push(item.data.replace(/[;,\.]/g, ' ').replace(/\s+/g, ' '));
			}
			return last;
		}, []);
		a = sa.concat(a);
		fetchFromWatson(a);
	});
});

function fetchFromWatson(a) {
	text = a.splice(0, 700).join("\n");
                watson.getData(text, function(data){
                        var insert = data.map(function(item){
                                var tmp = {};
                                tmp.text = item.text;
                                tmp.emotion_tone = item.emotion_tone;
                                return tmp;
                        });

                        mongo.run(function(db){

                                var col = db.collection('watsondata' + date);
                                col.insertOne({data : insert, dateAdded : new Date()}, function(err, result){
                                        if(err) { throw err; }

					if(a.length > 0) {
						setTimeout(function() {
							fetchFromWatson(a);
						}, 10000);					
					} else {
						setTimeout(function() { process.exit(); }, 15000);
					}
                                });
                        });
                });
}
