import moment from 'moment';
import fastx, {receiverAddress} from "./config";
import {logBalance, depositNFT, postNftAd, sleep} from "./utils";


const testPostAd = async() => {
    const nftAd = await depositNFT();
    // const nftAd = {category: erc721ContractAddress, tokenId: 51};
    await logBalance();

    const end = moment().add(1, 'days').unix();
    const price = 1;

    console.log( 'Posting Ad for Category: '+nftAd.category+', Token Id: '+nftAd.tokenId+', end: '+end+', price: '+price);

    await postNftAd(nftAd.category, nftAd.tokenId, end, price);

    // give receiver address eth to bid
    if (process.env.ENV == "LOCAL") {
        await fastx.deposit("0x0", 1, 0);
        await sleep(1000);
        await fastx.sendEth(receiverAddress, 1);
        await logBalance();
        await logBalance(receiverAddress);
    }
};


export default testPostAd;


if (typeof require != 'undefined' && require.main == module) {
    testPostAd();
}