import fastx from "./config";

const testBalance = async () => {
    console.log("---------- testing getBalance ----------");

    const address = fastx.defaultAccount;
    
    // let utxo = (await fastx.searchEthUtxo(50));

    // console.log(utxo);

    // console.log('Exists: ', utxo.exists());

    let res = (await fastx.getEthBalance(address));
    console.log("\naddress: ", address );
    console.log("balance: ", res);
    let utxos = (await fastx.getAllUTXO(address)).data.result;
    console.log('\n', utxos);
};

export default testBalance;

if (typeof require != 'undefined' && require.main == module) {
    testBalance();
}