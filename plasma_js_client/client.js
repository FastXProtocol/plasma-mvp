import axios from 'axios';
import rlp from 'rlp';

import getWeb3 from "./utils/getWeb3";
import normalizeAddress from "./utils/normalizeAddress";
import Account from "eth-lib/lib/account";
import RootChain from "../contract_data/RootChain.abi";
import Erc20Interface from "../contract_data/ERC20.abi";
import Erc721Interface from "../contract_data/ERC721Basic.abi";


export const root = (typeof self === 'object' && self.self === self && self) ||
  (typeof global === 'object' && global.global === global && global) ||
  this;


function encodeTransaction (txRaw) {
    return rlp.encode(txRaw);
};


class RootChainInfo {
    constructor({rootChain}) {
        this.rootChain = rootChain;
        this.simplePublicProperties = ["authority", "currentChildBlock", "currentDepositBlock", "childBlockInterval", "currentFeeExit"];
        this.simplePublicFunctions = ["getDepositBlock", "getNextExit"];
        this.simplePublicProperties.forEach(property => {
            this["get" + property.charAt(0).toUpperCase() + property.slice(1)] = () => {
                return this.makeRootChainCall(property);
            }
        });
        this.simplePublicFunctions.forEach(property => {
            this[property] = () => {
                return this.makeRootChainCall(property);
            }
        });
    }
    
    makeRootChainCall (method, params) {
        return this.rootChain.methods[method].apply(null, params).call();
    }
    
    async getInfo () {
        const info = {};
        await Promise.all([
            ...this.simplePublicProperties.map(x => "get" + x.charAt(0).toUpperCase() + x.slice(1)),
            ...this.simplePublicFunctions
        ].map(async (funcName) => {
            let name = funcName.slice(3);
            name = name.charAt(0).toLowerCase() + name.slice(1);
            try{
                info[name] = await this[funcName]();
            }catch(e){
                console.log(e)
                info[name] = null;
            }
        }));
        return info;
    }
}


class UTXO {
    constructor(_blkNum, _txIndex, _oIndex, _contract, _balance, _tokenId, _owner) {
        this.blkNum = _blkNum;
        this.txIndex = _txIndex;
        this.oIndex = _oIndex;
        this.contract = _contract;
        this.balance = _balance;
        this.tokenId = _tokenId;
        this.owner = _owner;
    }

    exists() {
        return this.balance > 0 ? true:false;
    }

