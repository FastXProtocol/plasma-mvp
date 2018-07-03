import fastx, {ownerAddress, erc20ContractAddress, erc20Contract, erc721ContractAddress, erc721Contract} from "./config";
import {getUTXOs, logBalance, sleep} from "./utils";


const wei2eth = (wei) => {
    return fastx.web3.utils.fromWei(""+wei, 'ether')
}


const testDepositExit = async (depositContractAddress, depositAmount, depositTokenId) => {
    await fastx.deposit(depositContractAddress, depositAmount, depositTokenId);
    await sleep(1000);
    await logBalance(ownerAddress);
    console.log("root chain info: ", await fastx.rootChainInfo.getInfo());
    const utxos = await getUTXOs();
    for(const utxo of utxos){
        const [blknum, txindex, oindex, contractAddress, amount, tokenid] = utxo;
        if (blknum % 1000 != 0) {
            console.log("UTXO", utxo);
            await fastx.startExit(blknum, txindex, oindex, contractAddress, amount, tokenid);
            console.log("root chain info: ", await fastx.rootChainInfo.getInfo());
            await sleep(1000);
            await logBalance(ownerAddress);
            await sleep(3000);
            break;
        }
    }
};


const testNormalExit = async () => {
    console.log("testStartNormalExit");
    const firstEthBalance = await fastx.web3.eth.getBalance(ownerAddress);
    console.log("firstEthBalance", wei2eth(firstEthBalance));
    await fastx.deposit("0x0", 1000000000000000000, 0);
    await sleep(1000);
    await fastx.sendEth(ownerAddress, 1000000000000000000 * 0.7, {from:ownerAddress});
    await sleep(500);
    const utxos = await getUTXOs();
    for(const utxo of utxos){
        const [blknum, txindex, oindex, contractAddress, amount, tokenid] = utxo;
        if (blknum % 1000 == 0) {
            console.log("UTXO", utxo);
            while(1){
                const currentChildBlock = await fastx.rootChainInfo.getCurrentChildBlock();
                if (blknum < currentChildBlock) {
                     break;
                }
                console.log("wait for block submit");
                await sleep(1000);
            }
            await fastx.startExit(blknum, txindex, oindex, contractAddress, amount, tokenid);
            console.log("root chain info: ", await fastx.rootChainInfo.getInfo());
            await sleep(1000);
            await logBalance(ownerAddress);
            await sleep(3000);
            const finalEthBalance = await fastx.web3.eth.getBalance(ownerAddress);
            console.log("finalEthBalance", wei2eth(finalEthBalance), wei2eth(finalEthBalance - firstEthBalance));
            break;
        }
    }
};


const testExit = async () => {
/*
    console.log("---------- Eth Deposit Exit ----------");
    const firstBalance = await fastx.web3.eth.getBalance(ownerAddress);
    console.log("firstBalance", firstBalance);
    await testDepositExit("0x0", 1000000000000000000, 0);
    const finalBalance = await fastx.web3.eth.getBalance(ownerAddress);
    console.log("finalBalance", wei2eth(finalBalance), wei2eth(finalBalance - firstBalance));
*/

    console.log("---------- ERC20 Deposit Exit ----------");
    const firstBalance = await erc20Contract.methods.balanceOf(ownerAddress).call();
    console.log("firstBalance", firstBalance);
    await fastx.approve(erc20ContractAddress, 100, 0);
    await testDepositExit(erc20ContractAddress, 100, 0);
    await sleep(500);
    const finalBalance = await erc20Contract.methods.balanceOf(ownerAddress).call();
    console.log("finalBalance", finalBalance, finalBalance - firstBalance);

//     await testNormalExit();
};


export default testExit;


if (typeof require != 'undefined' && require.main == module) {
    testExit();
}