import fastx from "./config";
import {logBalanceAndUtxo, depositNFT} from "./utils";


const testDepositNft = async() => {
    // const nftAd = {category: erc721ContractAddress, tokenId: 51};
    await logBalanceAndUtxo('0x4B3eC6c9dC67079E82152d6D55d8dd96a8e6AA26');

    const nftAd = await depositNFT('0x4B3eC6c9dC67079E82152d6D55d8dd96a8e6AA26');

    await logBalanceAndUtxo('0x4B3eC6c9dC67079E82152d6D55d8dd96a8e6AA26');
};


export default testDepositNft;


if (typeof require != 'undefined' && require.main == module) {
    testDepositNft();
}