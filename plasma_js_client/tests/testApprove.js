import {erc20ContractAddress, erc721ContractAddress} from "./config";
import {approveDeposit} from "./utils";


const testApprove = async () => {
    await approveDeposit(erc20ContractAddress, 100, 0);
    await approveDeposit(erc721ContractAddress, 0, 888);
}


export default testApprove;


if (typeof require != 'undefined' && require.main == module) {
    testApprove();
}