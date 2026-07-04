const lib = require(__dirname + '/../libs/functions.js');
const memcache = require(__dirname + '/../libs/memcache.js');

(async () => {
  const mongo = (await import('../models/mongo.mjs')).default;
  const date = lib.getDateForNames(-3);

  mongo.run((db) => {
    const col = db.collection(`sentences${date}`);
    const col2 = db.collection(`watsondata${date}`);
    let text = [];

    col.find({ since_id: 0 }).toArray((err, docs) => {
      if (err) {
        throw err;
      }

      const sentences = docs.map((item) =>
        item.data.replace(/[;,\.]/g, ' ').replace(/\s+/g, ' ')
      );

      col2.find({}).toArray((err2, docs2) => {
        if (err2) {
          throw err2;
        }

        docs2.forEach((item) => {
          item.data.reduce((last, entry) => {
            if (sentences.indexOf(entry.text) > -1) {
              text.push(entry);
            }

            return last;
          }, []);
        });

        if (text.length > 0) {
          memcache.set(`watsonsentences${date.toString()}`, JSON.stringify(text), 3600 * 24 * 3, () => {
            setTimeout(() => process.exit(), 10000);
          });
        } else {
          setTimeout(() => process.exit(), 10000);
        }
      });
    });
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
