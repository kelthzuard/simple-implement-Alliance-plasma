// 节点信息
class Node{
    constructor (nodeID, nodeTable) {
        this.nodeID = nodeID;
        this.nodeTable = nodeTable;
        this.block = [];
    }
}

module.exports = Node;