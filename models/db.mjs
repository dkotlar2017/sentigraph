import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const config = require('../../db.js');
const { DBWrapper } = require('node-dbi');

/**
 * PostgreSQL query wrapper used by user and OAuth models.
 */

const dbWrapper = new DBWrapper('pg', {
  host: '127.0.0.1',
  user: config.username,
  password: config.password,
  database: config.db,
});

dbWrapper.connect();

/** Run a parameterized SQL query; callback receives (err, rows). */
export function query(...args) {
  dbWrapper.fetchAll.apply(dbWrapper, args);
}

export default { query };
