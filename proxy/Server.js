const request = require('request');
const Node = require('./Node');
const geth = require("../geth");
const block = require("../block");

class Message{
    constructor(block, lockedValue, lockedround, )
}

class Server{
    constructor(nodeID, pubKey, privateKey, nodeTable, propsal) {
        this.nodeID = nodeID;
        this.address = nodeTable[nodeID].address;
        this.propsal = propsal; //提议节点
        this.node = new Node(nodeID, pubKey, privateKey,nodeTable);
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
        });
    }

    broadcast (msg) {
        for (let id in this.node.nodeTable) {
            if (id != this.nodeID) {
                this.send(this.node.nodeTable[id].address, msg);
            }
        }
    }

    propsal() {
        if (this.propsal == this.nodeID) {
            //为提议节点,广播区块
            if (!this.lockedValue && this.lockedround == -1) {
                const newBlock = await block.generateNextBlock(geth);
                this.broadcast({
                    block: newBlock,
                    lockedValue: null,
                    lockedround: -1,
                    round: 0,
                    height: length(this.node.height)
                })
            } else {

            }
        }else {
            return;
        }
    }

    prevote() {

    }

    precommit() {

    }

    writeBlock() {
        this.node.writeBolck()
    }
}
Server.timeLimit = 1000; //1sec

const newServer = (nodeID, pubKey, privateKey,nodeTable, app) => {
    const server = new Server(nodeID, pubKey, privateKey,nodeTable);
    setRouter(app, server);
};

const setRouter = (app, server) => {
    app.post('/prevote', async(req, res) => {
        server.prevote();
    })
    app.post('/precommit', async(req, res) => {
        server.precommit();
    })
}