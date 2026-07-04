const md5 = require('md5');
const sha256 = require('sha256');

if (typeof process.argv[2] === 'undefined' || typeof process.argv[3] === 'undefined') {
  console.log('Please use a username and password');
  process.exit(1);
}

(async () => {
  const db = (await import('../models/db.mjs')).default;
  const username = process.argv[2];
  const password = md5(sha256(process.argv[3]));

  db.query(
    'INSERT into oauth_users (username, password) VALUES (?, ?)',
    [username, password],
    (err) => {
      if (err) {
        console.log(`Error:${err}`);
      } else {
        console.log('good');
      }

      process.exit(1);
    }
  );
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
