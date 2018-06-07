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
    /**
     * FastX wallet client.
     * @constructor
     * @param {object} options - options including debug, gethRpc, fastXRpc, rootChainAddress.
     */
    constructor(options) {
        if (!options) options = {};
        console.log(options);

        this.debug = options.debug || false;

        console.log('debug: '+this.debug);

        this.web3 = getWeb3(options.gethRpc || 'http://localhost:8545');
        this.fastXRpc = options.fastXRpc || 'http://localhost:8546/jsonrpc';
        this.rootChainAddress = options.rootChainAddress || undefined;
        this.defaultAccount = options.defaultAccount || undefined;

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

    /**
     * Deposit assets to the FastX chain.
     * @method
     * @param {string} contractAddress - the smart contract address for the depositing asset.
     * @param {number} tokenid - token id for the asset, 0 if not applicable.
     * @param {string} amount - the depositing amount.
     * @param {Object} options - including from: the asset owner's address.
     */
    deposit (contractAddress, tokenid, amount, options={}) {
        let account = options.from;
        if (!account) {
            if (this.defaultAccount) account = this.defaultAccount;
            else throw new Error('No default account specified!');
        } 
        if (this.debug)
            console.log("deposit contractAddress: " + contractAddress +
                ", amount: " + amount +
                ", tokenid: " + tokenid +
                ", account: " + account);
        return this.rootChain.methods.deposit(
                contractAddress, amount, tokenid
            ).send(
                {from: account, value: amount}
            ).on('transactionHash',
                (hash) => {
                    if (this.debug) console.log(hash);
                }
            );
    };

    getBalance (address, block="latest") {
        if (!address && this.defaultAccount) address = this.defaultAccount;
        return this.makeChildChainRpcRequest("get_balance", [address, block]);
    };

    getUTXO (address, block="latest") {
        if (!address && this.defaultAccount) address = this.defaultAccount;
        return this.makeChildChainRpcRequest("get_utxo", [address, block]);
    };

    unlockAccount(account, password, duration=1000) {
        console.log('unlocking account: '+account);
        return this.web3.personal.unlockAccount(account, password, duration);
    };

    /**
     * Send raw transaction.
     * @method
     * @param {number} blknum1 - block number of input 1.
     * @param {number} txindex1 - transaction number in that block for input 1.
     * @param {number} oindex1 - output number of that transaction for input 1.
     * @param {number} blknum2 - block number of input 2.
     * @param {number} txindex2 - transaction number in that block for input 2.
     * @param {number} oindex2 - output number of that transaction for input 2.
     * @param {string} newowner1 - owner of output 1.
     * @param {string} contractaddress1 - asset address for output 1, 0x0 if ETH.
     * @param {number} amount1 - the amount of asset for that address.
     * @param {number} tokenid1 - asset id for that address, 0 if not applicable.
     * @param {string} newowner2 - owner of output 1.
     * @param {string} contractaddress2 - asset address for output 2, 0x0 if ETH.
     * @param {number} amount2 - the amount of asset for that address.
     * @param {number} tokenid2 - asset id for that address, 0 if not applicable.
     * @param {number} [fee] - transacton fee.
     * @param {number} [expiretimestamp] - expiration time for the transaction.
     * @param {number} [salt] - salt.
     * @param {string} [sign1] - owner1's signature.
     * @param {string} [sign2] - owner2's signature.
     * @param {string} [address1] - owner1's receiving address.
     * @param {string} [address2] - owner2's receiving address.
     */
    async sendTransaction (blknum1, txindex1, oindex1,
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
            if (this.debug) console.log("sending transaction ...");
            return this.makeChildChainRpcRequest("apply_transaction", [txEncoded.toString('hex')]);
        }
        
        let afterSign1 = async (sign1) => {
            if (sign2 == null) {
                let hash2 = this.hashTransaction([blknum2, txindex2, oindex2,
                   contractaddress1, amount1, tokenid1,
                   newowner2, contractaddress2, amount2, tokenid2,
                   fee, expiretimestamp, salt]);
                sign2 = await this.sign(hash2);
            }
            if (this.debug) console.log('Sign2: '+sign2);
            return afterSign2(sign1, sign2);
        }
        
        if (sign1 == null){
            let hash1 = this.hashTransaction([blknum1, txindex1, oindex1,
               newowner1, contractaddress1, amount1, tokenid1,
               contractaddress2, amount2, tokenid2,
               fee, expiretimestamp, salt]);
            if (this.debug) console.log('Hash1: '+hash1);
            sign1 = await this.sign(hash1);
        } 
        if (this.debug) console.log('Sign1: '+sign1)
        return afterSign1(sign1);
    };

    /**
     * Send ETH.
     * @method
     * @param {string} to - the receiver's address.
     * @param {string} amount - the amount to send, in wei.
     * @param {Object} options - including from: the sender's address.
     */
    async sendEth(to, amount, options={}) {
        let from = options.from || this.defaultAccount;
        console.log('from: '+from);
        let utxos = (await this.getUTXO(from)).data.result;
        if (this.debug) console.log(utxos);
        let utxo;
        for(let i in utxos){
            utxo = utxos[utxos.length - i - 1];
            const [blknum, txindex, oindex, contract, balance, tokenid] = utxo;
            if (balance > 0){
                if (this.debug) console.log(blknum, txindex, oindex, contract, balance, tokenid);
                return this.sendTransaction(
                    blknum, txindex, oindex, 
                    0, 0, 0, 
                    from, contract, balance - amount, tokenid, 
                    to, contract, amount, tokenid);
            }
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