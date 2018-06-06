/*
 * This function can access the browser's web3 provider (e.g. MetaMask)
 */

import Web3 from 'web3';


const root = (typeof self === 'object' && self.self === self && self) ||
  (typeof global === 'object' && global.global === global && global) ||
  this;

let web3 = null;


export default function getWeb3(rpcUrl) {
  if (typeof root.web3 === 'undefined') {
    // No web3 injected from the browser, use fallback...
    web3 = new Web3(rpcUrl || 'http://127.0.0.1:8545');
    root.web3 = web3;
  }

  // root.web3 == web3 most of the time, so we don't override the provided web3 and instead just wrap it in Web3
  var myWeb3 = new Web3(web3.currentProvider); 

  // The default account doesn't seem to be persisted, so copy it to our new instance
  myWeb3.eth.defaultAccount = root.web3.eth.defaultAccount;

  return myWeb3;
}
