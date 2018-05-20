import axios from 'axios';
import rlp from 'rlp';

import getWeb3 from "./utils/getWeb3";
import sign from "./utils/sign";
import config from "./config";
import RootChain from "../contract_data/RootChain";


const root = (typeof self === 'object' && self.self === self && self) ||
  (typeof global === 'object' && global.global === global && global) ||
  this;
const web3 = getWeb3();
const rootChain = new web3.eth.Contract(RootChain.abi, config.rootChainAddress);


const client = {
    web3: web3,
    makeChildChainRpcRequest: (method, params) => {
        return axios.post(config.fastXRpc, {
            "method": method,
            "params": params,
            "jsonrpc": "2.0",
            "id": 0
        })
    },
    normalizeAddress: (address) => {
        if (!address) {
            throw new Error();
        }
        if ('0x' == address.substr(0,2)) {
            address = address.substr(2);
        }
        if (address == 0) address = '0'.repeat(40);
        return new Buffer(address, 'hex');
    },
    encodeTransaction: (txRaw) => {
        return rlp.encode(txRaw);
    },
    hashTransaction: (txRaw) => {
        let txEncoded = client.encodeTransaction(txRaw);
        return web3.utils.sha3(txEncoded);
    },
    sendDeposit: (contractAddress, amount, tokenid, owner) => {
        console.log("deposit contractAddress: " + contractAddress +
            ", amount: " + amount +
            ", tokenid: " + tokenid +
            ", owner: " + owner);
        return rootChain.methods.deposit(contractAddress, amount, tokenid).send({from: owner, value: amount});
    },
    getBalance: (address, block="latest") => {
        return client.makeChildChainRpcRequest("get_balance", [address, block]);
    },
    getUTXO: (address, block="latest") => {
        return client.makeChildChainRpcRequest("get_utxo", [address, block]);
    },
    sendTransaction: (blknum1, txindex1, oindex1,
           blknum2, txindex2, oindex2,
           newowner1, contractaddress1, amount1, tokenid1,
           newowner2, contractaddress2, amount2, tokenid2,
           fee=0, expiretimestamp=null, salt=null,
           sign1=null, sign2=null, address1=null, address2=null) => {
        if (!root.process){
            if (sign1 == null && address1 == null){
                throw new Error("sign1 and address1 can not both be none");
            }
            if (sign2 == null && address2 == null){
                throw new Error("sign2 and address2 can not both be none");
            }
        }
        if (expiretimestamp == null){
            expiretimestamp = Math.ceil(Date.now() / 1000) + 3600;
        }
        if (salt == null) {
            salt = Math.floor(Math.random() * 1000000000000);
        }
        contractaddress1 = client.normalizeAddress(contractaddress1);
        newowner1 = client.normalizeAddress(newowner1);
        contractaddress2 = client.normalizeAddress(contractaddress2);
        newowner2 = client.normalizeAddress(newowner2);
        
        let txRaw = [blknum1, txindex1, oindex1,
           blknum2, txindex2, oindex2,
           newowner1, contractaddress1, amount1, tokenid1,
           newowner2, contractaddress2, amount2, tokenid2,
           fee, expiretimestamp, salt];
        
        let afterSign2 = (sign1, sign2) => {
            sign1 = sign1.substr(2);
            sign2 = sign2.substr(2);
            let txRawWithKeys = txRaw.concat([new Buffer(sign1, 'hex'), new Buffer(sign2, 'hex')]);
            let txEncoded = rlp.encode(txRawWithKeys);
            console.log("sending transaction ...");
            return client.makeChildChainRpcRequest("apply_transaction", [txEncoded.toString('hex')]);
        }
        
        let afterSign1 = (sign1) => {
            if (sign2 == null) {
                let hash2 = client.hashTransaction([blknum2, txindex2, oindex2,
                   contractaddress1, amount1, tokenid1,
                   newowner2, contractaddress2, amount2, tokenid2,
                   fee, expiretimestamp, salt]);
                sign(hash2).then((sign2) => {
                    afterSign2(sign1, sign2);
                });
            } else {
                afterSign2(sign1, sign2);
            }
        }
        
        if (sign1 == null){
            let hash1 = client.hashTransaction([blknum1, txindex1, oindex1,
               newowner1, contractaddress1, amount1, tokenid1,
               contractaddress2, amount2, tokenid2,
               fee, expiretimestamp, salt]);
            sign(hash1).then(afterSign1);
        } else {
            afterSign1(sign1);
        }
    }
}

export default client;