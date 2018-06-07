import Client from "./client";

const options = {
    gethRpc: "http://localhost:8545",
    fastXRpc: "http://dev2.msan.cn:8546/jsonrpc",
    rootChainAddress: "0xD9FA1cbB70b74f3Ef259CE0eb48029F02eE0FcD1",
    defaultAccount: "0xfc32e7c7c55391ebb4f91187c91418bf96860ca9",
    debug: true
};

const client = new Client(options);

const ownerAddress = "0xfc32e7c7c55391ebb4f91187c91418bf96860ca9";
const receiverAddress = "0xd103C64735B324161518F17CeF15D1E27e0b9F3E";

const logBalance = async (address) => {
    let res = (await client.getBalance(address)).data.result;
    console.log("address: "+ (address || client.defaultAccount) );
    console.log("balance: ", res);
};


const getUTXOs = async (address) => {
    return (await client.getUTXO(address)).data.result;
}


const testTx = async () => {
    console.log("---------- testing transaction ----------");
    try {
        // await client.deposit("0x0", 0, 100);
        await logBalance();
        // console.log((await client.getUTXO()).data.result);

        let res = await client.sendEth(receiverAddress, 150);
        console.log('TX: ' + res.data.result);

        await logBalance();
        // console.log((await client.getUTXO()).data.result);

        await logBalance(receiverAddress);

    } catch(e) {
        console.log(e);
        process.exit();
    }
};


const testPsTx = async () => {
    console.log("---------- testing partially signed transaction ----------");
    console.log("1. ps tranctions", (await client.getAllPsTransactions()).data.result);

    await client.sellToken("0x0", 0, 1);

    await logBalance();

    let psTransaction = (await client.getAllPsTransactions()).data.result[0];
    console.log(psTransaction);
    if (psTransaction) {
        await client.sendPsTransactionFill(psTransaction, 0, 0, 0, receiverAddress);
        console.log("2. ps tranctions", (await client.getAllPsTransactions()).data.result);
    
        await logBalance();
        await logBalance(receiverAddress);

    }

}


const main = async () => {
    // await testTx();
    await testPsTx();
    process.exit();
};


main();