import fastx from "./config";
import {logBalanceAndUtxo, depositNFT} from "./utils";


const testDepositNft = async() => {
    // const nftAd = {category: erc721ContractAddress, tokenId: 51};
    await logBalanceAndUtxo();

    const nftAd = await depositNFT();

    await logBalanceAndUtxo();
};


export default testDepositNft;


if (typeof require != 'undefined' && require.main == module) {
    testDepositNft();
}