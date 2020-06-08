class Block {
    constructor(blockNumber, previousHash, transactions) {
        let data = [];
        transactions.forEach(tx => data.push(tx.toString(true))); //对交易进行一个转化,把一个逻辑值转换为字符串,并返回结果

        this.blockHeader = new BlockHeader(blockNumber, previousHash, data);//产生区块头
        this.transactions = transactions;//保存交易
    }
}