import fastx from "./config";


const testRootChainCall = async () => {
    console.log(await fastx.rootChainInfo.getInfo());
};


export default testRootChainCall;


if (typeof require != 'undefined' && require.main == module) {
    testRootChainCall();
}