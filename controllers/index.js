const async = require('async');
const md5 = require('md5');
const fs = require('fs');
const eth = require(__dirname + "/../models/ethereum.js");
const watson = require(__dirname + "/../models/watson.js");
const mongo = require(__dirname + "/../models/mongo.js");
const users = require(__dirname + "/../models/users.js");
const lib = require(__dirname + "/../libs/functions.js");
const memcache = require(__dirname + "/../libs/memcache.js");
const twitter = require(__dirname + "/../models/twitter.js");

exports.main = function(req, res) {
	res.render('pages/index');
};

exports.login = function(req, res) {
	var obj = {
		scripts: ["https://apis.google.com/js/platform.js"]
	}

	res.render('pages/login', obj);
};

exports.logout = function(req, res) {
	var obj = {
		scripts: ["https://apis.google.com/js/platform.js",
			  "https://connect.facebook.net/en_US/sdk.js"]
	};

	res.render('pages/logout', obj);
};

exports.twitter = function(req, res) {
	var obj = {
                scripts : ['twitter','https://www.gstatic.com/charts/loader.js'],
		css: ['twitter']
        };

	res.render('pages/twitter', obj);
};

exports.twitter2 = function(req, res) {
        var obj = {
                scripts : ['twitter','https://www.gstatic.com/charts/loader.js'],
                css: ['twitter']
        };

        res.render('pages/twitter2', obj);
};

exports.my_searches = function(req, res) {
	var obj = {
		scripts : ['my-searches'],
		css : ['twitter', 'my-searches']
	};

	async.waterfall([
		function(cb) {
			users.isLoggedIn(req.session.token, function(err, b) {
				if(!b) {
					cb("not logged in");
				} else {
					
					cb(null);
				}
			});
		},
		function(cb) {
			users.getData(req.session.token, function(err, data) {
				cb(null, data);	
			});
		}
	], function(err, result) {
		if(err) {
			res.redirect('/s3graph');
			return;
		}
		
		obj.data = result;

		res.render('pages/my-searches', obj);
	});
};

exports.my_searches_chart = function(req, res) {
	var hashtag = req.query.hashtag,
		obj = {  
		scripts: ['my-searches-chart', 'RGraph.common.core', 'RGraph.common.dynamic', 'RGraph.line'],
                css : ['my-searches']
        };

	async.waterfall([
		function(cb) {
                        users.isLoggedIn(req.session.token, function(err, b) {
                                if(!b) {
                                        cb("not logged in");
                                } else {

                                        cb(null);
                                }
                        });
		},
		function(cb) {
			users.get(req.session.token, hashtag, cb);
		}
	], function(err, result){
                if(err) {
                        res.redirect('/s3graph');
                        return;
                }	

		obj.data = result;
		res.render('pages/my-searches-chart', obj);
	});
};

exports.facebook = function(req, res) {
	res.render('pages/facebook');
};

exports.facebook_login = function(req, res) {
	var user_id = req.body.id,
		token = req.body.token;

	req.session.token = token;

	async.waterfall([
		function(cb) {
			users.login(user_id, token, cb);
		}
	], function(err, result) {
               if(err) {
                        res.send(JSON.stringify(err));
                        return;
                }
                res.send(JSON.stringify(result));
	});
};

exports.facebook_logout = function(req, res) {
        async.waterfall([
                function(cb) {
                        users.logout(req.session.token, cb);
                }
        ], function(err, result) {
               if(err) {
                        res.send(JSON.stringify(err));
                        return;
                }
		res.render('pages/facebooklogout');
        });
};

exports.save_latest_result = function(req, res) {
	var q = req.body.q,	
		hashtag = req.body.hashtag;

	async.waterfall([
		function(cb){
			users.isLoggedIn(req.session.token, cb);
		},
		function(result, cb) {
			if(result === true) {
				users.get(req.session.token, hashtag, cb);
			}
		},
		function(result, cb) {
			if(result === undefined || typeof result.length === "undefined") {
				result = [];
			}	

			result.push({q : q, dateAdded: new Date()});
			users.set(req.session.token, hashtag, result, cb);
		}
	], function(err, result) {
		res.setHeader('Content-Type', 'application/json');

		if(err) {
			res.send(JSON.stringify(err)); 
		}

		res.send(JSON.stringify(result));	
	});
};

