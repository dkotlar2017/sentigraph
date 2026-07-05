# Sentigraph

Sentigraph analyzes Twitter hashtag sentiment and turns it into a single **joy-distance score** (`q`). The score is derived from IBM Watson Tone Analyzer output and displayed on an interactive gauge so you can quickly read crowd mood around a topic, event, or brand.

The app supports saved searches, social login, an admin dashboard, optional Ethereum record storage, and background jobs that aggregate hourly sentiment data.

## Features

- **Hashtag sentiment index** — Fetch recent tweets for a hashtag, analyze tone with Watson, and compute a weighted joy-distance score
- **Visual gauge** — Google Charts gauge UI with human-readable labels (approval, criticism, protest, etc.)
- **Saved searches** — Logged-in users can save hashtags and review historical results
- **Social authentication** — Facebook and Google sign-in
- **Admin API dashboard** — View pending sentences, processed Watson data, and joy-distance samples
- **OAuth token API** — Issue API tokens via HTTP Basic auth (`/get-token`)
- **JSONP simulator** — Standalone `/gi-sim` endpoint for demo and testing
- **Cron pipeline** — Ingest tweets, send text to Watson, aggregate scores, and optionally write to MongoDB / blockchain
- **Smart contract** — Solidity contract for on-chain storage of joy-distance readings

## How the score works

Watson returns per-sentence emotion tones (anger, disgust, fear, joy, sadness). Sentigraph averages those tones across analyzed text, then computes:

```
q = √( (anger×3)² + (disgust×2.5)² + (fear×1.5)² + (sadness×2)² + joy² )
```

Lower values generally indicate stronger positive crowd sentiment; higher values indicate stronger negative sentiment. The UI maps ranges to labels such as “Excellent Initiative” or “Bad Idea / high crowd disapproval.”

## Tech stack

| Layer | Technology |
|-------|------------|
| Server | Node.js, Express (ES modules) |
| Views | EJS |
| Session store | Memcached (`connect-memcached`) |
| User accounts | PostgreSQL |
| Analytics storage | MongoDB |
| Sentiment analysis | IBM Watson Tone Analyzer |
| Social data | Twitter API v1.1 |
| Auth | Facebook SDK, Google Sign-In, OAuth tokens |
| Blockchain | Web3.js, Solidity (`contracts/Sentigraph.sol`) |
| Charts | Google Charts, RGraph |

## Prerequisites

Before running Sentigraph locally, install and configure:

- **Node.js** 18+ (uses native `fetch` and ES modules)
- **PostgreSQL**
- **MongoDB**
- **Memcached** (default: `127.0.0.1:11211`)
- **Twitter Developer** app (API key + secret)
- **IBM Watson Tone Analyzer** credentials
- **Facebook** and **Google** OAuth apps (for social login)
- **TLS certificates** (production mode reads from `../certs/`)
- **Ethereum node** (optional, for contract features — default `http://127.0.0.1:8545`)

## Installation

```bash
git clone <repository-url>
cd sentigraph
npm install
```

Create a directory for per-user session files (used alongside Memcached):

```bash
mkdir -p ../sentigraph_users
```

## Configuration

Config files live **one directory above** the repository root (sibling to the `sentigraph/` folder). Create the following files there:

### `../db.js` — PostgreSQL

```js
module.exports = {
  username: 'postgres',
  password: 'your-password',
  db: 'sentigraph',
};
```

### `../mongoconfig.js` — MongoDB

```js
exports.config = {
  host: '127.0.0.1',
  port: 27017,
  db: 'sentigraph',
  salt: 'random-salt-string',
};
```

### `../twitterconfig.js` — Twitter API

```js
exports.config = {
  api_key: 'YOUR_TWITTER_API_KEY',
  api_secret: 'YOUR_TWITTER_API_SECRET',
};
```

### `../watsonconfig.js` — IBM Watson

```js
exports.config = {
  username: 'YOUR_WATSON_USERNAME',
  password: 'YOUR_WATSON_PASSWORD',
};
```

### `../googleconfig.js` — Google OAuth

