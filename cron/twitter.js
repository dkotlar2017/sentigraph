const async = require('async');
const api_base = 'https://api.twitter.com/';
const lib = require(__dirname + '/../libs/functions.js');
const config = require(__dirname + '/../../twitterconfig.js').config;
const request = require('request');

const date = lib.getDateForNames(0);

(async () => {
  const mongo = (await import('../models/mongo.mjs')).default;

  mongo.run((db) => {
    const col = db.collection('twitterhashtags');

    col.find({}).toArray((err, items) => {
      if (err !== null || items.length < 1) {
        return;
      }

      retrieveTweets(items, mongo);
    });
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

function retrieveTweets(hashtags, mongo) {
  const bearer_token_cred = Buffer.from(`${config.api_key}:${config.api_secret}`).toString('base64');

  request({
    url: `${api_base}oauth2/token?grant_type=client_credentials`,
    method: 'POST',
    headers: {
      Authorization: `Basic ${bearer_token_cred}`,
    },
    json: true,
    body: {},
  }, (error, response, result) => {
    if (typeof result.token_type === 'undefined' || result.token_type !== 'bearer') {
      throw new Error('Could not retrieve token from twitter');
    }

    const bearer_token = result.access_token;

    async.mapLimit(hashtags, 5, (item, cb) => {
      let url = `${api_base}1.1/search/tweets.json?q=${item.data.replace('#', '%23')}`;

      if (item.since_id > 0) {
        url += `&since_id=${item.since_id}`;
      }

      url += '&lang=en&locale=en&result_type=recent&count=100&include_entities=false';

      request({
        url,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${bearer_token}`,
        },
      }, (error2, response2, body) => {
        const r = JSON.parse(body);

        mongo.run((db) => {
          const col = db.collection(`sentences${date}`);

          if (r.statuses.length > 0) {
            col.insertMany(
              r.statuses.map((status) => ({ data: status.text, dateAdded: new Date() })),
              () => cb(null)
            );
          } else {
            cb(null);
          }
        });
      });
    }, (err) => {
      if (err) {
        throw err;
      }

      setTimeout(() => process.exit(), 10000);
    });
  });
}
