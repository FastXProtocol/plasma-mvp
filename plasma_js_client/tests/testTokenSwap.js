import fastx, {ownerAddress, erc20ContractAddress, erc20ContractAddress2} from "./config";
import {approveDeposit} from "./utils";


const testTokenSwap = async() => {
    // init token pool
    await approveDeposit(ownerAddress, erc20ContractAddress, 1000000, 0);
    await approveDeposit(ownerAddress, erc20ContractAddress2, 1000000, 0);
    
    // offer pstx
    const offerPsTx = await fastx.makeSwapPsTransaction(
        erc20ContractAddress2, 9, 0,
        erc20ContractAddress, 3, 0);
    console.log("offerPsTx", offerPsTx);

    // fill pstx
    // console.log((await fastx.getAllUTXO()).data.result);
    const fillUtxo = await fastx.getOrNewUtxo(3, erc20ContractAddress);
    console.log("fillUtxo", fillUtxo);
    // console.log("before fill", await fastx.getBalance());
    const [fillBlknum, fillTxindex, fillOindex, fillContractAddress, fillAmount, fillTokenid] = fillUtxo;
    console.log((await fastx.sendPsTransactionFill(
        offerPsTx,
        fillBlknum, fillTxindex, fillOindex,
        ownerAddress, ownerAddress)).data);
    // console.log("after fill", await fastx.getBalance());
};


export default testTokenSwap;


if (typeof require != 'undefined' && require.main == module) {
    testTokenSwap();
}