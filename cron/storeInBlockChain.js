const lib = require(__dirname + '/../libs/functions.js');
const memcache = require(__dirname + '/../libs/memcache.js');

(async () => {
  const mongo = (await import('../models/mongo.mjs')).default;
  const date = lib.getDateForNames(-3);

  mongo.run((db) => {
    const col = db.collection(`watsondata${date}`);
    const col2 = db.collection('distancefromjoy');

    col.find({}).toArray((err, docs) => {
      if (err) {
        throw err;
      }

      const tones = {
        anger: 0,
        disgust: 0,
        fear: 0,
        joy: 0,
        sadness: 0,
      };
      let total = 0;

      docs.forEach((item) => {
        item.data.forEach((entry) => {
          if (typeof entry.emotion_tone === 'undefined' || entry.emotion_tone === null) {
            return;
          }

          for (let j = 0; j < entry.emotion_tone.length; j++) {
            if (typeof entry.emotion_tone[j] === 'undefined') {
              return;
            }

            const toneRow = entry.emotion_tone[j];

            for (const tone in tones) {
              if (typeof toneRow[tone] !== 'undefined') {
                tones[tone] += parseFloat(toneRow[tone]);
              }
            }
          }

          if (entry.emotion_tone.length > 0) {
            total++;
          }
        });
      });

      for (const tone in tones) {
        tones[tone] = parseFloat(tones[tone] / total);
      }

      const q = Math.sqrt(
        (tones.anger * 3) ** 2
        + (tones.disgust * 2.5) ** 2
        + (tones.fear * 1.5) ** 2
        + (tones.sadness * 2) ** 2
        + tones.joy ** 2
      );

      col2.insertOne({ q, dateAdded: new Date(), tones, date }, (insertErr) => {
        if (insertErr) {
          throw insertErr;
        }
      });

      memcache.set(`q${date}`, q, 3600 * 24 * 30, () => {
        setTimeout(() => process.exit(), 15000);
      });
    });
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
