import md5 from 'md5';
import eth from '../models/ethereum.mjs';
import watson from '../models/watson.mjs';
import mongo from '../models/mongo.mjs';
import users from '../models/users.mjs';
import lib from '../libs/functions.js';
import memcache from '../libs/memcache.js';
import twitterModel from '../models/twitter.mjs';

/**
 * Main application controller.
 *
 * Handles page rendering, Twitter/Watson sentiment queries, saved searches,
 * wallet registration, and admin API views.
 */

/** Promisify a callback-last function. */
function callbackToPromise(fn, ...args) {
  return new Promise((resolve, reject) => {
    fn(...args, (err, result) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(result);
    });
  });
}

/** Run work against a MongoDB connection. */
function withMongo(work) {
  return new Promise((resolve, reject) => {
    mongo.run((db) => {
      Promise.resolve(work(db)).then(resolve, reject);
    });
  });
}

/** Read a value from memcache (single-callback API). */
function memcacheGet(key) {
  return new Promise((resolve) => {
    memcache.get(key, resolve);
  });
}

/** Read and clear a one-shot flash value from memcache. */
function memcacheFlash(key) {
  return new Promise((resolve) => {
    memcache.flash(key, resolve);
  });
}

/** Set a flash value and wait for memcache to acknowledge it. */
function memcacheFlashSet(key, value) {
  return new Promise((resolve) => {
    memcache.flash(key, value, () => resolve());
  });
}

/** Returns whether the session token is logged in. */
function isSessionLoggedIn(token) {
  return callbackToPromise(users.isLoggedIn, token);
}

/** Checks login status; rejects with 'not logged in' when absent. */
async function requireLoggedIn(token) {
  const loggedIn = await isSessionLoggedIn(token);

  if (!loggedIn) {
    throw new Error('not logged in');
  }
}

/** Looks up wallet transaction records by txn id. */
function checkTxn(txnid) {
  return withMongo((db) =>
    new Promise((resolve, reject) => {
      db.collection('txnwalletids').find({ txn_id: txnid }).toArray((err, data) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(data);
      });
    })
  );
}

/** Renders the home page. */
export function main(req, res) {
  res.render('pages/index');
}

/** GET /login */
export function login(req, res) {
  res.render('pages/login', {
    scripts: ['https://apis.google.com/js/platform.js'],
    css: ['login'],
  });
}

/** GET /logout */
export function logout(req, res) {
  res.render('pages/logout', {
    scripts: [
      'https://apis.google.com/js/platform.js',
      'https://connect.facebook.net/en_US/sdk.js',
    ],
  });
}

/** GET /s3graph — legacy Twitter sentiment chart page. */
export function twitter(req, res) {
  res.render('pages/twitter', {
    scripts: ['twitter', 'https://www.gstatic.com/charts/loader.js'],
    css: ['twitter'],
  });
}

/** GET / and /s3graph2 — primary Twitter sentiment UI. */
export async function twitter2(req, res) {
  const viewData = {
    scripts: ['twitter2'],
    css: ['login', 'twitter2'],
  };

  try {
    await requireLoggedIn(req.session.token);
  } catch (err) {
    // Login redirect is intentionally disabled; still render the page.
  }

  res.render('pages/twitter2', viewData);
}

/** GET /my-searches — saved hashtag searches for the current user. */
export async function my_searches(req, res) {
  const viewData = {
    scripts: ['my-searches'],
    css: ['twitter', 'my-searches'],
    data: undefined,
  };

  try {
    await requireLoggedIn(req.session.token);
    viewData.data = await callbackToPromise(users.getData, req.session.token);
  } catch (err) {
    // Login redirect is intentionally disabled; still render the page.
  }

  res.render('pages/my-searches', viewData);
}

/** GET /my-searches-chart — chart view for a single saved hashtag. */
export async function my_searches_chart(req, res) {
  const hashtag = req.query.hashtag;
  const viewData = {
    scripts: ['my-searches-chart', 'RGraph.common.core', 'RGraph.common.dynamic', 'RGraph.line'],
    css: ['my-searches'],
    data: undefined,
  };

  try {
    await requireLoggedIn(req.session.token);
    viewData.data = await callbackToPromise(users.get, req.session.token, hashtag);
  } catch (err) {
    // Login redirect is intentionally disabled; still render the page.
  }

  res.render('pages/my-searches-chart', viewData);
}

/** Legacy Facebook demo page (superseded by facebook.mjs routes). */
export function facebook(req, res) {
  res.render('pages/facebook');
}

