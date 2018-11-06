import fastx from "./config";


const testGetTransactions = async() => {
    let curblknum = await fastx.getCurrentBlockNum() - 1000;
    let curtxindex = -1;
    let transactions = await fastx.getTransactionsAfter(curblknum, curtxindex);
    for(const [blknum, txindex, transaction] of transactions){
        console.log([blknum, txindex, transaction])
    }
};


export default testGetTransactions;


if (typeof require != 'undefined' && require.main == module) {
    testGetTransactions();
}