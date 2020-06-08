const express = require("express");
const bodyParser = require('body-parser');
const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs');

nodeTable = JSON.parse(fs.readFileSync('key.json'));
console.log(argv);

const http_port = 3000 + Number(argv.i);
const app = express();
app.use(bodyParser.json());
app.listen(http_port, () => console.log('Listening http on port: ' + http_port));   

