import fastx, {receiverAddress} from "./config";
import {logBalance, getPsTx} from "./utils";


const testPsTx = async () => {
    console.log("---------- testing partially signed transaction ----------");
    console.log("1. ps tranctions", await getPsTx());

    await fastx.sellToken("0x0", 1, 0);

    await logBalance();

    const psTransactions = await getPsTx();
    console.log("2. ps tranctions", psTransactions);
    
    const psTransaction = psTransactions[0];
    console.log(psTransaction);
    if (psTransaction) {
        await fastx.sendPsTransactionFill(psTransaction, 0, 0, 0, receiverAddress);
        console.log("3. ps tranctions", await getPsTx());
    
        await logBalance();
        await logBalance(receiverAddress);
    }
};


export default testPsTx;


if (typeof require != 'undefined' && require.main == module) {
    testPsTx();
}