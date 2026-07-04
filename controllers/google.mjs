import { createRequire } from 'module';
import users from '../models/users.mjs';

const require = createRequire(import.meta.url);
const GoogleAuth = require('google-auth-library');
const { config: gconfig } = require('../../googleconfig.js');

/**
 * Google Sign-In controller.
 *
 * The client posts a Google ID token to /google-login. We verify it with
 * google-auth-library, map the user to a local account by email, and store
 * session state.
 */

/** Renders the standalone Google login page. */
export function google_login(req, res) {
  res.render('pages/google');
}

/**
 * Verifies a Google ID token and returns the decoded payload.
 * @param {object} client - OAuth2 client from google-auth-library
 * @param {string} token - ID token from the client SDK
 * @param {string} clientId - Expected OAuth client id
 * @returns {Promise<object>} Token payload (includes email)
 */
function verifyGoogleIdToken(client, token, clientId) {
  return new Promise((resolve, reject) => {
    client.verifyIdToken(token, clientId, (err, login) => {
      if (err) {
        reject(err);
        return;
      }

      if (typeof login === 'undefined') {
        reject(new Error('Invalid Google ID token'));
        return;
      }

      resolve(login.getPayload());
    });
  });
}

/**
 * Looks up a local user for this Google account, creating one on first login.
 * Sets req.session.user_id when a matching row is found or inserted.
 */
function ensureGoogleUser(req, email) {
  return new Promise((resolve, reject) => {
    users.checkEmailExists(email, (err, exists) => {
      if (err) {
        reject(err);
        return;
      }

      if (exists !== false) {
        req.session.user_id = exists;
        resolve({ email, token: req.session.token });
        return;
      }

      // First-time Google login: register a placeholder account, then resolve.
      users.addUser({ email, password: 'password', verified: '1' }, (addErr) => {
        if (addErr) {
          reject(addErr);
          return;
        }

        users.checkEmailExists(email, (checkErr, newUserId) => {
          if (checkErr) {
            reject(checkErr);
            return;
          }

          if (newUserId !== false) {
            req.session.user_id = newUserId;
          }

          resolve({ email, token: req.session.token });
        });
      });
    });
  });
}

/**
 * POST /google-login
 * Body: { token }
 */
export async function login(req, res) {
  const token = req.body.token;
  const auth = new GoogleAuth();
  const client = new auth.OAuth2(gconfig.web.client_id, '', '');

  try {
    const payload = await verifyGoogleIdToken(client, token, gconfig.web.client_id);
    req.session.token = token;

    const result = await ensureGoogleUser(req, payload.email);
    res.json(result);
  } catch (err) {
    if (err.message === 'Invalid Google ID token') {
      res.redirect('/login');
      return;
    }

    res.json(err);
  }
}
