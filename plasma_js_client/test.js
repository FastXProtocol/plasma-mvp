import client from "./client";


const ownerAddress = "0xfd02EcEE62797e75D86BCff1642EB0844afB28c7";


const logBalance = async (address=testAddress) => {
    let res = (await client.getBalance(ownerAddress)).data.result
    console.log("balance", res);
};


const getUTXOs = async (address=testAddress) => {
    return (await client.getUTXO(ownerAddress)).data.result;
}


const testTx = async () => {
    console.log("---------- testing transaction ----------");
    try {
        await client.sendDeposit("0x0", 100, 0, ownerAddress);
        await logBalance();
        let utxos = await getUTXOs();
        for(let i in utxos){
            let utxo = utxos[i];
            if (utxo[4] >= 0 && utxo[5] == 0){
                console.log(utxo);
//                 await client.sendTransaction(utxo[0], utxo[1], utxo[2], 0, 0, 0, ownerAddress, utxo[3], utxo[4] - 1, utxo[5], "0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26", utxo[3], 1, 0, undefined, undefined, undefined, undefined, undefined, ownerAddress, ownerAddress);
                await client.sendTransaction(utxo[0], utxo[1], utxo[2], 0, 0, 0, ownerAddress, utxo[3], utxo[4] - 1, utxo[5], "0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26", utxo[3], 1, 0);
                await logBalance();
                break;
            }
        }
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
    await testPsTx();
    process.exit();
};


main();