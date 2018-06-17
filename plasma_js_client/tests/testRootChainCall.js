import fastx from "./config";
import {logBalance} from "./utils";


const testRootChainCall = async () => {
    console.log(await fastx.rootChainInfo.getInfo());
};


export default testRootChainCall;


if (typeof require != 'undefined' && require.main == module) {
    testRootChainCall();
}