/** Legacy Facebook login handler (superseded by facebook.mjs routes). */
export async function facebook_login(req, res) {
  const userId = req.body.id;
  const token = req.body.token;

  req.session.token = token;

  try {
    const result = await callbackToPromise(users.login, userId, token);
    res.json(result);
  } catch (err) {
    res.json(err);
  }
}

/** Legacy Facebook logout handler (superseded by facebook.mjs routes). */
export async function facebook_logout(req, res) {
  try {
    await callbackToPromise(users.logout, req.session.token);
    res.render('pages/facebooklogout');
  } catch (err) {
    res.json(err);
  }
}

/** POST /save-latest-result — append a Watson query result to saved searches. */
export async function save_latest_result(req, res) {
  const { q, hashtag } = req.body;

  res.setHeader('Content-Type', 'application/json');

  try {
    const loggedIn = await isSessionLoggedIn(req.session.token);

    if (loggedIn !== true) {
      return;
    }

    let saved = await callbackToPromise(users.get, req.session.token, hashtag);

    if (saved === undefined || typeof saved.length === 'undefined') {
      saved = [];
    }

    saved.push({ q, dateAdded: new Date() });

    const result = await callbackToPromise(users.set, req.session.token, hashtag, saved);
    res.json(result);
  } catch (err) {
    res.json(err);
  }
}

/** POST /get-twitter-hashtag-data — fetch tweets, analyze with Watson, return joy distance. */
export async function get_twitter_hashtag_data(req, res) {
  const hashtag = req.body.hashtag;

  res.setHeader('Content-Type', 'application/json');

  try {
    const tweets = await callbackToPromise(twitterModel.retrieveTweetsByHashtag, hashtag);

    if (tweets.length === 0) {
      res.json({ err: 1, code: 'HASHTAG_NOT_FOUND' });
      return;
    }

    let text = '';

    for (const item of tweets) {
      if (text !== '') {
        text += '\n';
      }

      text += item.data;
    }

    const watsonResults = await callbackToPromise(watson.getData, text);
    const result = lib.getDistanceFromJoy(watsonResults);

    if (typeof result.q === 'undefined' || result.q === null || Number.isNaN(result.q)) {
      res.json({ err: 1, code: 'NULL_RESULTS' });
      return;
    }

    result.isLoggedIn = await isSessionLoggedIn(req.session.token);
    res.json(result);
  } catch (err) {
    res.json(err);
  }
}

/** GET /retrieve-hourly-watson-data — cached hourly Watson tone data from MongoDB. */
export async function retrieve_hourly_watson_data(req, res) {
  if (typeof req.query.date === 'undefined' || !parseInt(req.query.date, 10).toString().match(/^\d{8}$/)) {
    res.json({});
    return;
  }

  const date = req.query.date.toString();
  const cacheKey = `hourlywatsondata${date}`;
  const cached = await memcacheGet(cacheKey);

  if (typeof cached !== 'undefined') {
    res.json(JSON.parse(cached));
    return;
  }

  const output = await withMongo((db) =>
    new Promise((resolve, reject) => {
      db.collection(`watsondata${date}`).find({}, { data: 1, _id: 0 }).toArray((err, docs) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(
          docs.map((item) =>
            item.data.reduce((last, entry) => {
              if (
                typeof entry === 'undefined'
                || typeof entry.emotion_tone !== 'object'
                || entry.emotion_tone == null
              ) {
                return last;
              }

              if (typeof entry.text !== 'undefined') {
                const tmp = {
                  text: entry.text,
                  tones: entry.emotion_tone.reduce((toneMap, tones) => {
                    for (const key in tones) {
                      toneMap[key] = tones[key];
                    }
                    return toneMap;
                  }, {}),
                };

                last.push(tmp);
              }

              return last;
            }, [])
          )
        );
      });
    })
  );

  res.json(output);
}

/** POST /store-sentences — persist incoming text or Twitter hashtag data. */
export function store_sentences(req, res) {
  const msgtype = req.body.msgtype;
  const msg = req.body.msg;
  let colname;
  const date = lib.getDateForNames(0).toString();

  switch (msgtype) {
    case 'twitter':
      colname = 'twitterhashtags';
      break;
    default:
      colname = `sentences${date}`;
      memcache.get(`pendingsentences${date}`, (data) => {
        const pending = typeof data !== 'undefined' ? JSON.parse(data) : [];
        pending.push(msg);
        memcache.set(`pendingsentences${date}`, JSON.stringify(pending), 3600 * 3, () => {});
      });
      break;
  }

  mongo.run((db) => {
    db.collection(colname).insertOne(
      { data: msg, dateAdded: new Date(), since_id: 0 },
      (err) => {
        if (err) {
          throw err;
        }

        memcache.flash('sentence_added', 'true', () => {
          res.redirect('/api');
        });
      }
    );
  });
}

