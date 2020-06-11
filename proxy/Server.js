const request = require('request');
const Node = require('./Node');
// const geth = require("../geth");
const block = require("../block");

class Message{
    constructor(node, block, lockedValue, lockedround, round) {
        this.block = block;
        this.lockedValue = lockedValue;
        this.lockedround = lockedround;
        this.round = round;
        this.node = node;
    }

    generateMessage () {
        const msg = JSON.stringify({
            block: this.block,
            lockedValue: this.lockedValue,
            lockedround: this.lockedround,
            round: this.round,
            height: this.node.height
        });
        return {
            msg: msg,
            signedMsg: this.node.sign(msg),
            nodeID: this.node.nodeID
        }
    }

    generateNil () {
        const msg = JSON.stringify({
            block: 'nil',
            lockedValue: null,
            lockedRound: -1,
            round: this.round,
            height: this.node.height
        });
        return {
            msg: msg,
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
        this.recivedVote = {};
        this.recivedCommit = {};
        this.stage = (this.proposaler == this.nodeID)?"start":"proposal";
        this.faultTolerance = 0.7;
    }

    send (address, type, msg,) {
        request({
            url: address+'/'+type,
            method: "POST",
            json: true,
            headers: {
                "content-type": "application/json",
            },
            body: {
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

    async start (geth) {
        if (this.stage != "start") {
            return;
        }
        if (this.proposaler == this.nodeID) {
            //为提议节点,广播区块
            if (!this.lockedValue && this.lockedround == -1) {
                const newBlock = await block.generateNextBlock(geth);
                const msg = new Message(this.node, newBlock, null, -1, 1).generateMessage();
                this.broadcast('proposal', msg);
                this.stage = "proposal";
            } else {
                const msg = new Message(this.node, null, this.lockedValue, this.lockedround, this.round).generateMessage();
                this.broadcast('proposal', msg);
                this.stage = "proposal";
            }
        }else {
            return;
        }
    }

    async proposal (msg) {

        if (this.stage != "proposal") { return; }
        msg = JSON.parse(msg);
        msg.msg = JSON.parse(msg.msg);

        let validProposal = true;
        // checkSignature
        const validSig = this.node.validSign(msg.msg, msg.signedMsg, this.node.nodeTable[msg.nodeID].pubKey);
        if (!validSig) { validProposal = false; }
        // check round and height
        if (msg.msg.round != this.round || msg.msg.height != this.node.height) { validProposal = false; }
        if (!validProposal) {
            console.log("propsal server"+this.node.nodeID+"at round"+this.round+" height"+this.height+" reject round"+msg.msg.round+" height"+msg.msg.height);
            const message = new Message(this.node, null, null, null, this.round).generateNil();
            this.broadcast('prevote', message);
            this.recivedVote[JSON.stringify(msg.msg)] = [this.nodeID] // record nil to recivedVoteinfo
            this.stage = "prevote";
            return;
        }
        // send lockValue if locked
        if (this.lockedValue && this.lockedround != -1) {
            const message = new Message(this.node, null, this.lockedValue, this.lockedround, this.round).generateMessage();
            this.broadcast('prevote', message);
        } else {
        // else send propsal
           const message = new Message(this.node, msg.msg.block, null, -1, this.round).generateMessage();
           this.broadcast('prevote', message); 
        }
        this.recivedVote[JSON.stringify(msg.msg)] = [this.nodeID] //record msg  to recivedVoteinfo
        this.stage = "prevote";
    }

    async prevote (msg) {

        if (this.stage != "prevote") { return; }

        msg = JSON.parse(msg);
        msg.msg = JSON.parse(msg.msg);
        
        let validVote = true;
        // checkSignature
        const validSig = this.node.validSign(msg.msg, msg.signedMsg, this.node.nodeTable[msg.nodeID].pubKey);
        if (!validSig) { validVote = false; }
        // check round and height
        if (msg.msg.round != this.round || msg.msg.height != this.node.height) { validVote = false; }
        if (!validVote) { 
            console.log("prevote server"+this.node.nodeID+"at round"+this.round+" height"+this.height+" reject round"+msg.msg.round+" height"+msg.msg.height);
            return; 
        }
        // record lockedRound vote which lockedround is higher or proposal
        if (msg.msg.lockedround != -1 && msg.msg.lockedround < this.lockedround) { return; } // ignore lower lockedRound
        const blockInfo = JSON.stringify(msg.msg);
        if (!this.recivedVote.hasOwnProperty(blockInfo)) {
            this.recivedVote[blockInfo] = [msg.nodeID];
        } else {
            let uni = true;
            this.recivedVote[blockInfo].forEach( id => { if (id == msg.nodeID) { uni = false; } });
            if (uni) {
                this.recivedVote[blockInfo].push(msg.nodeID);
            }
        }
        // check if there's more than 2/3 peers agree
        const nodeAmout = Object.keys(this.node.nodeTable).length;
        for (let key in this.recivedVote) {
            let votes = this.recivedVote[key].length;
            if (votes/nodeAmout > this.faultTolerance) {
                // record recivedCommit
                this.recivedCommit[key] = [this.node.nodeID];
                // lock value and broadcast message
                const msg = JSON.parse(key);
                if (msg.block == 'nil') {
                    const message = new Message(this.node, null, null, null, this.round).generateNil();
                    this.broadcast('precommit', message);
                }   
                else if (msg.lockedround != -1) {
                    this.lockedValue = msg.lockedValue;
                    this.lockedround = msg.lockedround;
                    const message = new Message(this.node, null, this.lockedValue, this.lockedround, this.round).generateMessage();
                    this.broadcast('precommit', message);
                } else {
                    this.lockedValue = msg.block;
                    this.lockedround = msg.round;
                    const message = new Message(this.node, msg.block, null, -1, this.round).generateMessage();
                    this.broadcast('precommit', message);
                }
                this.stage = "precommit";
            }
        }
    }

    async precommit (msg) {
        msg = JSON.parse(msg);
        msg.msg = JSON.parse(msg.msg);
        
        let validCommit = true;
        // checkSignature
        const validSig = this.node.validSign(msg.msg, msg.signedMsg, this.node.nodeTable[msg.nodeID].pubKey);
        if (!validSig) { validCommit = false; }
        // check round and height
        // if (msg.msg.round != this.round || msg.msg.height != this.node.height) { validCommit = false; }
        if (!validCommit) { 
            console.log(" precommit server"+this.node.nodeID+"at round"+this.round+" height"+this.height+" reject "+msg.nodeID+" at round"+msg.msg.round+" height"+msg.msg.height);
            return; 
        }
        // record
        const blockInfo = JSON.stringify(msg.msg);
        if (!this.recivedCommit.hasOwnProperty(blockInfo)) {
            this.recivedCommit[blockInfo] = [msg.nodeID];
        } else {
            let uni = true;
            this.recivedCommit[blockInfo].forEach( id => { if (id == msg.nodeID) { uni = false; } });
            if (uni) {
                this.recivedCommit[blockInfo].push(msg.nodeID);
            }
        }
        // check if there's more than 2/3 peers agree
        const nodeAmout = Object.keys(this.node.nodeTable).length;
        for (let key in this.recivedCommit) {
            let votes = this.recivedCommit[key].length;
            if (votes/nodeAmout > this.faultTolerance) {
                // lock value and broadcast message
                const msg = JSON.parse(key);
                if (msg.height > this.node.height) {
                    console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
                    let self = this;
                    this.requestBlock(this.node.nodeTable[this.recivedCommit[key][0]], this.height, msg.height, block => {
                        block.forEach(e => { self.node.writeBolck(e); })
                        self.decision(msg.block);
                    });
                } else if (msg.round > this.round) {
                    this.round = msg.round;
                    this.decision(msg.block);
                } else {
                    this.decision(msg.block);
                }
            }
        }
    }

    async decision (block) {
        if (block == 'nil') {
            console.log('server'+this.node.nodeID+" write nil,go to next round");
            this.round += 1;

        } else {
            console.log(new Buffer(JSON.stringify(block)).length)
            this.node.writeBolck(block);
            this.height = this.node.height;
            this.round = 1
            this.lockedValue = null;
            this.lockedround = -1;
        }
        this.recivedVote = {};
        this.recivedCommit = {};
        this.stage = (this.proposaler == this.nodeID)?"start":"proposal";
    }

    async requestBlock(address, before, after, callback) {
        request({
            url: address+'/requestBlock',
            method: "POST",
            json: true,
            headers: {
                "content-type": "application/json",
            },
            body: {
                data: JSON.stringify({
                    before: before,
                    after: after
                })
            }
        }, function(err, res, body) {
            callback(JSON.parse(body));
        }); 
    }

    async returnBlock(before, after) {
        let blockList = [];
        for (let i = before; i <= after; i++) {
            blockList.push(this.node.block[i]);
        }
        return JSON.stringify(blockList);
    }
}
Server.timeLimit = 1000; //1sec

const newServer = (nodeID, pubKey, privateKey,nodeTable, app) => {
    const server = new Server(nodeID, pubKey, privateKey,nodeTable, "0");
    setRouter(app, server);
    return server;
};

const setRouter = (app, server) => {
    app.post('/proposal', async(req, res) => {
        console.log("server"+server.node.nodeID+" recive proposal");
        server.proposal(req.body.data);
        res.sendStatus(200);
    });
    app.post('/prevote', async(req, res) => {
        console.log("server"+server.node.nodeID+" recive prevote");
        server.prevote(req.body.data);
        res.sendStatus(200);
    });
    app.post('/precommit', async(req, res) => {
        console.log("server"+server.node.nodeID+" recive precommit");
        server.precommit(req.body.data);
        res.sendStatus(200);
    });
    app.post('/requestBlock', async(req, res) => {
        console.log("server"+server.node.nodeID+" recive requestBlock");
        const data = JSON.parse(req.body.data)
        const blockList = server.returnBlock(data.before, data.after);
        res.send(blockList);
    });
}

module.exports = newServer;