exports.get_twitter_hashtag_data = function(req, res){

	var hashtag = req.body.hashtag;
	
        async.waterfall([
            function(cb) {
		twitter.retrieveTweetsByHashtag(hashtag, cb);
            },
            function(results, cb) {
            	var text = "";
            	if(results.length > 0) {
            		results.map(function(item){
            			if(text !== "") {
            				text += "\n";
            			}

            			text += item.data;
            		});

			cb(null, text);
            	} else {
			 cb({err: 1, code: "HASHTAG_NOT_FOUND"});
		}
            },
            function(text, cb) {
		watson.getData(text, cb);
            },
            function(results, cb) {
            	var r = lib.getDistanceFromJoy(results);

		if(typeof r.q === "undefined" || r.q === null || isNaN(r.q)) {
			cb({err: 1, code: "NULL_RESULTS"});
		} else {
			cb(null, r);
		}
            },
	    function(result, cb) {
		users.isLoggedIn(req.session.token, function(err, b) {
			result.isLoggedIn = b;
			cb(null, result);
		});
	    }
        ], function(err, result) {
		res.setHeader('Content-Type', 'application/json');

		if(err) {
			res.send(JSON.stringify(err));
			return;
		}
		res.send(JSON.stringify(result));		
        });	

};


exports.retrieve_hourly_watson_data = function(req, res){
	var date, col, output;

	if(typeof req.query.date !== "undefined" && parseInt(req.query.date).toString().match(/^\d{8}$/g)) {
		date = req.query.date.toString();
		memcache.get('hourlywatsondata' + date, function(err, data){
			if(err) throw err;

			if(typeof data === "undefined") {
				mongo.run(function(db){
					col = db.collection('watsondata' + date);
					col.find({}, {data : 1, _id: 0}).toArray(function(err, docs){
						if(err) throw err;
						
						output = docs.map(function(item){
							return item.data.reduce(function(last, i){
								var tmp = {};

								if(typeof i === "undefined" || typeof i.emotion_tone !== "object" || i.emotion_tone == null) {
									return last;
								}

								if(typeof i.text !== "undefined") {
									tmp.text = i.text;
									tmp.tones = i.emotion_tone.reduce(function(l, tones){
										
										for(var j in tones) {
											l[j] = tones[j];
										}

										return l;
									}, {});
									
									last.push(tmp);
								}

								return last;	
							}, []);
						});
						
						//memcache.set('hourlywatsondata' + date, JSON.stringify(output), 3600 * 3, function(){});
						res.json(output);
					});			
				});
			} else {
				output = JSON.parse(data);
				res.json(output);
			}
		});
	} else {
		res.json({});
	}
}


exports.store_sentences = function(req, res){
	var msgtype = req.body.msgtype,
		msg = req.body.msg,
		colname,
		date = lib.getDateForNames(0).toString();

	switch(msgtype) {
		case 'twitter':
			colname = "twitterhashtags";
			break;
		default:
			colname = "sentences" + date;
			memcache.get('pendingsentences' + date, function(data){
				var a = [];
				if(typeof data !== "undefined"){
					a = JSON.parse(data);
				}

				a.push(msg);
				memcache.set('pendingsentences' + date, JSON.stringify(a), 3600 * 3, function() {});
			});
			break;
	}
	
	mongo.run(function(db){
		var col = db.collection(colname);
		col.insertOne({data: msg, dateAdded: new Date(), since_id : 0}, function(err, result){
			if(err) { throw err; }
			
			memcache.flash('sentence_added', 'true', function() {
				res.redirect('/api');
			});
		});	
	});
};

exports.store_hashtags = function(req, res){
	res.redirect('pages/api');
};

exports.results = function(req, res) {
	eth.createContract();	

	for(var i = 0; i < 5; i++) {
		eth.getData('17070603');
	}
	res.render('pages/results');
};

exports.save_info_success = function(req, res) {
	var obj = {
		scripts: ['save_info'],
                css: ['save_info']
	};

	memcache.flash('walletidsaved', function(data){
		if(data) {
			obj.hash = data;
			res.render('pages/save_info_success', obj);
		} else {
			res.redirect('/save-info');
		}
	});
};