/** POST /store-hashtags */
export function store_hashtags(req, res) {
  res.redirect('pages/api');
}

/** Demo route for Ethereum contract reads. */
export function results(req, res) {
  eth.createContract();

  for (let i = 0; i < 5; i++) {
    eth.getData('17070603');
  }

  res.render('pages/results');
}

/** GET /save-info-success — confirmation page after wallet registration. */
export async function save_info_success(req, res) {
  const viewData = {
    scripts: ['save_info'],
    css: ['save_info'],
  };

  const hash = await memcacheFlash('walletidsaved');

  if (hash) {
    viewData.hash = hash;
    res.render('pages/save_info_success', viewData);
    return;
  }

  res.redirect('/save-info');
}

/** POST /check_txn — verify a payment transaction id is not already registered. */
export async function check_txn(req, res) {
  if (
    typeof req.body.txnid === 'undefined'
    || req.body.txnid.toString().replace(/\s+/g, '') === ''
  ) {
    res.json({ success: 0, code: 'INCORRECT TXN' });
    return;
  }

  const data = await checkTxn(req.body.txnid);

  if (data === undefined || data === null || data.length === 0) {
    res.json({ success: 1 });
    return;
  }

  res.json({ success: 0, code: 'TXN EXISTS' });
}

/** POST /save-info-save — store wallet details linked to a payment transaction. */
export async function save_info_save(req, res) {
  const { txnid, walletid, paymenttype } = req.body;
  const invalidInput =
    typeof txnid === 'undefined'
    || typeof walletid === 'undefined'
    || txnid.toString().replace(/\s+/g, '') === ''
    || walletid.toString().replace(/\s+/g, '') === ''
    || ['bitcoin', 'ether', 'wave'].indexOf(paymenttype) < 0
    || !/^[a-zA-Z0-9]{35}/.test(walletid);

  if (invalidInput) {
    await memcacheFlashSet(
      'save_info_error',
      'There seems to be an error in inserting your information, please  make sure to properly enter both your transaction id and your Waves address and try again'
    );
    res.redirect('/save-info');
    return;
  }

  const existing = await checkTxn(txnid);

  if (existing === undefined || existing === null || existing.length === 0) {
    const hash = md5(txnid + mongo.getSalt());

    await withMongo((db) =>
      new Promise((resolve, reject) => {
        db.collection('txnwalletids').insertOne(
          {
            txn_id: txnid,
            wallet_id: walletid,
            type: paymenttype,
            confirmationid: hash,
            datedAdded: new Date(),
          },
          (err, result) => {
            if (err) {
              reject(err);
              return;
            }

            resolve(result);
          }
        );
      })
    );

    await memcacheFlashSet('walletidsaved', hash);
    res.redirect('/save-info-success');
    return;
  }

  await memcacheFlashSet(
    'save_info_error',
    'There seems to be an error in inserting your information, the transaction id you inserted already exists in our system, please check your transaction number and try again. If there are any further problems please contact us.'
  );
  res.redirect('/save-info');
}

/** GET /save-info — wallet registration form with flash messages. */
export async function save_info(req, res) {
  const viewData = {
    scripts: ['save_info'],
    css: ['save_info'],
  };

  const [emptyMessage, savedWallet] = await Promise.all([
    memcacheFlash('save_info_empty'),
    memcacheFlash('walletidsaved'),
  ]);

  if (emptyMessage) {
    viewData.save_info_empty = emptyMessage;
  }

  if (savedWallet) {
    viewData.walletidsaved = savedWallet;
  }

  res.render('pages/save_info', viewData);
}

/** Build memcache keys for the admin API dashboard. */
function buildApiCacheKeys() {
  const keys = [];

  for (let dayOffset = -72; dayOffset <= 0; dayOffset += 24) {
    let date = lib.getDateForNames(dayOffset).toString().split('');
    date.splice(-2, 2);
    date = date.join('');

    for (let hour = 0; hour < 24; hour++) {
      const hourLabel = hour < 10 ? `0${hour}` : hour.toString();
      keys.push(`watsonsentences${date}${hourLabel}`);
    }
  }

  keys.push(`pendingsentences${lib.getDateForNames(-2).toString()}`);
  keys.push(`pendingsentences${lib.getDateForNames(-1).toString()}`);
  keys.push(`pendingsentences${lib.getDateForNames(0).toString()}`);

  let qDate = parseInt(lib.getDateForNames(-24), 10);
  qDate = `${qDate.toString().split('').slice(0, 6).join('')}00`;

  for (let hour = 0; hour < 24; hour++) {
    keys.push(`q${(parseInt(qDate, 10) + hour).toString()}`);
  }

  return { keys, qDate };
}

