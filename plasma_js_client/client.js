import axios from 'axios';
import rlp from 'rlp';

import getWeb3 from "./utils/getWeb3";
import Account from "eth-lib/lib/account";
import RootChain from "../contract_data/RootChain.abi";

export const root = (typeof self === 'object' && self.self === self && self) ||
  (typeof global === 'object' && global.global === global && global) ||
  this;

function normalizeAddress (address) {
    if (!address) {
        throw new Error();
    }
    if ('0x' == address.substr(0,2)) {
        address = address.substr(2);
    }
    if (address == 0) address = '0'.repeat(40);
    return new Buffer(address, 'hex');
};

function encodeTransaction (txRaw) {
    return rlp.encode(txRaw);
};

class Client {
    constructor(options) {
        if (!options) options = {};
        console.log(options);

        this.debug = options.debug || false;

        this.web3 = getWeb3(options.gethRpc || 'http://localhost:8545');
        this.fastXRpc = options.fastXRpc || 'http://localhost:8546/jsonrpc';
        this.rootChainAddress = options.rootChainAddress || '';

        this.rootChain = new this.web3.eth.Contract(RootChain, this.rootChainAddress);
    }

    makeChildChainRpcRequest (method, params) {
        return axios.post(this.fastXRpc, {
            "method": method,
            "params": params,
            "jsonrpc": "2.0",
            "id": 0
        });
    };

    hashTransaction (txRaw) {
        let txEncoded = encodeTransaction(txRaw);
        return this.web3.utils.sha3(txEncoded);
    };

    sign (hash, address) {
        if (root.process){
            if (! process.env.AUTHORITY_KEY) {
                console.error('No priv key! Did you set the AUTHORITY_KEY in .env file? Abort.');
                process.exit(-1);
            }
            return new Promise((resolve, reject) => resolve(Account.sign(hash, process.env.AUTHORITY_KEY)));
        } else {
            return this.web3.eth.sign(hash, address);
        }
    };

    sendDeposit (contractAddress, amount, tokenid, owner) {
        console.log("deposit contractAddress: " + contractAddress +
            ", amount: " + amount +
            ", tokenid: " + tokenid +
            ", owner: " + owner);
        return this.rootChain.methods.deposit(
            contractAddress, amount, tokenid
        ).send(
            {from: owner, value: amount}
        ).on('transactionHash',
            function(hash){
                if (this.debug) console.log(hash);
            }
        );
    };

    getBalance (address, block="latest") {
        return this.makeChildChainRpcRequest("get_balance", [address, block]);
    };

    getUTXO (address, block="latest") {
        return this.makeChildChainRpcRequest("get_utxo", [address, block]);
    };

    unlockAccount(account, password, duration=1000) {
        console.log('unlocking account: '+account);
        return this.web3.personal.unlockAccount(account, password, duration);
    };

    sendTransaction (blknum1, txindex1, oindex1,
           blknum2, txindex2, oindex2,
           newowner1, contractaddress1, amount1, tokenid1,
           newowner2, contractaddress2, amount2, tokenid2,
           fee=0, expiretimestamp=null, salt=null,
           sign1=null, sign2=null, address1=null, address2=null) {
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
        contractaddress1 = normalizeAddress(contractaddress1);
        newowner1 = normalizeAddress(newowner1);
        contractaddress2 = normalizeAddress(contractaddress2);
        newowner2 = normalizeAddress(newowner2);
        
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
            return this.makeChildChainRpcRequest("apply_transaction", [txEncoded.toString('hex')]);
        }
        
        let afterSign1 = (sign1) => {
            if (sign2 == null) {
                let hash2 = this.hashTransaction([blknum2, txindex2, oindex2,
                   contractaddress1, amount1, tokenid1,
                   newowner2, contractaddress2, amount2, tokenid2,
                   fee, expiretimestamp, salt]);
                this.sign(hash2).then((sign2) => {
                    afterSign2(sign1, sign2);
                });
            } else {
                afterSign2(sign1, sign2);
            }
        }
        
