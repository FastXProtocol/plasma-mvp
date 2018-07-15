import fastx, {ownerAddress} from "./config";
import {getUTXOs, logBalance, sleep} from "./utils";


const wei2eth = (wei) => {
    return fastx.web3.utils.fromWei(""+wei, 'ether')
}


const testChallengeExit = async () => {
    const depositContractAddress = "0x0";
    const depositAmount = 1000000000000000000;
    const depositTokenId = 0;
    await fastx.deposit(depositContractAddress, depositAmount, depositTokenId);
    await sleep(1000);
    await logBalance(ownerAddress);
    console.log("root chain info: ", await fastx.rootChainInfo.getInfo());
    const utxos = await getUTXOs();
    for(const utxo of utxos){
        const [blknum, txindex, oindex, contractAddress, amount, tokenid] = utxo;
        if (blknum % 1000 != 0) {
            console.log("UTXO", utxo);
            await fastx.sendTransaction (blknum, txindex, oindex,
               0, 0, 0,
               ownerAddress, "0x0", amount * 0.7, 0,
               ownerAddress, "0x0", amount * 0.3, 0,
               0, null, null,
               ownerAddress, ownerAddress
            );
            await sleep(2000);
            const newUtxos = await getUTXOs();
            const cUtxo = newUtxos.sort((a, b) => fastx.getUtxoPos(b[0], b[1], b[2]) - fastx.getUtxoPos(a[0], a[1], a[2]))[0];
            await fastx.startExit(blknum, txindex, oindex, contractAddress, amount, tokenid);
            console.log("root chain info: ", await fastx.rootChainInfo.getInfo());
            console.log("get exit", await fastx.rootChainInfo.getExit(fastx.getUtxoPos(blknum, txindex, oindex)));
            console.log("cUtxo", cUtxo);
            await fastx.challengeExit(cUtxo[0], cUtxo[1], cUtxo[2], 0);
            await sleep(1000);
            console.log("get exit", await fastx.rootChainInfo.getExit(fastx.getUtxoPos(blknum, txindex, oindex)));
            break;
        }
    }
};


export default testChallengeExit;


if (typeof require != 'undefined' && require.main == module) {
    testChallengeExit();
}