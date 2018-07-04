import fastx, {ownerAddress, erc20ContractAddress, erc20Contract, erc721ContractAddress, erc721Contract} from "./config";
import {getUTXOs, logBalance, sleep} from "./utils";
import normalizeAddress from "../utils/normalizeAddress";


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


const getDepositUtxo = async (depositContractAddress) => {
    const utxos = await getUTXOs();
    for(const utxo of utxos){
        const [blknum, txindex, oindex, contractAddress, amount, tokenid] = utxo;
        if (blknum % 1000 != 0 && normalizeAddress(contractAddress).toString("hex") == normalizeAddress(depositContractAddress).toString("hex")) {
            console.log("UTXO", utxo);
            return utxo;
        }
    }
    throw new Error("no available utxo");
}


const normalExit = async (exitContractAddress) => {
    const utxos = await getUTXOs();
    for(const utxo of utxos){
        const [blknum, txindex, oindex, contractAddress, amount, tokenid] = utxo;
        if (blknum % 1000 == 0 && normalizeAddress(contractAddress).toString("hex") == normalizeAddress(exitContractAddress).toString("hex")) {
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
            return;
        }
    }
    throw new Error("no available utxo");
}


const testEthDepositExit = async () => {
    console.log("---------- Eth Deposit Exit ----------");
    const firstBalance = await fastx.web3.eth.getBalance(ownerAddress);
    console.log("firstBalance", firstBalance);
    await testDepositExit("0x0", 1000000000000000000, 0);
    const finalBalance = await fastx.web3.eth.getBalance(ownerAddress);
    console.log("finalBalance", wei2eth(finalBalance), wei2eth(finalBalance - firstBalance));
}


const testErc20DepositExit = async () => {
    console.log("---------- ERC20 Deposit Exit ----------");
    const firstBalance = await erc20Contract.methods.balanceOf(ownerAddress).call();
    console.log("firstBalance", firstBalance);
    await fastx.approve(erc20ContractAddress, 100, 0);
    await testDepositExit(erc20ContractAddress, 100, 0);
    await sleep(500);
    const finalBalance = await erc20Contract.methods.balanceOf(ownerAddress).call();
    console.log("finalBalance", finalBalance, finalBalance - firstBalance);
}


const testErc721DepositExit = async () => {
    console.log("---------- ERC721 Deposit Exit ----------");
    console.log("firstBalance", await erc721Contract.methods.ownerOf(888).call());
    await fastx.approve(erc721ContractAddress, 0, 888);
    await testDepositExit(erc721ContractAddress, 0, 888);
    await sleep(500);
    console.log("finalBalance", await erc721Contract.methods.ownerOf(888).call());
}


const testEthNormalExit = async () => {
    console.log("---------- Eth Normal Exit ----------");
    const firstEthBalance = await fastx.web3.eth.getBalance(ownerAddress);
    console.log("firstEthBalance", wei2eth(firstEthBalance));
    await fastx.deposit("0x0", 1000000000000000000, 0);
    await sleep(1000);
    await fastx.sendEth(ownerAddress, 1000000000000000000 * 0.7, {from:ownerAddress});
    await sleep(500);
    await normalExit("0x0");
    console.log("root chain info: ", await fastx.rootChainInfo.getInfo());
    await sleep(1000);
    await logBalance(ownerAddress);
    await sleep(3000);
    const finalEthBalance = await fastx.web3.eth.getBalance(ownerAddress);
    console.log("finalEthBalance", wei2eth(finalEthBalance), wei2eth(finalEthBalance - firstEthBalance));
}


const testErc20NormalExit = async () => {
    console.log("---------- ERC20 Normal Exit ----------");
    const firstBalance = await erc20Contract.methods.balanceOf(ownerAddress).call();
    console.log("firstBalance", firstBalance);
    await fastx.approve(erc20ContractAddress, 100, 0);
    await fastx.deposit(erc20ContractAddress, 100, 0);
    await sleep(1000);
    const erc20Utxo = await getDepositUtxo(erc20ContractAddress);
    await fastx.sendTransaction (erc20Utxo[0], erc20Utxo[1], erc20Utxo[2],
       0, 0, 0,
       ownerAddress, erc20ContractAddress, 1, 0,
       ownerAddress, erc20ContractAddress, erc20Utxo[4] - 1, 0,
       0, null, null,
       ownerAddress, ownerAddress
    );
    await sleep(1000);
    await normalExit(erc20ContractAddress);
    console.log("root chain info: ", await fastx.rootChainInfo.getInfo());
    await sleep(1000);
    await logBalance(ownerAddress);
    await sleep(3000);
    const finalBalance = await erc20Contract.methods.balanceOf(ownerAddress).call();
    console.log("finalBalance", finalBalance, finalBalance - firstBalance);
}


const testExit = async () => {
    await testEthDepositExit();
    await testErc20DepositExit();
    await testErc721DepositExit();
    await testEthNormalExit();
    await testErc20NormalExit();
};


export default testExit;


if (typeof require != 'undefined' && require.main == module) {
    testExit();
}