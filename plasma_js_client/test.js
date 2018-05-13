import client from "./index";


const errHandler = (name) => {
    return (e)=>{
        if (name != null) {
            console.log(name + " failed");
        }
        console.log(e);
        process.exit();
    }
};


/*
client.sendDeposit("0x0", 100, 0, "0xfd02EcEE62797e75D86BCff1642EB0844afB28c7").then((tx)=>{
    client.getBalance("0xfd02EcEE62797e75D86BCff1642EB0844afB28c7").then((res) => {
        console.log(res.data.result);
        process.exit();
    }, errHandler);
}, errHandler);
*/


client.getUTXO("0xfd02ecee62797e75d86bcff1642eb0844afb28c7").then((res) => {
    let utxo = res.data.result[0];
    for(let i in res.data.result){
        let utxo = res.data.result[i];
        if (utxo[4] >= 0 && utxo[5] == 0){
            console.log(utxo);
            client.sendTransaction(utxo[0], utxo[1], utxo[2], 0, 0, 0, "0xfd02ecee62797e75d86bcff1642eb0844afb28c7", utxo[3], utxo[4] - 1, utxo[5], "0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26", utxo[3], 1, 0, undefined, undefined, undefined, undefined, undefined, "0xfd02ecee62797e75d86bcff1642eb0844afb28c7", "0xfd02ecee62797e75d86bcff1642eb0844afb28c7").then((res) => {
                client.getBalance("0xfd02EcEE62797e75D86BCff1642EB0844afB28c7").then((res) => {
                    console.log(res.data.result);
                    process.exit();
                }, errHandler);
            }, errHandler);
            break;
        }
    }
}, errHandler);
// client.sendTransaction(1, 0, 0, 0, 0, 0, "0xfd02ecee62797e75d86bcff1642eb0844afb28c7", "0x0", 40, 0, "0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26", "0x0", "60", 0)