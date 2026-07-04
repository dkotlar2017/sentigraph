import express from 'express';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import createMemcachedStore from 'connect-memcached';
import * as capi from './controllers/api.mjs';

/**
 * Lightweight API-only server entry point.
 *
 * Exposes JSONP joy-distance simulation and OAuth token issuance routes.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MemcachedStore = createMemcachedStore(session);

const app = express();
const debug = false;
let port = 8080;

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

/** Register public API routes. */
function registerRoutes() {
  app.get('/gi-sim', capi.getQ);
  app.get('/get-token', capi.oath_token);
}

/** Start the HTTPS listener used in production mode. */
function startHttpsServer() {
  const certDir = path.join(__dirname, '../certs');
  const privateKey = fs.readFileSync(path.join(certDir, 'key.pem'), 'utf8');
  const certificate = fs.readFileSync(path.join(certDir, 'cert.pem'), 'utf8');

  // https.createServer({ key: privateKey, cert: certificate }, app).listen(443);
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
