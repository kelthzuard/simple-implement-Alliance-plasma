const request = require('request');
const Node = require('./Node');
const geth = require("../geth");
const block = require("../block");

class Message{
    constructor(node, block=null, lockedValue=null, lockedround=null, round=null) {
        this.block = block;
        this.lockedValue = lockedValue;
        this.lockedround = lockedround;
        this.round = round;
        this.height = height;
        this.node = node;
    }

    generateMessage () {
        const msg = {
            block: this.block,
            lockedValue: this.lockedValue,
            lockedround: this.lockedround,
            round: this.round,
            height: this.node.height
        }
        return {
            msg: msg,
            signedMsg: this.node.sign(msg),
            nodeID: this.node.nodeID
        }
    }

    generateNil () {
        return {
            msg: 'nil',
            signedMsg: this.node.sign(msg),
            nodeID: this.node.nodeID
        }
    }
}

class Server{
    constructor(nodeID, pubKey, privateKey, nodeTable, proposaler) {
        this.nodeID = nodeID;
        this.address = nodeTable[nodeID].address;
        this.proposaler = proposaler; //提议节点
        this.node = new Node(nodeID, pubKey, privateKey,nodeTable);
        this.round = 1;
        this.lockedValue = null;
        this.lockedround = -1;
        this.recivedVote = [];
        this.recivedCommit = [];
    }

    send (address, type, msg) {
        request.post(address+'/'+type, {
            form: {
                data: JSON.stringify(msg)
            }
        });
    }

    broadcast (type, msg) {
        for (let id in this.node.nodeTable) {
            if (id != this.nodeID) {
                this.send(this.node.nodeTable[id].address, type, msg);
            }
        }
    }

    async proposal() {
        if (this.proposaler == this.nodeID) {
            //为提议节点,广播区块
            if (!this.lockedValue && this.lockedround == -1) {
                const newBlock = await block.generateNextBlock(geth);
                const msg = new Message(newBlock, null, -1, 0, this.node).generateMessage();
                this.broadcast('proposal', msg);
            } else {
                const msg = new Message(null, this.lockedValue, this.lockedround, this.round, this.node).generateMessage();
                this.broadcast('proposal', msg);
            }
        }else {
            return;
        }
    }

    async prevote(msg) {
        msg = JSON.parse(msg);
        let validProposal = true;
        // checkSignature
        validSig = this.node.validSign(msg.msg, msg,signedMsg, this.node.nodeTable[msg.nodeID].pubKey);
        if (!validSig) { validProposal = false; }
        // check round and height
        if (msg.msg.round != this.round || msg.msg.height != this.node.height) { validProposal = false; }
        if (!validProposal) {
            const msg = new Message(this.node).generateNil();
            this.broadcast('prevote', msg);
            return;
        }

        if (this.lockedValue && this.lockedround != -1) {

        }

    }

    precommit() {

    }

    decision() {
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
        server.prevote(req.body);
    })
    app.post('/precommit', async(req, res) => {
        server.precommit();
    })
}