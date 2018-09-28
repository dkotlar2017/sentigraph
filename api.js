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

const capi = require('./controllers/api');

const port = 8080;
const debug = false;


// set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views',__dirname + '/views');

// use res.render to load up an ejs view file
app.get('/gi-sim', capi.getQ);
app.get('/get-token', capi.oath_token);

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
//    httpsServer.listen(443);
}

app.listen(port);


