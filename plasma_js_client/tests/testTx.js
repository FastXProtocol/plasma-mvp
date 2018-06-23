import fastx, {ownerAddress, receiverAddress} from "./config";
import {sleep} from "./utils";


const logBalance = async (address) => {
    console.log("\naddress: ", address );
    console.log("balance: ", await fastx.getEthBalance(address));
    let utxos = (await fastx.getAllUTXO(address)).data.result;
    console.log('\n', utxos);
}


const testTx = async () => {
    console.log("---------- testing transaction ----------");

    let address;
    let address2;

    if (process.env.ENV == "LOCAL") {
        address = ownerAddress;
        address2 = receiverAddress;
    } else {
        address = '0xd103c64735b324161518f17cef15d1e27e0b9f3e';
        address2 = '0xd103c64735b324161518f17cef15d1e27e0b9f3e';
    }

    await fastx.deposit("0x0", 100, 0, {from:address});
    await sleep(1000);

    await logBalance(address);
    if ( address != address2 ) {
        await logBalance(address2);
    }

    let txQueue = await fastx.sendEth(address2, 30, {from:address});
    console.log('\ntxQueue: ', txQueue);

    await logBalance(address);
    if ( address != address2 ) {
        await logBalance(address2);
    }
};


export default testTx;


if (typeof require != 'undefined' && require.main == module) {
    testTx();
}