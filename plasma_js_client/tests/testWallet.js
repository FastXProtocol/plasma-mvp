import fastx, {ownerAddress, receiverAddress, erc20ContractAddress2} from "./config";
import {sleep} from "./utils";


const testWallet = async() => {
    // Get ERC20 Info
    console.log("ERC20 Info", await fastx.getErc20Info(erc20ContractAddress2));

    // Get ETH balance in Etherem
    console.log("ETH balance in Etherem", await fastx.web3.eth.getBalance(ownerAddress));

    // Get ERC20 balance in Etherem
    console.log("ERC20 balance in Etherem", await fastx.getErc20Interface(erc20ContractAddress2).methods.balances(ownerAddress).call());

    // Approve ERC20
    await fastx.approve(erc20ContractAddress2, 10, 0);

    // Deposit ERC20
    await fastx.deposit(erc20ContractAddress2, 10, 0);

    // Deposit ETH
    await fastx.deposit("0x0", 10, 0);

    await sleep(2000);

    // Get balance in FastX
    console.log("balance in FastX", await fastx.getBalance());
    
    // Send ERC20 to receiver
    await fastx.sendToken(receiverAddress, 3, erc20ContractAddress2);

    // Send ETH to receiver
    await fastx.sendToken("0x0", 3, erc20ContractAddress2);

    // Ready for exit
    const token = await fastx.getOrNewUtxo(5, "0x0");
    console.log("Ready for exit", token);

    await sleep(4000);
    // Start exit
    await fastx.startExitUTXO(token);

    // Get exit info
    console.log("exit info", await fastx.getExitUTXOInfo(token));
};


export default testWallet;


if (typeof require != 'undefined' && require.main == module) {
    testWallet();
}