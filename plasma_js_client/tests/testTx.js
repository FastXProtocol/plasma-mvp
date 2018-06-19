import fastx, {receiverAddress} from "./config";
import {logBalance, sleep} from "./utils";


const testTx = async () => {
    console.log("---------- testing transaction ----------");
    await fastx.deposit("0x0", 100, 0);
    await sleep(1000);
    await logBalance();

    await fastx.sendEth(receiverAddress, 150);
    await sleep(500);

    await logBalance();
    await logBalance(receiverAddress);
};


export default testTx;


if (typeof require != 'undefined' && require.main == module) {
    testTx();
}