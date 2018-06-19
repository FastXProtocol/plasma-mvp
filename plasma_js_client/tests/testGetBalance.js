import fastx from "./config";

const testBalance = async () => {
    console.log("---------- testing getBalance ----------");

    const address = fastx.defaultAccount
    let res = (await fastx.getEthBalance(address));
    console.log("\naddress: ", address );
    console.log("balance: ", res);
};

export default testBalance;

if (typeof require != 'undefined' && require.main == module) {
    testBalance();
}