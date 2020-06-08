'use strict';
/*jshint esversion: 6 */


const Step = 2;
const chunksSize = 256;

function checkblock(stateTree, block) {
    try {
        var rebuiltBlock = NewBlock(stateTree, block.transactions);
    } catch (error) {
        return false;
    }

    for (let i = 0; i < rebuiltBlock.interStateRoots.length; i++) {
        if (block.interStateRoots.length <= i || !bytescompare(block.interStateRoots[i],rebuiltblock.interStateRoots[i])) {
            let writeKeys = [];
            let oldData = [];
            let readKeys = [];
            let readData = [];
            let leaves = 0;
            let proofstate = [];
            let proof = null;
            let chunks = [];
            let concernedChunks = null;
            let proofChunks = [];
            let numOfLeaves = 0;
            let chunksIndexes = null;
            
            //1. 找到与第一个出现问题的中间状态
            const t = rebuiltBlock.transactions.slice(i*Step, (i+1)*Step);

            //2. 产生一个包含交易里的键值对的Merkle证明

            for (let j = 0; j < t.length; j++) {
                for (let k = 0; k < t[j].writeKeys; k++) {
                    writeKeys = writeKeys.push(t[j].writeKeys[k]);
                    oldData = oldData.push(t[j].writeKeys[k]);
                }
                for (let k = 0; k < t[j].readKeys.length; k++) {
                    readKeys = readKeys.push(t[j].readKeys[k]);
                    readData = readData.push(t[j].readData[k]);
                }  
            }


            for (let j = 0; j < writeKeys.length; j++) {
                try {
                    proof = stateTree.ProveCompact(writeKeys[j]);
                } catch (error) {
                    return error;
                }
                proofstate[j] = proof;
            }

            //3. 获得证明关注的chunks
            try {
                chunksIndexes = block.getChunksIndexes(t);
            } catch (error) {
                return error;
            }
            
            try {
                chunks = makeChunks(chunksSize,block.transactions,block.interStateRoots)
            } catch (error) {
                return error;
            }

            for (let j = 0; j < chunksIndexes.length; j++) {
                concernedChunks = concernedChunks.push(chunks[chunksIndexes[j]]);
            }
            
            //4. 产生交易的Merkle证明,前一个状态根的证明,下一个状态根

            for (let j = 0; j < chunksIndexes.length; j++) {
                const tmpDataTree = merkletree.New(sha512.New512_256());
                try {
                    tmpDataTree.SetIndex(chunksIndexes[j]);
                } catch (error) {
                    return error;
                }
                try {
                    fillDataTree(block.transactions, block.interStateRoots, tmpDataTree);
                } catch (error) {
                    return error;
                }
                
                proof, leaves = tmpDataTree.Prove();
                numOfLeaves = leaves;
                proofChunks[j] = proof;
            }
            let fraudProof = new FraudProof(writeKeys,oldData,readKeys,proofstate,concernedChunks,proofChunks,chunksIndexes,numOfLeaves,readData);
            return fraudProof;
        }
    }
    return false;
}

class FraudProof {
    constructor(writeKeys,oldData,readKeys,proofstate,concernedChunks,proofChunks,chunksIndexes,numOfLeaves,readData){
        this.writeKeys=writeKeys;
		this.oldData=oldData;
		this.readKeys=readKeys;
		this.readData=readData;
		this.proofstate=proofstate;
        this.concernedChunks =concernedChunks;
		this.proofChunks=proofChunks;
		this.chunksIndexes=chunksIndexes;
		this.numOfLeaves=numOfLeaves;
    }
}