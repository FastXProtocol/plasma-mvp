import Client from "./client";

let options = {
    debug: true
};

if (process.env.ENV == "LOCAL") {
    options = {
        ...options,
        gethRpc: "http://localhost:8545",
        fastXRpc: "http://localhost:8546/jsonrpc",
        rootChainAddress: "0xa3b2a1804203b75b494028966c0f62e677447a39",
        defaultAccount: "0xfd02EcEE62797e75D86BCff1642EB0844afB28c7",
    }
} else {
    options = {
        ...options,
        gethRpc: "http://localhost:8545",
        fastXRpc: "http://dev2.msan.cn:8546/jsonrpc",
        rootChainAddress: "0xD9FA1cbB70b74f3Ef259CE0eb48029F02eE0FcD1",
        defaultAccount: "0xfc32e7c7c55391ebb4f91187c91418bf96860ca9",
    }
}

const client = new Client(options);

const ownerAddress = options.defaultAccount;
const receiverAddress = process.env.ENV == "LOCAL"? "0x4B3eC6c9dC67079E82152d6D55d8dd96a8e6AA26": "0xd103C64735B324161518F17CeF15D1E27e0b9F3E";

const logBalance = async (address) => {
    let res = (await client.getBalance(address)).data.result;
    console.log("address: "+ (address || client.defaultAccount) );
    console.log("balance: ", res);
};


const getUTXOs = async (address) => {
    return (await client.getUTXO(address)).data.result;
};

const getPsTx = async () => {
    return (await client.getAllPsTransactions()).data.result;
}

const sleep = async (millisecond) => {
    await new Promise(resolve => setTimeout(resolve, millisecond));
}

const testTx = async () => {
    console.log("---------- testing transaction ----------");
    await client.deposit("0x0", 0, 100);
    await logBalance();

    await client.sendEth(receiverAddress, 150);

    await logBalance();
    await logBalance(receiverAddress);
};


const testPsTx = async () => {
    console.log("---------- testing partially signed transaction ----------");
    console.log("1. ps tranctions", await getPsTx());

    await client.sellToken("0x0", 0, 1);

    await logBalance();

    const psTransactions = await getPsTx();
    console.log("2. ps tranctions", psTransactions);
    
    const psTransaction = psTransactions[0];
    console.log(psTransaction);
    if (psTransaction) {
        await client.sendPsTransactionFill(psTransaction, 0, 0, 0, receiverAddress);
        console.log("3. ps tranctions", await getPsTx());
    
        await logBalance();
        await logBalance(receiverAddress);
    }

}


const main = async () => {
    try{
//         await testTx();
        await testPsTx();
    } catch(e) {
        console.log(e);
    }
    process.exit();
};


main();