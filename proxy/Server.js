const Node = require('./Node')

class Server{
    constructor(nodeID, nodeTable) {
        this.nodeID = nodeID;
        this.address = nodeTable[nodeID];
        this.node = new Node(nodeID, nodeTable);
        this.height = 0;
        this.lockedValue = null;
        this.lockedHegiht = -1;
    }
}
Server.timeLimit = 1000; //1sec

const newServer = (nodeID, nodeTable, app) => {
    const server = new Server(nodeID, nodeTable);
    setRouter(app, server);
};

const setRouter = (app, server) => {
    app.post('/prepare', async(req, res) => {
        server.prepare()
    })
}