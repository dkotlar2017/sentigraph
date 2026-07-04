// api.js — lightweight API-only server entry point
'use strict';
const express = require('express');
const cookieParser = require('cookie-parser');
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
  secret: 'not the keyboard cat that you know',
  resave: false,
  saveUninitialized: true,
  store: new MemcachedStore({
    hosts: ['127.0.0.1:11211'],
    secret: 'keyboard cat strikes again',
  }),
}));

let port = 8080;
const debug = false;

// set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

async function start() {
  const capi = await import('./controllers/api.mjs');

  app.get('/gi-sim', capi.getQ);
  app.get('/get-token', capi.oath_token);

  if (debug) {
    port = 8000;
    console.log('Running in debug mode');
  } else {
    console.log('Running in normal mode');
    const privateKey = fs.readFileSync('../certs/key.pem', 'utf8');
    const certificate = fs.readFileSync('../certs/cert.pem', 'utf8');
    const credentials = { key: privateKey, cert: certificate };
    const httpsServer = https.createServer(credentials, app);
    // httpsServer.listen(443);
  }

  app.listen(port);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
