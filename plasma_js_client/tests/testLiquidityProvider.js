import fastx, {erc20ContractAddress, ownerAddress, receiverAddress} from "./config";
import {logBalance, getUTXOs, sleep} from "./utils";


const fromAmount = 10;


const getFromUTXO = async() => {
    const utxos = await getUTXOs(receiverAddress);
    for(const utxo of utxos){
        const [blknum, txindex, oindex, contractAddress, amount, tokenid] = utxo;
        if(contractAddress == "0000000000000000000000000000000000000000" && amount == fromAmount) {
            return utxo
        }
    }
    return null;
}


const testLiquidityProvider = async() => {
    let rate = await fastx.getExchangeRate("0x0", erc20ContractAddress, fromAmount);
    console.log("rate", rate);
    let psTx = (await fastx.createExchangePartiallySignedTransaction("0x0", erc20ContractAddress, fromAmount)).data.result;
    console.log("psTx", psTx);
    if (psTx) {
        let fromUTXO = await getFromUTXO();
        if(!fromUTXO){
            await fastx.deposit("0x0", fromAmount, 0, {from: receiverAddress});
            await sleep(1000);
            fromUTXO = await getFromUTXO();
        }
        console.log("fromUTXO", fromUTXO);
        const [blknum, txindex, oindex, contractAddress, amount, tokenid] = fromUTXO;
        await logBalance(receiverAddress)
        await fastx.sendPsTransactionFill(psTx, blknum, txindex, oindex, receiverAddress, receiverAddress);
        // set AUTHORITY_KEY to the key for receiverAddress
        await logBalance(receiverAddress)
    } else {
        console.error("no psTx")
    }
};


export default testLiquidityProvider;


if (typeof require != 'undefined' && require.main == module) {
    testLiquidityProvider();
}