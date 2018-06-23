import fastx from "./config";


const logBalance = async (address) => {
    console.log("\naddress: ", address );
    console.log("balance: ", await fastx.getEthBalance(address));
    let utxos = (await fastx.getAllUTXO(address)).data.result;
    console.log('\n', utxos);
}

const testEthUtxo = async () => {
    console.log("---------- testing getOrNewEthUtxo ----------");
    const from = fastx.defaultAccount;

    await logBalance(from);

    let ethUtxo = await fastx.getOrNewEthUtxo(30, {from: from});

    console.log('ethUtxo ', ethUtxo);
};


export default testEthUtxo;


if (typeof require != 'undefined' && require.main == module) {
    testEthUtxo();
}