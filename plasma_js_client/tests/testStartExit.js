import fastx from "./config";
import {getUTXOs, sleep} from "./utils";


const testStartExit = async () => {
    await fastx.deposit("0x0", 100, 0);
    await sleep(1000);
    console.log("root chain info: ", await fastx.rootChainInfo.getInfo());
    const utxos = await getUTXOs();
    for(const utxo of utxos){
        const [blknum, txindex, oindex, contractAddress, amount, tokenid] = utxo;
        if (blknum % 1000 != 0) {
            console.log("UTXO", utxo);
            const depositPos = blknum * 1000000000 + txindex * 10000 + oindex;
            console.log(depositPos, contractAddress, amount, tokenid)
            await fastx.startDepositExit(blknum, txindex, oindex, contractAddress, amount, tokenid);
            console.log("startDepositExit sent");
            console.log("root chain info: ", await fastx.rootChainInfo.getInfo());
            break;
        }
    }
};


export default testStartExit;


if (typeof require != 'undefined' && require.main == module) {
    testStartExit();
}