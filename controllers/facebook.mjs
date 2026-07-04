import https from 'https';
import users from '../models/users.mjs';

/**
 * Facebook login controller.
 *
 * The client SDK posts a Facebook user id and access token to /facebook-login.
 * We verify the token against the Graph API, map the user to a local account
 * (synthetic email: {facebookId}@facebook.com), and store session state.
 */

/** Renders the standalone Facebook login demo page. */
export function facebook(req, res) {
  res.render('pages/facebook');
}

/**
 * Calls Graph API /me and confirms the token belongs to the claimed user id.
 * @param {string} userId - Facebook user id from the client SDK
 * @param {string} token - OAuth access token from the client SDK
 * @returns {Promise<object>} Parsed Graph API profile
 */
function verifyFacebookToken(userId, token) {
  const url = `https://graph.facebook.com/me?access_token=${encodeURIComponent(token)}`;

  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let body = '';

      response.on('data', (chunk) => {
        body += chunk;
      });

      response.on('end', () => {
        try {
          const profile = JSON.parse(body);

          if (profile.error) {
            reject(profile.error);
            return;
          }

          if (profile.id !== userId) {
            reject({ CODE: 101, message: 'User not identified' });
            return;
          }

          resolve(profile);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Looks up a local user for this Facebook account, creating one on first login.
 * Sets req.session.user_id when a matching row is found or inserted.
 */
function ensureFacebookUser(req, facebookUserId) {
  const email = `${facebookUserId}@facebook.com`;

  return new Promise((resolve, reject) => {
    users.checkEmailExists(email, (err, exists) => {
      if (err) {
        reject(err);
        return;
      }

      if (exists !== false) {
        req.session.user_id = exists;
        resolve({ user_id: facebookUserId, data: {} });
        return;
      }

      // First-time Facebook login: register a placeholder account, then resolve.
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

          resolve({ user_id: facebookUserId, data: {} });
        });
      });
    });
  });
}

/**
 * POST /facebook-login
 * Body: { id, token }
 */
export async function facebook_login(req, res) {
  const facebookUserId = req.body.id;
  const token = req.body.token;

  try {
    await verifyFacebookToken(facebookUserId, token);
    req.session.token = token;

    const result = await ensureFacebookUser(req, facebookUserId);
    res.json(result);
  } catch (err) {
    res.json(err);
  }
}

/**
 * GET /facebook-logout
 * Clears the memcached session entry and renders the SDK logout callback page.
 */
export function facebook_logout(req, res) {
  users.logout(req.session.token, (err) => {
    if (err) {
      res.json(err);
      return;
    }

    res.render('pages/facebooklogout');
  });
}