    isEqual(aUtxo) {
        if ( this.blkNum == aUtxo.blkNum
            && this.txIndex == aUtxo.txIndex
            && this.oIndex == aUtxo.oIndex )
            return true;
        else
            return false;
    }
}


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

        const rootChain = new this.web3.eth.Contract(RootChain, this.rootChainAddress);
        this.rootChain = rootChain;
        this.rootChainInfo = new RootChainInfo({rootChain});
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
            if (address) {
                const addressFromKey = this.web3.eth.accounts.privateKeyToAccount(process.env.AUTHORITY_KEY).address;
                if (addressFromKey.toLowerCase() != address.toLowerCase()) {
                    console.error('Your priv key does not match with the address. ' + addressFromKey + ' != ' + address);
                    process.exit(-1);
                }
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
     * @param {string} amount - the depositing amount.
     * @param {number} tokenid - token id for the asset, 0 if not applicable.
     * @param {Object} options - including from: the asset owner's address.
     */
    deposit (contractAddress, amount, tokenid, options={}) {
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

        let transact = {from: account, gas: 3894132};
        let aContract = normalizeAddress(contractAddress);
        if ('0'.repeat(40) == aContract.toString('hex')) {
            transact.value = amount;
        }
        return this.rootChain.methods.deposit(
                contractAddress, amount, tokenid
            ).send(
                transact
            ).on('transactionHash',
                (hash) => {
                    if (this.debug) console.log(hash);
                }
            );
    };
    
    getErc20Interface (contractAddress) {
        return new this.web3.eth.Contract(Erc20Interface, contractAddress);
    };
    
    getErc721Interface (contractAddress) {
        return new this.web3.eth.Contract(Erc721Interface, contractAddress);
    };
    
    approve (contractAddress, amount, tokenid, options={}) {
        if(tokenid == 0 && amount == 0){
            throw new Error('tokenid and amount can not both be zero');
        }
        let account = options.from;
        if (!account) {
            if (this.defaultAccount) account = this.defaultAccount;
            else throw new Error('No default account specified!');
        } 
        if (this.debug)
            console.log("approve contractAddress: " + contractAddress +
                ", amount: " + amount +
                ", tokenid: " + tokenid +
                ", account: " + account);
        let tokenInterface = null;
        if (tokenid != 0) {
            tokenInterface = this.getErc721Interface(contractAddress);
        } else {
            tokenInterface = this.getErc20Interface(contractAddress);
        }
        return tokenInterface.methods.approve(
                this.rootChainAddress, tokenid != 0? tokenid: amount
            ).send(
                {from: account, value: 0}
            ).on('transactionHash',
                (hash) => {
                    if (this.debug) console.log(hash);
                }
            );
    };

    async getBalance (address, block="latest") {
        if (!address && this.defaultAccount) address = this.defaultAccount;
        let res = null;
        try {
            res = await this.makeChildChainRpcRequest("get_balance", [address, block]);
        } catch (error) {
            console.error('Error getting balance, ', error);
            return res;
        }
        return res.data.result;
    };

    async getEthBalance (address, block="latest") {
        const balance = await this.getBalance(address, block);
        const ftBalance = balance['FT'];
        // if (this.debug) console.log('getEthBalance', ftBalance);
        for ( let i in ftBalance ) {
            // console.log(ftBalance[i]);
            if ('0'.repeat(40) === ftBalance[i][0])
                return ftBalance[i][1];
        }
        return null;
    }

    getAllUTXO (address, block="latest") {
        if (!address && this.defaultAccount) address = this.defaultAccount;
        return this.makeChildChainRpcRequest("get_utxo", [address, block]);
    };

    async searchUTXO (search={}, options={}) {
        let from = options.from || this.defaultAccount;
        if (search['category'])
            search['category'] = normalizeAddress(search['category']).toString('hex');
    
        let utxos = (await this.getAllUTXO(from)).data.result;
        let utxo, utxoObj={};
        for(let i in utxos){
            utxo = utxos[utxos.length - i - 1];
            const [_blknum, _txindex, _oindex, _contract, _balance, _tokenid] = utxo;
            utxoObj['category'] = _contract;
            utxoObj['tokenId'] = _tokenid;
            utxoObj['amount'] = _balance;
    
            let found = false;
            Object.keys(search).every( (key, i) => {
                // console.log(key);
                // console.log(search[key]);
                // console.log(utxoObj[key]);
                if (search[key] == utxoObj[key])
                    return found = true;
                else
                    return found = false;
            });
            if ( found ) {
                if (this.debug) 
                    console.log("\nSearch UTXO result: ", _blknum, _txindex, _oindex, _contract, _balance, _tokenid);
                return utxo;
            }                
        }
        return [];
    };

    async searchEthUtxo(amount, options={}) {
        let _owner = options.from || this.defaultAccount;
        console.log('\nsearchEthUtxo '+amount+', from: '+_owner);
        const [_blkNum, _txIndex, _oIndex, _contract, _balance, _tokenId] =
            await this.searchUTXO(
                {category: '0x0', tokenId: 0, amount: amount}, {from: _owner});
        return new UTXO(_blkNum, _txIndex, _oIndex, _contract, _balance, _tokenId, _owner);
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
     * @param {string} newowner2 - owner of output 2.
     * @param {string} contractaddress2 - asset address for output 2, 0x0 if ETH.
     * @param {number} amount2 - the amount of asset for that address.
     * @param {number} tokenid2 - asset id for that address, 0 if not applicable.
     * @param {number} [fee] - transacton fee.
     * @param {number} [expiretimestamp] - expiration time for the transaction.
     * @param {number} [salt] - salt.
     * @param {string} [address1] - owner of input1.
     * @param {string} [address2] - owner of input2.
     * @param {string} [sign1] - owner1's signature.
     * @param {string} [sign2] - owner2's signature.
     */
    async sendTransaction (blknum1, txindex1, oindex1,
           blknum2, txindex2, oindex2,
           newowner1, contractaddress1, amount1, tokenid1,
           newowner2, contractaddress2, amount2, tokenid2,
           fee=0, expiretimestamp=null, salt=null,
           address1=null, address2=null, sign1=null, sign2=null
    ) {
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
        const byteNewowner1 = normalizeAddress(newowner1);
        contractaddress2 = normalizeAddress(contractaddress2);
        const byteNewowner2 = normalizeAddress(newowner2);
        
        let txRaw = [blknum1, txindex1, oindex1,
           blknum2, txindex2, oindex2,
           byteNewowner1, contractaddress1, amount1, tokenid1,
           byteNewowner2, contractaddress2, amount2, tokenid2,
           fee, expiretimestamp, salt];
        
        let afterSign2 = (sign1, sign2) => {
            sign1 = sign1.substr(2);
            sign2 = sign2.substr(2);
            let txRawWithKeys = txRaw.concat([new Buffer(sign1, 'hex'), new Buffer(sign2, 'hex')]);
            if (this.debug) console.log('\nTxRaw: ', txRawWithKeys);
            let txEncoded = rlp.encode(txRawWithKeys);
            if (this.debug) console.log("sending transaction ...");
            return this.makeChildChainRpcRequest("apply_transaction", [txEncoded.toString('hex')]);
        }
        
        let afterSign1 = async (sign1) => {
            if (sign2 == null) {
                let hash2 = this.hashTransaction([blknum2, txindex2, oindex2,
                   contractaddress1, amount1, tokenid1,
                   byteNewowner2, contractaddress2, amount2, tokenid2,
                   fee, expiretimestamp, salt]);
                if (this.debug) console.log('Hash2: '+hash2);
                sign2 = await this.sign(hash2, address2);
            }
            if (this.debug) console.log('Sign2: '+sign2);
            return await afterSign2(sign1, sign2);
        }
        
        if (sign1 == null){
            let hash1 = this.hashTransaction([blknum1, txindex1, oindex1,
               byteNewowner1, contractaddress1, amount1, tokenid1,
               contractaddress2, amount2, tokenid2,
               fee, expiretimestamp, salt]);
            if (this.debug) console.log('Hash1: '+hash1);
            sign1 = await this.sign(hash1, address1);
        } 
        if (this.debug) console.log('Sign1: '+sign1)
        return await afterSign1(sign1);
    };

    /**
     * Send a partially signed transaction.
     * @method
     * @param {number} blknum1 - block number of input 1.
     * @param {number} txindex1 - transaction number in that block for input 1.
     * @param {number} oindex1 - output number of that transaction for input 1.
     * @param {string} newowner1 - owner of output 1.
     * @param {string} contractaddress1 - asset address for output 1, 0x0 if ETH.
     * @param {number} amount1 - the amount of asset for that address.
     * @param {number} tokenid1 - asset id for that address, 0 if not applicable.
     * @param {string} contractaddress2 - asset address for output 2, 0x0 if ETH.
     * @param {number} amount2 - the amount of asset for that address.
     * @param {number} tokenid2 - asset id for that address, 0 if not applicable.
     * @param {number} [fee] - transacton fee.
     * @param {number} [expiretimestamp] - expiration time for the transaction.
     * @param {number} [salt] - salt.
     * @param {string} [sign1] - input1's signature.
     * @param {string} [address1] - owner of input1.
     */
    async sendPsTransaction (
            blknum1, txindex1, oindex1,
            newowner1, contractaddress1, amount1, tokenid1,
            contractaddress2, amount2, tokenid2,
            fee=0, expiretimestamp=null, salt=null,
            address1=null, sign1=null
    ) {
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
        const byteNewowner1 = normalizeAddress(newowner1);
        contractaddress2 = normalizeAddress(contractaddress2);
        
        let txRaw = [blknum1, txindex1, oindex1,
           0, 0, 0,
           byteNewowner1, contractaddress1, amount1, tokenid1,
           normalizeAddress("0x0"), contractaddress2, amount2, tokenid2,
           fee, expiretimestamp, salt];
                
        let afterSign1 = (sign1) => {
            sign1 = sign1.substr(2);
            const byteSign1 = new Buffer(sign1, 'hex');
            const byteSign2 = new Buffer("0".repeat(130), 'hex');
            let txRawWithKeys = txRaw.concat([byteSign1, byteSign2]);
            let txEncoded = rlp.encode(txRawWithKeys);
            if (this.debug) console.log("sending ps transaction ...");
            return this.makeChildChainRpcRequest("apply_ps_transaction", [txEncoded.toString('hex')]);
        }
        
        if (sign1 == null){
            let hash1 = this.hashTransaction([blknum1, txindex1, oindex1,
                byteNewowner1, contractaddress1, amount1, tokenid1,
                contractaddress2, amount2, tokenid2,
                fee, expiretimestamp, salt]);
            if (this.debug) console.log('Hash1: ',hash1);
            sign1 = await this.sign(hash1, address1);
        } 
        if (this.debug) console.log('Sign1: '+sign1)
        return afterSign1(sign1);       
    };

    /**
     * Fill the partially signed transaction.
     * @method
     * @param {string} psTransaction - the receiver's address.
     * @param {number} blknum2 - block number of input 2.
     * @param {number} txindex2 - transaction number in that block for input 2.
     * @param {number} oindex2 - output number of that transaction for input 2.
     * @param {string} newowner2 - owner of output 2.
     * @param {string} [address2] - owner of input2.
     * @param {string} [sign2] - input2's signature.
     */
    sendPsTransactionFill (psTransaction,
           blknum2, txindex2, oindex2,
           newowner2, 
           address2=null, sign2=null
    ) {
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
        
        return this.sendTransaction(blknum1, txindex1, oindex1,
           blknum2, txindex2, oindex2,
           newowner1, contractaddress1, amount1, tokenid1,
           newowner2, contractaddress2, amount2, tokenid2,
           fee, expiretimestamp, salt,
           null, address2, sign1, sign2);
    };

    /**
     * Get all the partially signed transactions in the txpool.
     * @method
     */
    getAllPsTransactions () {
        return this.makeChildChainRpcRequest("get_all_ps_transactions", []);
    };

    /**
     * Return an available UTXO, if txQueue is supplied, exclude the one in the txQueue.
     * @method
     * @return {UTXO} return A UTXO instance
     */
    async getNextUtxo(txQueue=[], options={}) {
        let fromAddress = options.from || this.defaultAccount;

        const utxos = (await this.getAllUTXO(fromAddress)).data.result;
        if (this.debug) console.log(utxos);

        let utxo = null, fromUtxo = null;
        for (let i in utxos) {
            utxo = utxos[i];
            const [blknum, txindex, oindex, contract, balance, tokenid] = utxo;
            let isInQueue = false;
            if (balance > 0){
                if (txQueue.length > 0 ) {
                    for (let j in txQueue) {
                        fromUtxo = txQueue[j];
                        if ( blknum == fromUtxo.blkNum 
                            && txindex == fromUtxo.txIndex
                            && oindex == fromUtxo.oIndex ) {
                                isInQueue = true;
                            }
                    }
                }
                if ( ! isInQueue )
                    return new UTXO(blknum, txindex, oindex, contract, balance, tokenid, fromAddress);
            }
        }

        return new UTXO();
        // const [blknum, txindex, oindex, contract, balance, tokenid] = utxos[utxos.length - 1];
        // return new UTXO(blknum, txindex, oindex, contract, balance, tokenid, fromAddress);
    }

    _swapUtxo(fromUtxo, toUtxo) {
        return this.sendTransaction(
            fromUtxo.blkNum, fromUtxo.txIndex, fromUtxo.oIndex,
            toUtxo.blkNum, toUtxo.txIndex, toUtxo.oIndex,
            fromUtxo.owner, fromUtxo.contract, toUtxo.balance, fromUtxo.tokenId,
            toUtxo.owner,toUtxo.contract, fromUtxo.balance, toUtxo.tokenId
        );
    }

    _mergeUtxo(fromUtxo, toUtxo) {
        console.log('Merging utxos amount1: '+fromUtxo.balance+', amount2: '+toUtxo.balance);
        return this.sendTransaction(
            fromUtxo.blkNum, fromUtxo.txIndex, fromUtxo.oIndex,
            toUtxo.blkNum, toUtxo.txIndex, toUtxo.oIndex,
            fromUtxo.owner, fromUtxo.contract, 0, fromUtxo.tokenId,
            toUtxo.owner,toUtxo.contract, parseInt(fromUtxo.balance) + parseInt(toUtxo.balance), toUtxo.tokenId
        );
    }

    async sendEth2(to, amount, txQueue, options={}) {
        let fromAddress = options.from || this.defaultAccount;

        let fromUtxo=null, toUtxo=null, utxo=null, remainder=0;

        fromUtxo = await this.searchEthUtxo(amount, {from: fromAddress});

        if (fromAddress == to) {
            console.log('Merge UTXO');
            if ( fromUtxo.exists() ) {
                // don't need to anything
            } else {
                if ( txQueue.length > 0) {
                    fromUtxo = txQueue.pop();
                } else {
                    fromUtxo = await this.getNextUtxo(txQueue, {from:fromAddress});
                }    
                console.log('\nfromUtxo: ', fromUtxo);
                remainder = amount - fromUtxo.balance;
                console.log('\nRemainder: ', remainder);  
                
                if (remainder < 0) {
                    let amount1 = fromUtxo.balance + remainder;
                    let amount2 = fromUtxo.balance - amount1;
                    toUtxo = new UTXO(0,0,0,fromUtxo.contract,amount2,fromUtxo.tokenId,to);
                    fromUtxo.balance = amount1;
                    let tx = await this._swapUtxo(fromUtxo, toUtxo);
                    // console.log(utxo);
                } else if ( remainder > 0 ) {
                    //
                    // MERGE UTXOs
                    //

                    // need to push the fromUtxo into Queue first, in order to get
                    // the correct second Utxo.
                    txQueue.push(fromUtxo);
                    
                    toUtxo = await this.searchEthUtxo(remainder, {from: fromAddress});
                    if ( toUtxo.exists() && ! toUtxo.isEqual(fromUtxo) ) {
                        // make sure fromUtxo != toUtxo
                        txQueue.pop();
                        let tx = await this._mergeUtxo(fromUtxo, toUtxo);
                        // console.log(utxo);
                    } else {
                        toUtxo = await this.getNextUtxo(txQueue, {from:fromAddress});
                        console.log('\ntoUtxo: ', toUtxo);
    
                        // txQueue = txQueue.push(toUtxo);
                        remainder = remainder - toUtxo.balance;
                        console.log('\nRemainder: ', remainder);
    
                        if (remainder > 0) {
                            // more utxo needs to be merged.
                            // send the transaction here
                            let tx = await this._mergeUtxo(fromUtxo, toUtxo);
                            // get the created utxo
                            let utxo = await this.searchEthUtxo(
                                fromUtxo.balance + toUtxo.balance, {from: toUtxo.owner});
                            txQueue.pop();
                            txQueue.push(utxo);
                            // then keep working on merging
                            txQueue = await this.sendEth2(to, amount, txQueue, options);
                        } else if (remainder < 0) {
                            let amount1 = toUtxo.balance + remainder;
                            let amount2 = toUtxo.balance - amount1;
                            let splitUtxo = new UTXO(0,0,0,toUtxo.contract,amount2,toUtxo.tokenId,toUtxo.owner);
                            toUtxo.balance = amount1;
                            console.log('Spliting utxo amount1: '+amount1+', amount2: '+amount2);
                            // txQueue = txQueue.push(fromUtxo);
                            let tx = await this._swapUtxo(toUtxo, splitUtxo);
                            // console.log(utxo);
                            txQueue = await this.sendEth2(to, amount, txQueue, options);
                        }
                    }  
                }       
            }          
        } 
        else {
            console.log('Split Utxo');
            if ( fromUtxo.exists() ) {
                toUtxo = new UTXO(0,0,0,fromUtxo.contract,0,fromUtxo.tokenId,to);
                // send the tx
                let tx = await this._swapUtxo(fromUtxo, toUtxo);
                // console.log(utxo);
                return txQueue;              
            } else {
                fromUtxo = await this.getNextUtxo(txQueue, {from:fromAddress});
            
                console.log('\nfromUtxo: ', fromUtxo);
                remainder = amount - fromUtxo.balance;
                console.log('\nRemainder: ', remainder);
                if ( remainder > 0 ) {
                    toUtxo = new UTXO(0,0,0,fromUtxo.contract,0,fromUtxo.tokenId,to);
                    let tx = await this._swapUtxo(fromUtxo, toUtxo);
                    // console.log(utxo);                   
                    // txQueue = txQueue.concat({from:fromUtxo, to:toUtxo})
                    // console.log('\nTxQueue ', txQueue);
                    txQueue = await this.sendEth2(to, remainder, txQueue, options);
                } else if (remainder < 0) {
                    let amount1 = fromUtxo.balance + remainder;
                    let amount2 = fromUtxo.balance - amount1;
                    toUtxo = new UTXO(0,0,0,fromUtxo.contract,amount2,fromUtxo.tokenId,to);
                    fromUtxo.balance = amount1;
                    let tx = await this._swapUtxo(fromUtxo, toUtxo);
                    // console.log(utxo);
                } else {
                    throw new Error('Send Eth2 failed! ');
                }
            }
        }

        return txQueue;
    }

    /**
     * Send ETH in FastX chain.
     * @method
     * @param {string} to - the receiver's address.
     * @param {string} amount - the amount to send, in wei.
     * @param {Object} options - including from: the sender's address.
     */
    async sendEth(to, amount, options={}) {
        if (amount <= 0) return Promise.reject('The amount to send must be > 0')

        let from = options.from || this.defaultAccount;
        if (this.debug) console.log('Send ETH from: '+from+' to: '+to+', amount: '+amount);
        const ethBalance = await this.getEthBalance(from);
        if (this.debug) console.log('ethBalance: ', ethBalance);

        if (ethBalance < amount) return Promise.reject('Not enough balance.');

        // let txPromise = Promise.reject('No eth sent');

        let txQueue = [];
        txQueue = this.sendEth2(to, amount, txQueue, options)

        return txQueue;
    };

    async sellToken(contract, amount, tokenid, options={}) {
        if (amount <= 0) return console.warn('WARNING: amount must be > 0');
        let from = options.from || this.defaultAccount;
        contract = normalizeAddress(contract).toString('hex');
        if (this.debug) console.log('from: '+from + ', contract: '+contract+', tokenid: '+tokenid);

        let utxos = (await this.getAllUTXO(from)).data.result;

        let utxo, txPromise, txAmount=0, remainder=amount;
        for(let i in utxos){
            utxo = utxos[utxos.length - i - 1];
            const [_blknum, _txindex, _oindex, _contract, _balance, _tokenid] = utxo;
    
            if (_balance > 0 && contract == _contract && tokenid == _tokenid){
                if (this.debug) console.log(_blknum, _txindex, _oindex, _contract, _balance, _tokenid);

                remainder = remainder - _balance;
                txAmount = (remainder >= 0) ? _balance : _balance + remainder;
                if (this.debug) console.log('output 0: ' + (_balance - txAmount) + ', output 1: ' + txAmount);

                txPromise = this.sendPsTransaction(
                    _blknum, _txindex, _oindex, 
                    from, 
                    _contract, _balance - txAmount, _tokenid, 
                    _contract, txAmount, _tokenid);

                if (remainder <= 0) {
                    // Done, return the latest tx
                    return txPromise;
                }
            }
        }
    };
}

export default Client;