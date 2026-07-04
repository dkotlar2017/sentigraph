import fs from 'fs';
import md5 from 'md5';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.mjs';
import memcache from '../libs/memcache.js';

/**
 * User account and session model.
 *
 * Persists accounts in PostgreSQL and stores per-user JSON session data in
 * memcache plus on-disk files under sentigraph_users/.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_TTL = 3600 * 12;

function getUserFilePath(userId) {
  return path.join(__dirname, '../../sentigraph_users', `${userId}.json`);
}

function memcacheSet(key, value, ttl) {
  return new Promise((resolve) => {
    memcache.set(key, value, ttl, resolve);
  });
}

/** Look up a full user row by email address. */
export function getUserByEmail(email, cb) {
  db.query('SELECT * FROM users WHERE email = ?', [email], cb);
}

/** Insert a new user record; hashes the password before saving. */
export function addUser(fields, cb) {
  const record = { ...fields, password: md5(fields.password) };
  const columns = Object.keys(record);
  const sql = `INSERT INTO users (${columns.join(',')}) VALUES (?, ?, ?)`;

  db.query(sql, columns.map((key) => record[key]), cb);
}

/** Return the user id when the email exists, otherwise false. */
export function checkEmailExists(email, cb) {
  db.query('SELECT id FROM users WHERE email = ?', [email], (err, results) => {
    if (err) {
      cb(err);
      return;
    }

    if (results.length === 0) {
      cb(null, false);
      return;
    }

    cb(null, results[0].id);
  });
}

/** Load or initialize a user file and refresh the memcached session. */
export function login(userId, token, callback) {
  const userPath = getUserFilePath(userId);

  const loadUser = () =>
    new Promise((resolve, reject) => {
      if (!fs.existsSync(userPath)) {
        resolve({ user_id: userId, data: {} });
        return;
      }

      fs.readFile(userPath, (err, data) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(JSON.parse(data));
      });
    });

  loadUser()
    .then((data) => update(token, data, callback))
    .catch((err) => callback(err));
}

/** Clear the memcached session entry for a token. */
export function logout(token, cb) {
  memcache.set(`_SESSION_${token}`, {}, 1, () => {
    if (cb) {
      cb(null);
    }
  });
}

/** Report whether a session token is present in memcache. */
export function isLoggedIn(token, cb) {
  memcache.get(`_SESSION_${token}`, (data) => {
    cb(null, data !== null && data !== undefined && data !== '');
  });
}

/** Set a saved-search value on the current session. */
export function set(token, key, value, callback) {
  memcache.get(`_SESSION_${token}`, (data) => {
    const session = JSON.parse(data);
    session.data[key] = value;

    memcache.set(`_SESSION_${token}`, JSON.stringify(session), SESSION_TTL, () => {
      update(token, session, callback);
    });
  });
}

/** Return the user id stored in the session payload. */
export function getId(token, callback) {
  memcache.get(`_SESSION_${token}`, (data) => {
    callback(null, JSON.parse(data).user_id);
  });
}

/** Return all saved data for the current session. */
export function getData(token, callback) {
  memcache.get(`_SESSION_${token}`, (data) => {
    callback(null, JSON.parse(data).data);
  });
}

/** Return one saved-search entry from the session payload. */
export function get(token, key, callback) {
  memcache.get(`_SESSION_${token}`, (data) => {
    callback(null, JSON.parse(data).data[key]);
  });
}

/** Persist session data to memcache and the user's JSON file. */
export function update(token, data, callback) {
  const userPath = getUserFilePath(data.user_id);

  Promise.all([
    memcacheSet(`_SESSION_${token}`, JSON.stringify(data), SESSION_TTL),
    new Promise((resolve, reject) => {
      fs.writeFile(userPath, JSON.stringify(data), (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(data);
      });
    }),
  ])
    .then(([cachedData]) => callback(null, cachedData))
    .catch((err) => callback(err));
}

export default {
  getUserByEmail,
  addUser,
  checkEmailExists,
  login,
  logout,
  isLoggedIn,
  set,
  getId,
  getData,
  get,
  update,
};
