import express from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import createMemcachedStore from 'connect-memcached';
import * as facebook from './controllers/facebook.mjs';
import * as google from './controllers/google.mjs';
import * as index from './controllers/index.mjs';
import * as capi from './controllers/api.mjs';

/**
 * Main Sentigraph web application entry point.
 *
 * Serves the Twitter sentiment UI, auth flows, saved searches, and admin pages.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MemcachedStore = createMemcachedStore(session);

const app = express();
const debug = false;
let port = 80;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
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

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/** Register all HTTP routes for the main application. */
function registerRoutes() {
  app.get('/', index.twitter2);
  app.get('/api', index.api);
  app.get('/s3graph', index.twitter);
  app.get('/s3graph2', index.twitter2);
  app.get('/googlelogin', google.google_login);
  app.post('/google-login', google.login);
  app.post('/get-twitter-hashtag-data', index.get_twitter_hashtag_data);
  // app.post('/store-sentences', index.store_sentences);
  // app.post('/store-hashtags', index.store_hashtags);
  // app.get('/retrieve-hourly-watson-data', index.retrieve_hourly_watson_data);
  app.get('/save-info', index.save_info);
  app.post('/save-info-save', index.save_info_save);
  app.get('/save-info-success', index.save_info_success);
  // app.post('/check_txn', index.check_txn);
  app.get('/facebook', facebook.facebook);
  app.post('/facebook-login', facebook.facebook_login);
  app.get('/facebook-logout', facebook.facebook_logout);
  app.post('/save-latest-result', index.save_latest_result);
  app.get('/my-searches', index.my_searches);
  app.get('/my-searches-chart', index.my_searches_chart);
  app.get('/login', index.login);
  app.get('/logout', index.logout);
  app.get('/gi-sim', capi.getQ);
}

/** Start the HTTPS listener used in production mode. */
function startHttpsServer() {
  const certDir = path.join(__dirname, '../certs');
  const privateKey = fs.readFileSync(path.join(certDir, 'key.pem'), 'utf8');
  const certificate = fs.readFileSync(path.join(certDir, 'cert.pem'), 'utf8');

  https.createServer({ key: privateKey, cert: certificate }, app).listen(443);
}

/** Boot the HTTP/HTTPS servers. */
function start() {
  registerRoutes();

  if (debug) {
    port = 8000;
    console.log('Running in debug mode');
  } else {
    console.log('Running in normal mode');
    startHttpsServer();
  }

  app.listen(port);
}

start();