function checktxn(txnid, cb) {
	mongo.run(function(db){
		var col = db.collection("txnwalletids");
		col.find({txn_id: txnid}).toArray(function(err, data){
			if(err) throw err;

			cb(data);
		});
	});
}

exports.check_txn = function(req, res) {
	if(typeof req.body.txnid === "undefined" || req.body.txnid.toString().replace(/s+/g) === "") {
		res.json({success : 0, code: "INCORRECT TXN"});
		return;
	}

	checktxn(req.body.txnid, function(data){
		if(data === undefined || data === null || data.length === 0) {
			res.json({success : 1});
			return;
		} else {
			res.json({success : 0, code: "TXN EXISTS"});
			return;
		}
	});
};

exports.save_info_save = function(req, res) {
	var hash;

	if(typeof req.body.txnid === "undefined" || typeof req.body.walletid === "undefined"
		|| req.body.txnid.toString().replace(/s+/g) === "" || req.body.walletid.toString().replace(/s+/g) === ""
		|| ["bitcoin", "ether", "wave"].indexOf(req.body.paymenttype) < 0 
		|| !/^[a-zA-Z0-9]{35}/.test(req.body.walletid)) {

		memcache.flash('save_info_error', 'There seems to be an error in inserting your information, please  make sure to properly enter both your transaction id and your Waves address and try again', function() {
			res.redirect('/save-info');
		});

	} else {
		checktxn(req.body.txnid, function(data) {
			if(data === undefined || data === null || data.length === 0) {
				hash = md5(req.body.txnid + mongo.getSalt());
				
				mongo.run(function(db){
					var col = db.collection("txnwalletids");
					col.insertOne({txn_id : req.body.txnid, wallet_id : req.body.walletid, type: req.body.paymenttype,  confirmationid: hash,  datedAdded : new Date() }, function(err, result){
						if(err) throw err;

						memcache.flash('walletidsaved', hash, function() {
							res.redirect('/save-info-success');
						});
					});
				});
			} else {
				memcache.flash('save_info_error', 'There seems to be an error in inserting your information, the transaction id you inserted already exists in our system, please check your transaction number and try again. If there are any further problems please contact us.', function() {
					res.redirect('/save-info');
				});
			}
		});
	}
};

exports.save_info = function(req, res) {
	var obj = {
		scripts: ['save_info'],
		css: ['save_info']
	};

	async.parallel([
		function(cb){
			memcache.flash('save_info_empty', function(data) {
				if(data) {
					obj.save_info_empty = data;
				} 
				cb(null);
			});
		},
		function(cb){
			memcache.flash('walletidsaved', function(data) {
				if(data) { 
					obj.walletidsaved = data;
				}
				cb(null);
			});
		}
	], function(err, result){
		if(err) throw err;

		res.render('pages/save_info', obj);
	});
};

exports.api = function(req, res) {
	var obj = {
		scripts : ['api', 'RGraph.common.core', 'RGraph.common.dynamic', 'RGraph.line'],
		sentences: [],
		pending : [],
		q : []
	}, 
	json, 
	keys = [], 
	date;

	for(var j = -72; j <= 0; j += 24) {
		date = lib.getDateForNames(j).toString().split('');
		date.splice(-2, 2);
		date = date.join("");
		

		for(var i = 0; i < 24; i++) {
			if(i < 10) {
				i = "0" + i.toString();
			} else {
				i = i.toString();
			}
			
			keys.push('watsonsentences' + date.toString() + i);
		}
	}

	keys.push('pendingsentences' + lib.getDateForNames(-2).toString());
	keys.push('pendingsentences' + lib.getDateForNames(-1).toString());
	keys.push('pendingsentences' + lib.getDateForNames(0).toString());


	date = parseInt(lib.getDateForNames(-24));
	date = date.toString().split('').slice(0,6).join('') + "00";

	for(var i = 0 ; i < 24; i++) {
		keys.push('q' + (parseInt(date) + i).toString());
	}

	memcache.get(keys, function(data) {
		if(typeof data !== "undefined") {

			for(var i = 0; i < keys.length; i++) {
				if(typeof data[keys[i]] !== "undefined") {
					if(keys[i].indexOf('pending') > -1) {
						json = JSON.parse(data[keys[i]]);
						obj.pending = obj.pending.concat(json);
					} else if(keys[i].indexOf('q') > -1) {
						obj.q.push(data[keys[i]]);				
					} else {
						json = JSON.parse(data[keys[i]]);
						obj.sentences = obj.sentences.concat(json);
					}
				}				
			}
		}

		if(obj.q.length < 10) {

			obj.q = [];
			mongo.run(function(db) {
				var col = db.collection("distancefromjoy");
				col.find({ date : { '$gte' : date.toString() } }).sort({ date : 1 }).toArray(function(err, docs){
					obj.q = docs.map(function(last, doc){
						return parseFloat(doc.q);
					}, []);
					
					cb(obj);
				});
			});
		} else {
			cb(obj);
		}
	});

	function cb(obj) {
		memcache.flash('sentence_added', function(data) {

			if(data && data === "true") {
				obj.sentence_added = true;
			}
			obj.pending = obj.pending.reverse();
			obj.sentences = obj.sentences.reverse();
			res.render('pages/api', obj);
		});
	}
}

