import fastx, {receiverAddress} from "./config";
import {logBalance, getPsTx} from "./utils";


const testBidAd = async () => {
    let psTransactions = (await fastx.getAllPsTransactions()).data.result;

    console.log('\nPs Txns:\n');
    console.log(psTransactions);

    if (psTransactions.length == 0)
        throw Error('\nNo PS Tx need to be filled...');

    let ad = psTransactions[ psTransactions.length-1 ];

    if (ad) {
        console.log('\nFilling tx ...\n');
        console.log(ad);
        
        let utxo = await fastx.searchUTXO({
                category: ad.contractaddress1, 
                tokenId: ad.tokenid1, 
                amount: ad.amount1
            }, { from: receiverAddress });
        console.log('\nUTXO',utxo);
        const [_blknum, _txindex, _oindex, _contract, _balance, _tokenid] = utxo;
        await fastx.sendPsTransactionFill(ad, _blknum, _txindex, _oindex, receiverAddress, receiverAddress);
        
        console.log('\nPs Txns:\n');
        console.log((await fastx.getAllPsTransactions()).data.result);

        await logBalance();
        await logBalance(receiverAddress);
    }
};


export default testBidAd;


if (typeof require != 'undefined' && require.main == module) {
    console.log(1111111111111111111111111111111111111111)
    testBidAd();
}