const mongo = require(__dirname + "/../models/mongo.js");
const lib = require(__dirname + "/../libs/functions.js");
const memcache = require(__dirname + "/../libs/memcache.js");

var date = lib.getDateForNames(-3);

mongo.run(function(db){
//	date = '17071014';
	var col = db.collection('sentences' + date),
	col2 = db.collection('watsondata' + date),
	a = [], text = [];

	col.find({since_id : 0}).toArray(function(err, docs) {
		if(err) throw err;

		a = docs.map(function(item) {
			return item.data.replace(/[;,\.]/g, ' ').replace(/\s+/g, ' ');
		});

		col2.find({}).toArray(function(err, docs2) {
			if(err) throw err

			docs2.map(function(item){
				item.data.reduce(function(last, i) {
					if(a.indexOf(i.text) > -1) {
						text.push(i);
					}

					return last;
				}, []);
			});

			if(text.length > 0 ) {
				memcache.set('watsonsentences' + date.toString(), JSON.stringify(text), 3600 * 24 * 3, function(){
					setTimeout(function(){ process.exit(); }, 10000);
				});
			} else {
				setTimeout(function(){ process.exit(); }, 10000);
			}
		});			
	});

});
