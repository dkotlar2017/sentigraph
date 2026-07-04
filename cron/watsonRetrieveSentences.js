const lib = require(__dirname + '/../libs/functions.js');

const date = lib.getDateForNames(-2);

(async () => {
  const mongo = (await import('../models/mongo.mjs')).default;
  const watson = (await import('../models/watson.mjs')).default;

  mongo.run((db) => {
    const col = db.collection(`sentences${date}`);
    const standalone = [];

    col.find({}).toArray((err, docs) => {
      if (err) {
        throw err;
      }

      const batched = docs.reduce((last, item) => {
        const normalized = item.data.replace(/[;,\.]/g, ' ').replace(/\s+/g, ' ');

        if (item.since_id === 0) {
          standalone.push(normalized);
        } else {
          last.push(normalized);
        }

        return last;
      }, []);

      fetchFromWatson(standalone.concat(batched), mongo, watson);
    });
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

function fetchFromWatson(sentences, mongo, watson) {
  const remaining = [...sentences];
  const text = remaining.splice(0, 700).join('\n');

  watson.getData(text, (data) => {
    const insert = data.map((item) => ({
      text: item.text,
      emotion_tone: item.emotion_tone,
    }));

    mongo.run((db) => {
      db.collection(`watsondata${date}`).insertOne({ data: insert, dateAdded: new Date() }, (err) => {
        if (err) {
          throw err;
        }

        if (remaining.length > 0) {
          setTimeout(() => fetchFromWatson(remaining, mongo, watson), 10000);
        } else {
          setTimeout(() => process.exit(), 15000);
        }
      });
    });
  });
}
