const mongo = require(__dirname + "/../models/mongo.js");
const lib = require(__dirname + "/../libs/functions.js");
const eth = require(__dirname + "/../models/ethereum.js");
const memcache = require(__dirname + "/../libs/memcache.js");

var date = lib.getDateForNames(-3);

mongo.run(function(db){
	var col = db.collection('watsondata' + date),
	col2 = db.collection('distancefromjoy');

//	col = db.collection('watsondata17070610');
	col.find({}).toArray(function(err, docs) {

		if(err) throw err;

		var tones =  { 
			anger: 0,
			disgust: 0,
			fear: 0,
			joy: 0,
			sadness: 0 
		},
		total = 0;

		docs.forEach(function(item){
			item.data.forEach(function(item2) { 
				var item3 = null;
				if(typeof item2.emotion_tone === "undefined" || item2.emotion_tone === null) {
					return;
				}

				for(var j = 0; j < item2.emotion_tone.length; j++) {
					if(typeof item2.emotion_tone[j] === "undefined") {
						return;
					}
					
					item3 = item2.emotion_tone[j];
					for(var i in tones) {
						if(typeof item3[i] !== "undefined") {
							tones[i] += parseFloat(item3[i]);	
						}
					}
				}

				if(item2.emotion_tone.length > 0) {
					total++;
				}
			});
		});

		for(var i in tones) {
			tones[i] = parseFloat(tones[i] / total);
		}

		var q = Math.sqrt( Math.pow(tones.anger * 3, 2) + Math.pow(tones.disgust * 2.5, 2) + Math.pow(tones.fear * 1.5, 2) + Math.pow(tones.sadness * 2, 2) + Math.pow(tones.joy, 2) );
	
		col2.insertOne({q : q, dateAdded : new Date(), tones: tones, date: date}, function(err){
			if(err) throw err;
		});

		memcache.set('q' + date, q, 3600 * 24 * 30, function(){
//			eth.createContract();
//			eth.setData(JSON.stringify(tones), q);
			setTimeout(function(){ process.exit(); } , 15000);
		});
	});
});

