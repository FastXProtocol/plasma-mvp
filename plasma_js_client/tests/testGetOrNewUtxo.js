import fastx, {ownerAddress, erc20ContractAddress, erc20ContractAddress2} from "./config";
import {approveDeposit} from "./utils";


const testGetOrNewUtxo = async() => {
    await approveDeposit(ownerAddress, erc20ContractAddress2, 3, 0);
    await approveDeposit(ownerAddress, erc20ContractAddress2, 7, 0);
    console.log(await fastx.getOrNewUtxo(10, erc20ContractAddress2));
    console.log(await fastx.getOrNewUtxo(7, erc20ContractAddress2));
};


export default testGetOrNewUtxo;


if (typeof require != 'undefined' && require.main == module) {
    testGetOrNewUtxo();
}