/** GET /api — admin dashboard of pending/processed sentences and joy-distance samples. */
export function api(req, res) {
  const viewData = {
    scripts: ['api', 'RGraph.common.core', 'RGraph.common.dynamic', 'RGraph.line'],
    sentences: [],
    pending: [],
    q: [],
  };

  const { keys, qDate } = buildApiCacheKeys();

  memcache.get(keys, (data) => {
    if (typeof data !== 'undefined') {
      for (let i = 0; i < keys.length; i++) {
        if (typeof data[keys[i]] === 'undefined') {
          continue;
        }

        if (keys[i].indexOf('pending') > -1) {
          viewData.pending = viewData.pending.concat(JSON.parse(data[keys[i]]));
        } else if (keys[i].indexOf('q') > -1) {
          viewData.q.push(data[keys[i]]);
        } else {
          viewData.sentences = viewData.sentences.concat(JSON.parse(data[keys[i]]));
        }
      }
    }

    if (viewData.q.length < 10) {
      viewData.q = [];

      mongo.run((db) => {
        db.collection('distancefromjoy')
          .find({ date: { $gte: qDate.toString() } })
          .sort({ date: 1 })
          .toArray((err, docs) => {
            if (err) {
              throw err;
            }

            viewData.q = docs.map((doc) => parseFloat(doc.q));
            renderApi(viewData);
          });
      });
    } else {
      renderApi(viewData);
    }
  });

  function renderApi(obj) {
    memcache.flash('sentence_added', (flashData) => {
      if (flashData && flashData === 'true') {
        obj.sentence_added = true;
      }

      obj.pending = obj.pending.reverse();
      obj.sentences = obj.sentences.reverse();
      res.render('pages/api', obj);
    });
  }
}

/** GET /graph — joy-distance graph with hand-tuned layout coordinates. */
export function graph(req, res) {
  const viewData = {
    scripts: ['graph'],
  };

  const keys = [];
  let date = parseInt(lib.getDateForNames(-27), 10);
  date = `${date.toString().split('').slice(0, 6).join('')}00`;

  for (let hour = 0; hour < 24; hour++) {
    keys.push(`q${(parseInt(date, 10) + hour).toString()}`);
  }

  memcache.get(keys, () => {
    mongo.run((db) => {
      db.collection('distancefromjoy')
        .find({ date: { $gte: date.toString() } })
        .sort({ date: 1 })
        .toArray((err, docs) => {
          if (err) {
            throw err;
          }

          const results = docs.reduce((last, doc) => {
            if (typeof doc.q !== 'undefined') {
              last[doc.date] = parseFloat(doc.q);
            }

            return last;
          }, {});

          renderGraph(results, viewData);
        });
    });
  });

  function renderGraph(results, obj) {
    const points = [];
    const layout = [];
    let cx = 80;
    let cy = 300;
    let dx = 50;
    let dy = 50;

    layout.push({ x: cx, y: cy });

    for (const dateKey in results) {
      points.push({
        date: dateKey,
        q: results[dateKey],
      });
    }

    for (let i = 1; i < 24; i++) {
      if (cy - dy < 0) {
        dy = -50;
      }

      if (cx + dx > 680) {
        dx = -50;
      }

      if (cy - dy > 600) {
        dy = 50;
      }

      cx += dx;
      cy -= dy;
      layout.push({ x: cx, y: cy });
    }

    for (let i = 0; i < layout.length; i++) {
      let offset = Math.sqrt((380 - layout[i].x) ** 2 + (300 - layout[i].y) ** 2);
      let c = Math.sqrt((300 - offset) ** 2 / 2);
      offset = Math.sqrt((points[i].q * 300) ** 2 / 2);

      if (layout[i].x < 380) {
        layout[i].x -= c;
        layout[i].x2 = layout[i].x + offset;
      } else if (layout[i].x > 380) {
        layout[i].x += c;
        layout[i].x2 = layout[i].x - offset;
      } else {
        layout[i].x2 = layout[i].x - offset;
      }

      if (layout[i].y < 300) {
        layout[i].y -= c;
        layout[i].y2 = layout[i].y + offset;
      } else if (layout[i].y > 300) {
        layout[i].y += c;
        layout[i].y2 = layout[i].y - offset;
      } else {
        layout[i].y2 = layout[i].y - offset;
      }

      layout[i].date = points[i].date.toString();
      layout[i].jsDate = new Date(
        `20${layout[i].date.slice(0, 2)}-${layout[i].date.slice(2, 4)}-${layout[i].date.slice(4, 6)} ${layout[i].date.slice(6, 8)}:00:00`
      );
    }

    obj.data = layout;
    res.render('pages/graph', obj);
  }
}
