import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { config } = require('../../twitterconfig.js');

/**
 * Twitter API client for hashtag search used in sentiment analysis.
 */

const API_BASE = 'https://api.twitter.com/';

/** Obtain a bearer token via OAuth2 client credentials. */
async function getBearerToken() {
  const credentials = Buffer.from(`${config.api_key}:${config.api_secret}`).toString('base64');

  const response = await fetch(`${API_BASE}oauth2/token?grant_type=client_credentials`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  const result = await response.json();

  if (typeof result.token_type === 'undefined' || result.token_type !== 'bearer') {
    throw new Error('Could not retrieve token from twitter');
  }

  return result.access_token;
}

/** Search recent English tweets for a hashtag. */
async function searchTweets(hashtag, bearerToken) {
  const query = hashtag.replace('#', '%23');
  const url = `${API_BASE}1.1/search/tweets.json?q=${query}&lang=en&locale=en&result_type=recent&count=100&include_entities=false`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  const body = await response.json();
  const statuses = body?.statuses ?? [];

  try {
    return statuses.map((status) => ({
      data: status.text,
      created_at: status.created_at,
      dateAdded: new Date(),
    }));
  } catch (err) {
    return [];
  }
}

/**
 * Retrieve recent tweets for a hashtag.
 * @param {string} hashtag - Hashtag query (with or without leading #)
 * @param {function} cb - Callback (err, tweets)
 */
export function retrieveTweetsByHashtag(hashtag, cb) {
  getBearerToken()
    .then((token) => searchTweets(hashtag, token))
    .then((tweets) => cb(null, tweets))
    .catch((err) => cb(err));
}

export default { retrieveTweetsByHashtag };
