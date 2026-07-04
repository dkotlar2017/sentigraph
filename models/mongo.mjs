import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const MongoClient = require('mongodb').MongoClient;
const { config } = require('../../mongoconfig.js');

/**
 * MongoDB connection helper.
 *
 * Queues work until the first connection succeeds, then runs callbacks with a db handle.
 */

let db = null;
const pendingCalls = [];

function connect() {
  if (db !== null) {
    return;
  }

  MongoClient.connect(
    `mongodb://${config.host}:${config.port}/${config.db}`,
    (err, connection) => {
      if (err) {
        throw err;
      }

      db = connection;

      for (const item of pendingCalls) {
        item.f.apply(this, [db, item.cb]);
      }
    }
  );
}

/**
 * Run a callback once a MongoDB connection is available.
 * @param {function} fn - Receives (db, cb)
 * @param {function} cb - Optional second callback argument passed to fn
 */
export function run(fn, cb) {
  connect();

  if (db !== null) {
    fn.apply(this, [db, cb]);
  } else {
    pendingCalls.push({ f: fn, cb });
  }
}

/** Return the configured salt used when hashing wallet confirmation ids. */
export function getSalt() {
  return config.salt;
}

/** Close the active MongoDB connection. */
export function close() {
  db.close();
}

export default { run, getSalt, close };
