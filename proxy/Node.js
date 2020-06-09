// 节点信息
const nodeRSA = require('node-rsa');

class Node{
    constructor (nodeID, pubKey, privateKey,nodeTable) {
        this.nodeID = nodeID;
        this.pubKey = pubKey
        this.privateKey = privateKey
        this.nodeTable = nodeTable;
        this.block = [];
        this.height = 0
    }

    writeBolck (block) {
        this.block.push(block);
        this.height = this.block.length;
        console.log("server"+this.nodeID+" successfule write block at height "+this.height);
    }

    sign (msg) {
        const key = new nodeRSA({ b: 512 });
        key.importKey(this.privateKey, "pkcs1-private-pem");
        const sign = key.sign(Buffer.from(msg), 'BASE64').toString('BASE64');
        return sign;
    }

    validSign (msg, signedMsg, pubKey) {
        msg = JSON.stringify(msg);
        const key = new nodeRSA({ b: 512 });
        key.importKey(pubKey, "pkcs1-public-pem");
        var verify = key.verify(Buffer.from(msg), signedMsg, 'Buffer', 'BASE64'); 
        return verify;
    }
}

module.exports = Node;