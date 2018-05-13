import axios from 'axios';
import rlp from 'rlp';

import getWeb3 from "./utils/getWeb3";
import config from "./config";
import RootChain from "../contract_data/RootChain";


const web3 = getWeb3();
const rootChain = new web3.eth.Contract(RootChain.abi, config.rootChainAddress);


export const client = {
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
    hashTransaction: (txRaw) => {
        let txEncoded = rlp.encode(txRaw);
        return web3.utils.sha3(txEncoded);
    },
    createTransaction: (blk, txindex, oindex, contract, amountSend, amount, owner1, owner2) => {
        let blk_num = blk;
        let tx_index = txindex;
        let o_index = oindex;
        let amSend = amountSend;
        let amRemain = amount - amountSend;
    
        if (amSend <= 0) {
          throw new Error();
        }
        if (amRemain < 0) {
          throw new Error();
        }
    
        let newowner1, newowner2;
    
        if (!owner1) {
          throw new Error();
        } else {
          newowner1 = client.normalizeAddress(owner1);
        }
        if (amSend > 0 && amRemain > 0 && !owner2 ) {
          // there's some change, but no owner2 is specified
          throw new Error();
        } else if (amRemain > 0) {
          newowner2 = client.normalizeAddress(owner2);
        } else {
            owner2 = 0;
            newowner2 = client.normalizeAddress('0x0');
        }
    
        let token_contract = new Buffer(contract, 'hex');
    
        return [blk_num, tx_index, o_index, 0, 0, 0,
          newowner1, token_contract, amSend, 0, 
          newowner2, owner2 ? token_contract:client.normalizeAddress('0x0'), amRemain, 0];
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
    sendTransaction: (blk, txindex, oindex, contract, amountSend, amount, owner1, owner2) => {
        let txRaw = client.createTransaction(blk, txindex, oindex, contract, amountSend, amount, owner1, owner2);
        let txHash = client.hashTransaction(txRaw);

        web3.eth.sign(txHash, owner2).then(keySigned => {
            keySigned = keySigned.substr(2);
            console.log(keySigned);
            let keySignedBytes = new Buffer(keySigned, 'hex');

            let txRawWithKeys = txRaw.concat([keySignedBytes, keySignedBytes]);
            var txEncoded = rlp.encode(txRawWithKeys);
            console.log("sending transaction ...");
            return client.makeChildChainRpcRequest("apply_transaction", [txEncoded.toString('hex')]);
        });
    }
}

export default client;