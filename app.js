const express = require("express");
const bodyParser = require('body-parser');
const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs');
const Server = require('./proxy/Server');

const http_port = 3000 + Number(argv.i);
const app = express();
app.use(bodyParser.urlencoded({    
  extended: true
}));
app.use(bodyParser.json());

const nodeTable = JSON.parse(fs.readFileSync('key.json'));
const nodeID = argv.i;
const server = Server(nodeID, nodeTable[nodeID].pubKey, nodeTable[nodeID].privateKey, nodeTable, app);

app.post('/mineBlock', async(req, res) => { 
    server.start();
    res.sendStatus(200); 
})

app.listen(http_port, () => console.log('Listening http on port: ' + http_port));   