exports.graph = function(req, res) {
	var obj = {
		scripts : [
                        "graph"		
		]
	}, 
	keys = [],
	date = parseInt(lib.getDateForNames(-27));

	date = date.toString().split('').slice(0,6).join('') + "00";

	for(var i = 0 ; i < 24; i++) {
		keys.push('q' + (parseInt(date) + i).toString());
	}

	memcache.get(keys, function(results){

		if(typeof results  === "undefined") {
			results = JSON.parse(results);
			if(results.length > 20) {
				cb(results, obj);
				return;
			}		
		} 

		mongo.run(function(db) {
			var col = db.collection("distancefromjoy");
			col.find({ date : { '$gte' : date.toString() } }).sort({ date : 1 }).toArray(function(err, docs){
				results = docs.reduce(function(last, doc){

					if(typeof doc.q !== "undefined") {
						last[doc.date] = parseFloat(doc.q);
					}

					return last;
				}, {});

				cb(results, obj);
			});
		});
	});

	function cb(results, obj) {
		var a = [], tmp, a2 = [], cx, cy, o = [], c = 0;

		cx = 80;
		cy = 300;
		dx = 50;
		dy = 50;
		a2.push({ x : cx, y: cy});

		for(var i in results) {
			a.push({
				date: i,
				q: results[i]
			});
		}

		for(var i = 1; i < 24; i++) {

			if(cy - dy < 0) {
				dy = -50;
			}

			if(cx + dx > 680) {
				dx = -50;
			}
			
			if(cy - dy > 600) {
				dy = 50;
			}


			cx +=dx;
			cy -= dy;
			
			a2.push({ x : cx, y: cy});
		}
		for(var i = 0; i < a2.length; i++) {
			tmp = Math.sqrt( Math.pow(380 - a2[i].x, 2) + Math.pow( 300 - a2[i].y, 2) );
			
			c = Math.sqrt(Math.pow(300 - tmp, 2) / 2);
			tmp = Math.sqrt(Math.pow(a[i].q * 300, 2) / 2);
			
			if(a2[i].x < 380) {
				a2[i].x -= c;
				a2[i].x2 = a2[i].x + tmp;
			} else if(a2[i].x > 380) {
				a2[i].x += c;
				a2[i].x2 = a2[i].x - tmp;
			} else {
				a2[i].x2 = a2[i].x - tmp;
			}

			if(a2[i].y < 300) {
				a2[i].y -= c;
				a2[i].y2 = a2[i].y + tmp;
			} else if(a2[i].y > 300) {
				a2[i].y += c;
				a2[i].y2 = a2[i].y - tmp;
			} else {
				a2[i].y2 = a2[i].y - tmp;
			}

			a2[i].date = a[i].date.toString();
			a2[i].jsDate = new Date('20' + a2[i].date.slice(0,2) + '-' + a2[i].date.slice(2,4) + '-' + a2[i].date.slice(4,6) + ' ' + a2[i].date.slice(6,8) + ':00:00');
		}
		obj.data = a2;

		res.render('pages/graph', obj);
	}

}
