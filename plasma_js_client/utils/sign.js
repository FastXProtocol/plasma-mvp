import Account from "eth-lib/lib/account";
import getWeb3 from "./getWeb3";


const root = (typeof self === 'object' && self.self === self && self) ||
  (typeof global === 'object' && global.global === global && global) ||
  this;
const web3 = getWeb3();


export default (hash, address) => {
    if (root.process){
        if (! process.env.AUTHORITY_KEY) {
            console.error('No priv key! Did you set the AUTHORITY_KEY in .env file? Abort.');
            process.exit(-1);
        }
        return new Promise((resolve, reject) => resolve(Account.sign(hash, process.env.AUTHORITY_KEY)));
    } else {
        return web3.eth.sign(hash, address);
    }
}