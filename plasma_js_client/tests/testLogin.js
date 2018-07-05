import fastx, {ownerAddress} from "./config";


const testLogin = async () => {
    console.log("address", ownerAddress);
    const loginString = fastx.createLoginString("testApp");
    console.log("loginString", loginString);
    const sig = await fastx.signLoginString(loginString, ownerAddress);
    console.log("sig", sig);
    const address = fastx.getLoginAddress(loginString, sig);
    console.log("address", address);
    const check = fastx.checkLoginString(loginString, sig, ownerAddress);
    console.log("check", check);
};


export default testLogin;


if (typeof require != 'undefined' && require.main == module) {
    testLogin();
}