```js
exports.config = {
  web: {
    client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  },
};
```

### `../config.js` — Ethereum contract

```js
exports.config = {
  ethereum: {
    abi: [/* deployed contract ABI */],
    address: '0xYourContractAddress',
  },
};
```

Facebook app credentials are configured in the EJS partials under `views/partials/facebook.ejs`.

For production HTTPS, place certificate files at:

```
../certs/key.pem
../certs/cert.pem
```

## Running the application

### Main web app

Serves the UI, authentication, saved searches, and admin pages.

```bash
npm start
# or
node apps.js
```

| Mode | Port | Notes |
|------|------|-------|
| Production | HTTP `80`, HTTPS `443` | Set `debug = false` in `apps.js` |
| Debug | `8000` | Set `debug = true` in `apps.js` |

### API-only server

Lightweight server for JSONP simulation and OAuth token issuance.

```bash
npm run start:api
# or
node api.js
```

Default port: **8080** (debug mode uses **8000**).

### Add an OAuth API user

```bash
node console/add_oauth_user.js <username> <password>
```

## Background jobs

Cron scripts in `cron/` process tweet ingestion, Watson analysis, and joy-distance aggregation:

| Script | Purpose |
|--------|---------|
| `cron/twitter.js` | Fetch tweets for tracked hashtags and store sentences in MongoDB |
| `cron/watsonRetrieveSentences.js` | Send batched sentences to Watson and store tone data |
| `cron/getSentences.js` | Build Watson sentence cache in Memcached |
| `cron/storeInBlockChain.js` | Aggregate tones, compute `q`, store in MongoDB (and optionally on-chain) |

Run manually, for example:

```bash
node cron/twitter.js
node cron/watsonRetrieveSentences.js
```

These scripts use CommonJS and load ESM models via dynamic `import()`.

## Project structure

```
sentigraph/
├── apps.js              # Main web application entry point
├── api.js               # API-only server entry point
├── controllers/         # Route handlers (ES modules)
├── models/              # Data access: PostgreSQL, MongoDB, Twitter, Watson, Ethereum
├── views/               # EJS templates
├── public/              # Static assets (CSS, JS, images)
├── libs/                # Shared helpers (memcache, joy-distance math)
├── cron/                # Background processing scripts
├── console/             # CLI utilities
├── contracts/           # Solidity smart contract
└── tests/               # Contract / testrpc setup
```

## Key routes

### Web app (`apps.js`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Main sentiment calculator UI |
| POST | `/get-twitter-hashtag-data` | Analyze a hashtag via Twitter + Watson |
| GET | `/login`, `/logout` | Auth pages |
| GET/POST | `/facebook-login`, `/google-login` | Social sign-in |
| GET | `/my-searches` | Saved hashtag list |
| GET | `/my-searches-chart` | Chart for a saved hashtag |
| GET | `/api` | Admin dashboard |
| GET | `/save-info` | Wallet registration flow |

### API server (`api.js`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/gi-sim?callback=...` | JSONP joy-distance simulator |
| GET | `/get-token` | OAuth token issuance (HTTP Basic auth) |

## Smart contract

`contracts/Sentigraph.sol` defines a simple on-chain store for joy-distance values keyed by date bucket:

- `addRecord(uint date, string q)` — Write a score
- `searchRecords(uint date)` — Read a stored score

Deploy the contract, then reference its ABI and address in `../config.js`. The `models/ethereum.mjs` module connects via Web3 to a local JSON-RPC node.

## Development notes

- The root `package.json` sets `"type": "module"`. Entry points and controllers/models use ES module syntax.
- Legacy scripts in `libs/`, `cron/`, `console/`, and `tests/` remain CommonJS via nested `package.json` files.
- Session secrets and Memcached hosts are hard-coded in `apps.js` / `api.js` — change these before deploying to production.
- Watson Tone Analyzer v3 and Twitter API v1.1 are legacy APIs; expect to update integrations for modern platform requirements.

## License

No license file is included in this repository. Add one before publishing or distributing.
