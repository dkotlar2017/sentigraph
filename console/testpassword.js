const md5 = require('md5');
const sha256 = require('sha256')

console.log(md5(sha256(process.argv[2])));
