import fastx, {erc20ContractAddress, erc721ContractAddress} from "./config";


const testErc20Info = async () => {
    let erc20Interface = fastx.getErc20Interface(erc20ContractAddress);
    console.log("totalSupply", await erc20Interface.methods.totalSupply().call());
    console.log("symbol", await erc20Interface.methods.symbol().call());
}


export default testErc20Info;


if (typeof require != 'undefined' && require.main == module) {
    testErc20Info();
}