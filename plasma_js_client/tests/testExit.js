import fastx, {ownerAddress} from "./config";
import {getUTXOs, logBalance, sleep} from "./utils";


const testDepositExit = async (depositContractAddress, depositAmount, depositTokenId) => {
    console.log("testStartDepositExit");
    const firstEthBalance = await fastx.web3.eth.getBalance(ownerAddress);
    console.log("firstEthBalance", firstEthBalance);
    await fastx.deposit(depositContractAddress, depositAmount, depositTokenId);
    await sleep(1000);
    const depositedEthBalance = await fastx.web3.eth.getBalance(ownerAddress);
    console.log("depositedEthBalance", depositedEthBalance, depositedEthBalance - firstEthBalance);
    console.log("root chain info: ", await fastx.rootChainInfo.getInfo());
    const utxos = await getUTXOs();
    for(const utxo of utxos){
        const [blknum, txindex, oindex, contractAddress, amount, tokenid] = utxo;
        if (blknum % 1000 != 0) {
            console.log("UTXO", utxo);
            const depositPos = blknum * 1000000000 + txindex * 10000 + oindex;
            console.log(depositPos, contractAddress, amount, tokenid)
            await fastx.startExit(blknum, txindex, oindex, contractAddress, amount, tokenid);
            console.log("startExit sent");
            console.log("root chain info: ", await fastx.rootChainInfo.getInfo());
            await sleep(1000);
            await logBalance(ownerAddress);
            await sleep(3000);
            const finalEthBalance = await fastx.web3.eth.getBalance(ownerAddress);
            console.log("finalEthBalance", finalEthBalance, finalEthBalance - firstEthBalance);
            break;
        }
    }
};


const testExit = async () => {
    await testDepositExit("0x0", 1000000000000000000, 0);
};


export default testExit;


if (typeof require != 'undefined' && require.main == module) {
    testExit();
}