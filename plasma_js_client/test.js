import client from "./client";


(async () => {
    try {
        await client.sendDeposit("0x0", 100, 0, "0xfd02EcEE62797e75D86BCff1642EB0844afB28c7");
        console.log((await client.getBalance("0xfd02EcEE62797e75D86BCff1642EB0844afB28c7")).data.result);
        let utxos = (await client.getUTXO("0xfd02ecee62797e75d86bcff1642eb0844afb28c7")).data.result;
        for(let i in utxos){
            let utxo = utxos[i];
            if (utxo[4] >= 0 && utxo[5] == 0){
                console.log(utxo);
//                 await client.sendTransaction(utxo[0], utxo[1], utxo[2], 0, 0, 0, "0xfd02ecee62797e75d86bcff1642eb0844afb28c7", utxo[3], utxo[4] - 1, utxo[5], "0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26", utxo[3], 1, 0, undefined, undefined, undefined, undefined, undefined, "0xfd02ecee62797e75d86bcff1642eb0844afb28c7", "0xfd02ecee62797e75d86bcff1642eb0844afb28c7");
                await client.sendTransaction(utxo[0], utxo[1], utxo[2], 0, 0, 0, "0xfd02ecee62797e75d86bcff1642eb0844afb28c7", utxo[3], utxo[4] - 1, utxo[5], "0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26", utxo[3], 1, 0);
                console.log((await client.getBalance("0xfd02EcEE62797e75D86BCff1642EB0844afB28c7")).data.result);
                process.exit();
                break;
            }
        }
    } catch(e) {
        console.log(e);
        process.exit();
    }
})();