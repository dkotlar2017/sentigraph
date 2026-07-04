import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { config } = require('../../watsonconfig.js');

/**
 * IBM Watson Tone Analyzer client.
 */

const WATSON_URL = 'https://gateway.watsonplatform.net/tone-analyzer/api/v3/tone?version=2016-05-19';

/**
 * Analyze text and return per-sentence tone scores.
 * @param {string} text - Input text to analyze
 * @param {function} cb - Callback (err, data)
 */
export function getData(text, cb) {
  const auth = Buffer.from(`${config.username}:${config.password}`).toString('base64');

  fetch(WATSON_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })
    .then((response) => response.json())
    .then((body) => {
      const data = [];
      const sentences = body.sentences_tone ?? [];

      for (const item of sentences) {
        const row = { text: item.text };

        if (typeof item.tone_categories === 'undefined') {
          continue;
        }

        for (const category of item.tone_categories) {
          row[category.category_id] = category.tones.map((tone) => ({
            [tone.tone_id]: tone.score,
          }));
        }

        data.push(row);
      }

      cb(null, data);
    })
    .catch((err) => cb(err));
}

export default { getData };
