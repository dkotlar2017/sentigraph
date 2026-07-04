// apps.js
'use strict';
const express = require('express');
const cookieParser   = require('cookie-parser');
const bodyParser = require('body-parser');
const fs = require('fs');
const https = require('https');
const session = require('express-session');
const MemcachedStore = require('connect-memcached')(session);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());

app.use(session({
	secret  : 'not the keyboard cat that you know', 
	resave: false,
	saveUninitialized: true,
	store   : new MemcachedStore({
		hosts: ['127.0.0.1:11211'],
		secret: 'keyboard cat strikes again'
	})
}));

let port = 80;
const debug = false;

// set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

async function start() {
	const [facebook, google, index, capi] = await Promise.all([
		import('./controllers/facebook.mjs'),
		import('./controllers/google.mjs'),
		import('./controllers/index.mjs'),
		import('./controllers/api.mjs'),
	]);

	// use res.render to load up an ejs view file
	app.get('/', index.twitter2);
	app.get('/api', index.api);
	app.get('/s3graph', index.twitter);
	app.get('/s3graph2', index.twitter2);
	app.get('/googlelogin', google.google_login);
	app.post('/google-login', google.login);
	app.post('/get-twitter-hashtag-data', index.get_twitter_hashtag_data);
	//app.post('/store-sentences', index.store_sentences);
	//app.post('/store-hashtags', index.store_hashtags);
	//app.get('/retrieve-hourly-watson-data', index.retrieve_hourly_watson_data);
	app.get('/save-info', index.save_info);
	app.post('/save-info-save',index.save_info_save);
	app.get('/save-info-success', index.save_info_success);
	//app.post('/check_txn',index.check_txn);
	app.get('/facebook', facebook.facebook);
	app.post('/facebook-login', facebook.facebook_login);
	app.get('/facebook-logout', facebook.facebook_logout);
	app.post('/save-latest-result', index.save_latest_result);
	app.get('/my-searches', index.my_searches);
	app.get('/my-searches-chart', index.my_searches_chart);
	app.get('/login', index.login);
	app.get('/logout', index.logout);
	app.get('/gi-sim', capi.getQ);

	if(debug){
		port = 8000;
		console.log("Running in debug mode");
	}
	else
	{
		console.log("Running in normal mode");
		var privateKey  = fs.readFileSync('../certs/key.pem', 'utf8');
		var certificate = fs.readFileSync('../certs/cert.pem', 'utf8');
		var credentials = {key: privateKey, cert: certificate};
		var httpsServer = https.createServer(credentials, app);
		httpsServer.listen(443);
	}

	app.listen(port);
}

start().catch((err) => {
	console.error(err);
	process.exit(1);
});


