import fastx, {receiverAddress} from "./config";
import {logBalanceAndUtxo, depositNFT} from "./utils";


const testDepositNft = async() => {
    // const address = "0xd03ce696c376882fab5e808aad2ffeae2789a712";
    const address = receiverAddress;
    
    // const nftAd = {category: erc721ContractAddress, tokenId: 51};
    await logBalanceAndUtxo(address);

    const nftAd = await depositNFT(address);

    await logBalanceAndUtxo(address);
};


export default testDepositNft;


if (typeof require != 'undefined' && require.main == module) {
    testDepositNft();
}