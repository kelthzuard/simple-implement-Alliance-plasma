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
        this.block.append(block);
        this.height = block.length;
    }

    sign (msg) {
        const key = new nodeRSA({ b: 2048 });
        key.importKey(this.privateKey, "pkcs1-private-pem");
        const sign = key.sign(msg, "base64");
        return sign;
    }

    validSign (msg, signedMsg, pubKey) {
        const key = new nodeRSA({ b: 2048 });
        key.importKey(pubKey, "pkcs8-public-pem");
        const verify = key.verify(msg, signedMsg, "base64");
        return verify;
    }
}

module.exports = Node;