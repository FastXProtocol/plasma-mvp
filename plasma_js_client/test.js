import Client from "./client";

const options = {
    gethRpc: "http://localhost:8545",
    fastXRpc: "http://dev2.msan.cn:8546/jsonrpc",
    rootChainAddress: "0xD9FA1cbB70b74f3Ef259CE0eb48029F02eE0FcD1",
    defaultAccount: "0xfc32e7c7c55391ebb4f91187c91418bf96860ca9",
    debug: true
};

const client = new Client(options);

const ownerAddress = "0xd103C64735B324161518F17CeF15D1E27e0b9F3E";


const logBalance = async (address) => {
    let res = (await client.getBalance(address)).data.result
    console.log("balance", res);
};


const getUTXOs = async (address) => {
    return (await client.getUTXO(address)).data.result;
}


const testTx = async () => {
    console.log("---------- testing transaction ----------");
    try {
        await client.deposit("0x0", 0, 100);
        await logBalance();
        // console.log((await client.getUTXO()).data.result);

        let res = await client.sendEth("0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26", 1);
        console.log('TX: ' + res.data.result);

        await logBalance();
        // console.log((await client.getUTXO()).data.result);
    } catch(e) {
        console.log(e);
        process.exit();
    }
};


const testPsTx = async () => {
    console.log("---------- testing partially signed transaction ----------");
    console.log("1. ps tranctions", (await client.getAllPsTransactions()).data.result);
    let utxos = await getUTXOs();
    for(let i in utxos){
        let utxo = utxos[i];
        if (utxo[4] >= 0 && utxo[5] == 0){
            console.log(utxo);
            await client.sendPsTransaction(utxo[0], utxo[1], utxo[2], ownerAddress, utxo[3], utxo[4] - 1, utxo[5], utxo[3], 1, 0);

            await logBalance();
            let psTransaction = (await client.getAllPsTransactions()).data.result[0];
            console.log(psTransaction);
            await client.sendPsTransactionFill(psTransaction, 0, 0, 0, "0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26");
            console.log("2. ps tranctions", (await client.getAllPsTransactions()).data.result);
            await logBalance();
            break;
        }
    }
}


const main = async () => {
    await testTx();
    // await testPsTx();
    process.exit();
};


main();