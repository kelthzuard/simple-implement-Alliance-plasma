const NodeRSA = require('node-rsa');
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));

const nodeNumber = argv.n;
var nodeTable = {};
for (let i = 0; i < nodeNumber; i ++) {
  var key = new NodeRSA({ b: 512 });
  key.setOptions({ encryptionScheme: 'pkcs1' });

  var privatePem = key.exportKey('pkcs1-private-pem');
  var publicPem = key.exportKey('pkcs1-public-pem');
  nodeTable[String(i)] = {
      "address": "http://localhost:" + String(3000+i),
      "pubKey": publicPem,
      "privateKey": privatePem
  };
}

var file = path.join(__dirname, 'key.json');
fs.writeFileSync(file, JSON.stringify(nodeTable, null, 4));