        if (sign1 == null){
            let hash1 = this.hashTransaction([blknum1, txindex1, oindex1,
               newowner1, contractaddress1, amount1, tokenid1,
               contractaddress2, amount2, tokenid2,
               fee, expiretimestamp, salt]);
            console.log('hash1');
            this.sign(hash1).then(function(data) {console.log(data)})
            this.sign(hash1).then(afterSign1);
        } else {
            afterSign1(sign1);
        }
    };

    sendPsTransaction (blknum1, txindex1, oindex1,
           newowner1, contractaddress1, amount1, tokenid1,
           contractaddress2, amount2, tokenid2,
           fee=0, expiretimestamp=null, salt=null,
           sign1=null, address1=null) {
        if (!root.process){
            if (sign1 == null && address1 == null){
                throw new Error("sign1 and address1 can not both be none");
            }
        }
        if (expiretimestamp == null){
            expiretimestamp = Math.ceil(Date.now() / 1000) + 3600;
        }
        if (salt == null) {
            salt = Math.floor(Math.random() * 1000000000000);
        }
        contractaddress1 = normalizeAddress(contractaddress1);
        newowner1 = normalizeAddress(newowner1);
        contractaddress2 = normalizeAddress(contractaddress2);
        
        let txRaw = [blknum1, txindex1, oindex1,
           0, 0, 0,
           newowner1, contractaddress1, amount1, tokenid1,
           normalizeAddress("0x0"), contractaddress2, amount2, tokenid2,
           fee, expiretimestamp, salt];
                
        let afterSign1 = (sign1) => {
            sign1 = sign1.substr(2);
            let txRawWithKeys = txRaw.concat([new Buffer(sign1, 'hex'), new Buffer("0", 'hex')]);
            let txEncoded = rlp.encode(txRawWithKeys);
            console.log("sending ps transaction ...");
            return this.makeChildChainRpcRequest("apply_ps_transaction", [txEncoded.toString('hex')]);
        }
        
        if (sign1 == null){
            let hash1 = this.hashTransaction([blknum1, txindex1, oindex1,
               newowner1, contractaddress1, amount1, tokenid1,
               contractaddress2, amount2, tokenid2,
               fee, expiretimestamp, salt]);
            this.sign(hash1).then(afterSign1);
        } else {
            afterSign1(sign1);
        }
    };

    sendPsTransactionFill (psTransaction,
           blknum2, txindex2, oindex2,
           newowner2,
           sign2=null, address2=null) {
        if (!root.process){
            if (sign2 == null && address2 == null){
                throw new Error("sign2 and address2 can not both be none");
            }
        }
        
        const blknum1 = psTransaction.blknum1;
        const txindex1 = psTransaction.txindex1;
        const oindex1 = psTransaction.oindex1;
        const newowner1 = "0x" + psTransaction.newowner1;
        const contractaddress1 = "0x" + psTransaction.contractaddress1;
        const amount1 = psTransaction.amount1;
        const tokenid1 = psTransaction.tokenid1;
        const contractaddress2 = "0x" + psTransaction.contractaddress2;
        const amount2 = psTransaction.amount2;
        const tokenid2 = psTransaction.tokenid2;
        const fee = psTransaction.fee;
        const expiretimestamp = psTransaction.expiretimestamp;
        const salt = psTransaction.salt;
        
        const sign1 = "0x" + psTransaction.sig1;
        
        this.sendTransaction(blknum1, txindex1, oindex1,
           blknum2, txindex2, oindex2,
           newowner1, contractaddress1, amount1, tokenid1,
           newowner2, contractaddress2, amount2, tokenid2,
           fee, expiretimestamp, salt,
           sign1, sign2, null, address2);
    };

    getAllPsTransactions () {
        return this.makeChildChainRpcRequest("get_all_ps_transactions", []);
    };
}

export default Client;