const request = require('request');
const Node = require('./Node');

class Server{
    constructor(nodeID, nodeTable, propsal) {
        this.nodeID = nodeID;
        this.address = nodeTable[nodeID];
        this.propsal = propsal //提议节点
        this.node = new Node(nodeID, nodeTable);
        this.height = 0;
        this.round = 0;
        this.lockedValue = null;
        this.lockedround = -1;
        this.recivedVote = [];
        this.recivedCommit = [];
    }

    send (address, msg) {
        request.post(address, {
            form: {
                data: JSON.stringify(msg)
            }
        })
    }

    broadcast (msg) {

    }

    prepare() {
        if (this.propsal == this.nodeID) {
            //为提议节点,广播区块
        }else {
            return;
        }
    }

    prevote() {

    }

    precommit() {

    }

    writeBlock() {

    }
}
Server.timeLimit = 1000; //1sec

const newServer = (nodeID, nodeTable, app) => {
    const server = new Server(nodeID, nodeTable);
    setRouter(app, server);
};

const setRouter = (app, server) => {
    app.post('/prepare', async(req, res) => {
        server.prepare();
    })
    app.post('/prevote', async(req, res) => {
        server.prevote();
    })
    app.post('/precommit', async(req, res) => {
        server.precommit();
    })
}