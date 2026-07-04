import md5 from 'md5';
import sha256 from 'sha256';
import db from '../models/db.mjs';

/**
 * Public API controller.
 *
 * Exposes a JSONP joy-distance simulator and OAuth token issuance via HTTP Basic auth.
 */

/** Ordered score thresholds for the gi-sim endpoint. */
const SCORE_THRESHOLDS = [
  [0.5, 'Excellent Initiative/High crowd approval'],
  [0.7, 'Very Good Initiative/moderate crowd interest'],
  [0.9, 'Fair initiative/Event/low crowd interest'],
  [1.5, 'Manageable initiative/ crowd accommodation'],
  [2.0, 'Struggling Initiative/ moderate crowd criticism'],
  [10.0, 'Bad Idea / high crowd disapproval'],
];

/** Promisify the pg query wrapper. */
function dbQuery(sql, params = null) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(result);
    });
  });
}

/** Generate a random 64-character OAuth token. */
function randomPassword() {
  const alphabet = 'abcdefghijklmnopqrstuwxyzABCDEFGHIJKLMNOPQRSTUWXYZ0123456789';
  let pass = '';

  for (let i = 0; i < 64; i++) {
    pass += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return pass;
}

/** Format a token expiry timestamp 30 days from the given date. */
function formatOAuthExpiry(fromDate) {
  const expires = new Date(fromDate);
  expires.setDate(expires.getDate() + 30);

  const year = expires.getFullYear();
  const month = String(expires.getMonth() + 1).padStart(2, '0');
  const day = String(expires.getDate()).padStart(2, '0');

  return `${year}-${month}-${day} 01:00:00`;
}

/** Send a 401 response for failed OAuth Basic authentication. */
function sendUnauthorized(res, message) {
  res.statusCode = 401;
  res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
  res.end(JSON.stringify({ Error: { code: 11, message } }));
}

/**
 * GET /gi-sim
 * JSONP endpoint that returns a random joy-distance score and label.
 */
export function getQ(req, res) {
  const q = Math.round(Math.random() * 250) / 100;
  let message;

  for (const [threshold, label] of SCORE_THRESHOLDS) {
    if (threshold > q) {
      message = label;
      break;
    }
  }

  const result = { q, message };

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.send(`${req.query.callback}(${JSON.stringify(result)})`);
}

/**
 * GET /get-token
 * Issues an OAuth token after validating HTTP Basic credentials.
 */
export async function oath_token(req, res) {
  const auth = req.headers.authorization;

  res.setHeader('Content-Type', 'application/json');

  if (!auth) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
    res.end(JSON.stringify({ Error: { code: 1, message: 'No authentication header.' } }));
    return;
  }

  const base64Credentials = auth.split(' ')[1];
  const plainAuth = Buffer.from(base64Credentials, 'base64').toString();
  const separatorIndex = plainAuth.indexOf(':');
  const username = plainAuth.slice(0, separatorIndex);
  const password = plainAuth.slice(separatorIndex + 1);
  const token = randomPassword();
  const expires = formatOAuthExpiry(new Date());

  try {
    const users = await dbQuery('SELECT * FROM oauth_users WHERE username=?', [username]);

    if (!users[0] || typeof users[0].password === 'undefined') {
      sendUnauthorized(res, 'User does not exist.');
      return;
    }

    if (users[0].password !== md5(sha256(password))) {
      sendUnauthorized(res, 'Username/password does not match.');
      return;
    }

    await dbQuery('DELETE FROM oauth_tokens WHERE oauth_users_id=?', [users[0].id]);
    await dbQuery(
      'INSERT INTO oauth_tokens (oauth_users_id, token, expire_date) VALUES (?, ?, ?)',
      [users[0].id, token, expires]
    );

    res.statusCode = 200;
    res.end(JSON.stringify({ success: 1, token }));
  } catch (err) {
    sendUnauthorized(res, 'User does not exist.');
  }
}
