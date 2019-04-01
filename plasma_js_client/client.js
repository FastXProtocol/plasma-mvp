import axios from 'axios';
import rlp from 'rlp';
import jsonlint from './jsonlint'
import getWeb3 from "./utils/getWeb3";
import normalizeAddress from "./utils/normalizeAddress";
import Account from "eth-lib/lib/account";
import RootChain from "../contract_data/RootChain.abi";
import Erc20Interface from "../contract_data/EIP20.abi";
import Erc721Interface from "../contract_data/ERC721Basic.abi";
import Erc721TokenInterface from "../contract_data/ERC721Token.abi";

export const root = (typeof self === 'object' && self.self === self && self) ||
  (typeof global === 'object' && global.global === global && global) ||
  this;


function encodeTransaction (txRaw) {
    return rlp.encode(txRaw);
};

const noExponents= function(num){
    var data= String(num).split(/[eE]/);
    if(data.length== 1) return data[0]; 

    var  z= '', sign= num<0? '-':'',
    str= data[0].replace('.', ''),
    mag= Number(data[1])+ 1;

    if(mag<0){
        z= sign + '0.';
        while(mag++) z += '0';
        return z + str.replace(/^\-/,'');
    }
    mag -= str.length;  
    while(mag--) z += '0';
    return str + z;
}

function range (start, stop, step){
    if (typeof(stop) == 'undefined')
    {
        // one param defined
        stop = start;
        start = 0;
    }
    if (typeof(step) == 'undefined')
    {
        step = 1;
    }
    if ((step > 0 && start >= stop) || (step < 0 && start <= stop))
    {
        return [];
    }
    var result = [];
    for (var i = start; step > 0 ? i < stop : i > stop; i += step)
    {
        result.push(i);
    }
    return result;
}

class Node {
    constructor (data, left=false, right=false) {
        this.data = data;
        this.left = left;
        this.right = right;
    }
}

class FixedMerkle {
    constructor (depth, leaves=[], hashed=false, web3) {
        if(depth < 1)throw new Error("depth should be at least 1")
        this.depth = depth;
        this.leaf_count = Math.pow(2,depth);
        this.hashed = hashed;
        this.web3 = web3;
        this.oldleaves = leaves;

        if(leaves.length>this.leaf_count)
            throw new Error("num of leaves exceed max avaiable num with the depth")

        if(!this.hashed){
            //
        }

        let fillArray = new Array(this.leaf_count - leaves.length);
        fillArray.fill(new Buffer('0000000000000000000000000000000000000000000000000000000000000000', 'hex'))
        this.leaves = leaves.concat(fillArray);
        this.tree = [this.createNodes(this.leaves)];
        this.createTree(this.tree[0]);
    }

    createNodes (leaves) {
        let nodeList = [];
        for(let leaf of leaves) {
            nodeList.push(new Node(leaf));
        }

        return nodeList;
    }

    createTree (leaves) {
        if(leaves.length == 1){
            this.root = leaves[0].data;
            return this.root;
        }

        let next_level = leaves.length;
        let tree_level = [];
        for(let i of range(0, next_level, 2)){
            i = parseInt(i);
            if(typeof leaves[i].data == "string")
                leaves[i].data = new Buffer(leaves[i].data, 'hex')
            if(typeof leaves[i+1].data == "string")
                leaves[i+1].data = new Buffer(leaves[i+1].data, 'hex')
            let combined = this.web3.utils.sha3(Buffer.concat([leaves[i].data,leaves[i + 1].data]));
            combined = combined.replace('0x', '')
            let next_node = new Node(combined, leaves[i], leaves[i + 1])
            tree_level.push(next_node)
        }

        this.tree.push(tree_level)
        this.createTree(tree_level)
    }

    checkMembership (leaf, index, proof){
        // if(!this.hashed)
        //     leaf = this.web3.utils.sha3(leaf);
        proof = new Buffer(proof, 'hex');
        let computedHash = leaf;
        let segment;
        for(let i of range(0, this.depth * 32, 32)){
            segment = proof.slice(i, i+32);
            computedHash = new Buffer(computedHash, 'hex');
            if( index % 2 == 0 ) {
                computedHash = this.web3.utils.sha3(Buffer.concat([computedHash,segment]))
            }else{
                computedHash = this.web3.utils.sha3(Buffer.concat([segment,computedHash]))
            }
            index = parseInt(index/2)
            computedHash = computedHash.replace('0x', '');
        }

        return computedHash == this.root
    }

    createMembershipProof (leaf) {
        // if(!this.hashed)
        //     leaf = this.web3.utils.sha3(leaf);

        let leavesHex = []
        for(let value of this.oldleaves){
            leavesHex.push(value.toString('hex'));
        }
        let index = leavesHex.indexOf(leaf);

        if (index == -1) {
            throw new Error('leaf is not in the merkle tree')
        }

        let proof = new Buffer('');
        let sibling_index = 0;
        for(let i of range(0, this.depth, 1)){
            if( index % 2 == 0){
                sibling_index = index + 1;
            }else{
                sibling_index = index - 1;
            }

            index = parseInt(index/2);
            proof += this.tree[i][sibling_index].data.toString('hex');
        }

        return proof
    }
}

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
        [...this.simplePublicFunctions, "getChildChain", "getExit"].forEach(property => {
            this[property] = (...params) => {
                return this.makeRootChainCall(property, params);
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
//                 console.log(e)
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
        this.BN = this.web3.utils.BN;
    }

    setProvider (provider) {
        this.web3.setProvider(provider);
        this.rootChain.setProvider(provider);
    }

    getTransactionRlp (transaction, flag) {
        const [blknum1, txindex1, oindex1,
            blknum2, txindex2, oindex2,
            newowner1, contractaddress1, amount1, tokenid1,
            newowner2, contractaddress2, amount2, tokenid2,
            fee, expiretimestamp, salt,
            sign1, sign2] = transaction;
        let signTx;
        if (flag == 1){
            signTx = [blknum1, txindex1, oindex1,
            newowner1, contractaddress1, amount1, tokenid1,
            contractaddress2, amount2, tokenid2,
            fee, expiretimestamp, salt];
        } else if (flag == 2) {
            signTx = [blknum2, txindex2, oindex2,
            contractaddress1, amount1, tokenid1,
            newowner2, contractaddress2, amount2, tokenid2,
            fee, expiretimestamp, salt];
        } else {
            signTx = [blknum1, txindex1, oindex1,
            blknum2, txindex2, oindex2,
            newowner1, contractaddress1, amount1, tokenid1,
            newowner2, contractaddress2, amount2, tokenid2,
            fee, expiretimestamp, salt];
        }
        return rlp.encode(signTx).toString('hex');
    }

    getTransactionMerkleHash (transaction) {
        const [blknum1, txindex1, oindex1,
            blknum2, txindex2, oindex2,
            newowner1, contractaddress1, amount1, tokenid1,
            newowner2, contractaddress2, amount2, tokenid2,
            fee, expiretimestamp, salt,
            sign1, sign2] = transaction;
        const hash0 = this.hashTransaction([blknum1, txindex1, oindex1,
            blknum2, txindex2, oindex2,
            newowner1, contractaddress1, amount1, tokenid1,
            newowner2, contractaddress2, amount2, tokenid2,
            fee, expiretimestamp, salt]).substr(2);
        const concatBuffer = Buffer.concat([new Buffer(hash0, 'hex'), sign1, sign2]);
        const merkleHash = this.web3.utils.sha3(concatBuffer);
        return merkleHash.substr(2);
    }

    getTransactionSigs (transaction) {
        const [blknum1, txindex1, oindex1,
            blknum2, txindex2, oindex2,
            newowner1, contractaddress1, amount1, tokenid1,
            newowner2, contractaddress2, amount2, tokenid2,
            fee, expiretimestamp, salt,
            sign1, sign2] = transaction;
        const concatBuffer = Buffer.concat([sign1, sign2]);
        return concatBuffer.toString('hex');
    }

    createFixedMerkle (depth, leaves=[], hashed=false) {
        let leavesHex = [];
        for(let leaf of leaves){
            leavesHex.push(new Buffer(leaf, 'hex'));
        }
        return new FixedMerkle(depth, leavesHex, hashed, this.web3);
    }

    getBlockMerkle(block){
        const transactions = block[0];
        const hashedTransactions = transactions.map(transaction => this.getTransactionMerkleHash(transaction));
        return this.createFixedMerkle (16, hashedTransactions, true);
    }

    makeChildChainRpcRequest (method, params) {
        axios.defaults.transformResponse = [
            function(data) {
              return jsonlint.parse(data)
            }
        ]

        return axios.post(this.fastXRpc, {
            "method": method,
            "params": params,
            "jsonrpc": "2.0",
            "id": 0
        });
    };

    async getChildChainRpcResponse (method, params) {
        let res = null;
        try {
            res = await this.makeChildChainRpcRequest(method, params);
        } catch (error) {
            console.error('Error ' + method + ', ', error);
            return res;
        }
        return res.data.result;
    };

    hashTransaction (txRaw) {
        let txEncoded = encodeTransaction(txRaw);
        return this.web3.utils.sha3(txEncoded);
    };

    getUtxoPos (blknum, txindex, oindex) {
        return blknum * 1000000000 + txindex * 10000 + oindex;
    }

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
            } else {
                console.error('address required');
                process.exit(-1);
            }
            return new Promise((resolve, reject) => resolve(Account.sign(hash, process.env.AUTHORITY_KEY)));
        } else {
            let currentProvider = this.web3.currentProvider;
            if( currentProvider.options && currentProvider.options.sign ){
                return this.web3.currentProvider.options.sign(hash, address);
            }else{
                return this.web3.eth.sign(hash, address);
            }
        }
    };

    initCategoryParams(category, options){
        if(typeof options === 'undefined'){
            options = {};
        }
        if (typeof category === 'object'){
            options = category;
            category = '0x0';
        } else if (typeof category === 'undefined'){
            category = options.category? options.category.replace('0x',''): '0x0';
        }
        if(category != "0x0"){
            category = category.replace('0x','');
        }
        return [category, options];
    }

    toBigNumber(content){
        return new web3.utils.BN(content);
    }

    async getErc20Info(contractAddress) {
        let erc20Interface = this.getErc20Interface(contractAddress);
        return {
            "name": await erc20Interface.methods.name().call(),
            "symbol": await erc20Interface.methods.symbol().call(),
            "decimals": this.toBigNumber(await erc20Interface.methods.decimals().call()),
            "totalSupply": this.toBigNumber(await erc20Interface.methods.totalSupply().call()),
        }
    }
    
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
    
    async getExitUTXOInfo(utxo) {
        const [blknum, txindex, oindex, contractAddress, amount, tokenid] = utxo;
        return await this.getExitInfo(blknum, txindex, oindex);
    }

    async getExitInfo(blknum, txindex, oindex) {
        const utxoPos = this.getUtxoPos(blknum, txindex, oindex);
        return await this.rootChainInfo.getExit(utxoPos);
    }

    async startExitUTXO(utxo, options={}) {
        const [blknum, txindex, oindex, contractAddress, amount, tokenid] = utxo;
        await this.startExit(blknum, txindex, oindex, contractAddress, amount, tokenid, options);
    };

    async startExit(blknum, txindex, oindex, contractAddress, amount, tokenid, options={}) {
        let account = options.from;
        if (!account) {
            if (this.defaultAccount) account = this.defaultAccount;
            else throw new Error('No default account specified!');
        }
        if (blknum % 1000 == 0) {
            const currentChildBlock = await this.rootChainInfo.getCurrentChildBlock();
            if (blknum >= currentChildBlock) {
                throw new Error('Block has not submitted');
            }
            const block = await this.getBlock(blknum);
            const transactions = block[0];
            const transaction = transactions[txindex];
            if(!transaction){
                throw new Error('Transaction does not exist');
            }
            const txMerkleHash = this.getTransactionMerkleHash(transaction);
            const blockMerkle = this.getBlockMerkle(block);
            const proof = blockMerkle.createMembershipProof(txMerkleHash);

            const depositPos = this.getUtxoPos(blknum, txindex, oindex);
            const transactionRlp = this.getTransactionRlp(transaction, 0);
            const txSigs = this.getTransactionSigs(transaction);

            if (this.debug)
                console.log("startExit " +
                    ", depositPos: " + depositPos +
                    ", transactionRlp: " + transactionRlp +
                    ", proof: " + proof +
                    ", sigs: " + txSigs);

            let transact = {from: account, gas: 3894132};
            return this.rootChain.methods.startExit(
                    depositPos, "0x" + transactionRlp, "0x" + proof, "0x" + txSigs
                ).send(
                    transact
                ).on('transactionHash',
                    (hash) => {
                        if (this.debug) console.log(hash);
                    }
                );
        } else {
            return await this.startDepositExit(blknum, txindex, oindex, contractAddress, amount, tokenid, options);
        }
    }

    startDepositExit (blknum, txindex, oindex, contractAddress, amount, tokenid, options={}) {
        let account = options.from;
        if (!account) {
            if (this.defaultAccount) account = this.defaultAccount;
            else throw new Error('No default account specified!');
        }
        const depositPos = this.getUtxoPos(blknum, txindex, oindex);
        if (this.debug)
            console.log("startDepositExit " +
                ", depositPos: " + depositPos +
                ", contractAddress: " + contractAddress +
                ", amount: " + amount +
                ", tokenid: " + tokenid +
                ", account: " + account);

        let transact = {from: account, gas: 3894132};
        let aContract = normalizeAddress(contractAddress);
        return this.rootChain.methods.startDepositExit(
                depositPos, contractAddress, amount, tokenid
            ).send(
                transact
            ).on('transactionHash',
                (hash) => {
                    if (this.debug) console.log(hash);
                }
            );
    };

    async challengeExit(cBlknum, cTxindex, cOindex, eUtxoIndex, options={}) {
        let account = options.from;
        if (!account) {
            if (this.defaultAccount) account = this.defaultAccount;
            else throw new Error('No default account specified!');
        }
        const currentChildBlock = await this.rootChainInfo.getCurrentChildBlock();
        if (cBlknum >= currentChildBlock) {
            throw new Error('Block has not submitted');
        }

        const cBlock = await this.getBlock(cBlknum);
        const cTransactions = cBlock[0];
        const cTransaction = cTransactions[cTxindex];
        if(!cTransaction){
            throw new Error('Challenge Transaction does not exist');
        }

        const cUtxoPos = this.getUtxoPos(cBlknum, cTxindex, cOindex);

        const cTxMerkleHash = this.getTransactionMerkleHash(cTransaction);
        const cBlockMerkle = this.getBlockMerkle(cBlock);
        const cProof = cBlockMerkle.createMembershipProof(cTxMerkleHash);

        const cTransactionRlp = this.getTransactionRlp(cTransaction, 0);
        const cTxSigs = this.getTransactionSigs(cTransaction);

        if (this.debug)
            console.log("challengeExit " +
                ", cUtxoPos: " + cUtxoPos +
                ", eUtxoIndex: " + eUtxoIndex +
                ", cTransactionRlp: " + cTransactionRlp +
                ", cProof: " + cProof +
                ", cTxSigs: " + cTxSigs);

        let transact = {from: account, gas: 3894132};
        return this.rootChain.methods.challengeExit(
                cUtxoPos, eUtxoIndex, "0x" + cTransactionRlp, "0x" + cProof, "0x" + cTxSigs
            ).send(
                transact
            ).on('transactionHash',
                (hash) => {
                    if (this.debug) console.log(hash);
                }
            );
    }

    finalizeExits(options={}) {
        let account = options.from;
        if (!account) {
            if (this.defaultAccount) account = this.defaultAccount;
            else throw new Error('No default account specified!');
        }
        let transact = {from: account};
        return this.rootChain.methods.finalizeExits().send(transact)
            .on('transactionHash',
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

    getErc721TokenInterface (contractAddress) {
        return new this.web3.eth.Contract(Erc721TokenInterface, contractAddress);
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

    async getBalanceEtherem(address, contractAddress) {
        if (!address && this.defaultAccount) address = this.defaultAccount;
        if (!contractAddress || normalizeAddress(contractAddress).toString('hex') == normalizeAddress("0x0").toString('hex')){
            return this.web3.eth.getBalance(address);
        } else {
            return this.getErc20Interface(contractAddress).methods.balances(address).call();
        }
    };

    async getBalance (address, block="latest") {
        if (!address && this.defaultAccount) address = this.defaultAccount;
        return await this.getChildChainRpcResponse("get_balance", [address, block]);
    };

    async getTokenBalance (address, category, block="latest") {
        const balance = await this.getBalance(address, block);
        const ftBalance = balance['FT'];
        for ( let i in ftBalance ) {
            // console.log(ftBalance[i]);
            if (normalizeAddress(category).toString('hex') == normalizeAddress(ftBalance[i][0]).toString('hex'))
                return ftBalance[i][1];
        }
        return null;
    }

    getAllUTXO (address, block="latest") {
        if (!address && this.defaultAccount) address = this.defaultAccount;
        return this.makeChildChainRpcRequest("get_utxo", [address, block]);
    };

    decodeBlock (block_rlp) {
        if (!block_rlp.startsWith("0x")) {
            block_rlp = "0x" + block_rlp;
        }
        const block = rlp.decode(block_rlp);
        return block;
    }

    async getCurrentBlock () {
        let block_rlp = await this.getChildChainRpcResponse("get_current_block", []);
        return this.decodeBlock(block_rlp);
    };

    async getBlock (blknum) {
        const block_rlp = await this.getChildChainRpcResponse("get_block", [blknum]);
        return this.decodeBlock(block_rlp);
    };

    async searchUTXO (search={}, options={}) {
        let from = options.from || this.defaultAccount;
        if (search['category'])
            search['category'] = normalizeAddress(search['category']).toString('hex');

        let utxos = (await this.getAllUTXO(from)).data.result;
        let utxo, utxoObj={};
        console.log('searchUTXO')
        console.log({utxos})
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

    async searchUtxo(amount, category, options) {
        [category, options] = this.initCategoryParams(category, options);
        let _owner = options.from || this.defaultAccount;
        console.log('\nsearchUtxo ' +category+ ':' +amount+', from: '+_owner);
        const [_blkNum, _txIndex, _oIndex, _contract, _balance, _tokenId] =
            await this.searchUTXO(
                {category: category, tokenId: 0, amount: amount}, {from: _owner});
        return new UTXO(_blkNum, _txIndex, _oIndex, _contract, _balance, _tokenId, _owner);
    }

    /**
     * Get the ETH UTXO, or create a new UTXO if no available one is found
     * but the balance is enough.
     * @method
     * @param {number} amount - the amount of UTXO.
     * @param {Object} options - including from: the asset owner's address.
     * @returns {[]} - utxo array
     */
    async getOrNewUtxo(amount, category, options) {
        [category, options] = this.initCategoryParams(category, options);
        if (this.debug) console.log("category", category);
        let from = options.from || this.defaultAccount;
        let utxo=[];
        if (! amount) {
            throw new Error('The amount supplied is not valid ->', amount);
        }

        const accountBalance = await this.getTokenBalance(from, category);
        if (accountBalance < amount) {
            throw new Error('Not enough balance');
        }

        await this.sendToken(from, amount, category, options);

        // Get the newly created utxo.
        console.log('getOrNewUtxo: ',{category: category, tokenId: 0, amount: amount})
        utxo = await this.searchUTXO({category: category, tokenId: 0, amount: amount}, options);

        return utxo;
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

        amount1 = new this.BN(amount1+'')
        amount2 = new this.BN(amount2+'')

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
        if (this.debug) console.log({txRaw});

        let afterSign2 = (sign1, sign2) => {
            sign1 = sign1.substr(2);
            sign2 = sign2.substr(2);
            let txRawWithKeys = txRaw.concat([new Buffer(sign1, 'hex'), new Buffer(sign2, 'hex')]);
//             if (this.debug) console.log('\nTxRaw: ', txRawWithKeys);
            let txEncoded = rlp.encode(txRawWithKeys);
//             if (this.debug) console.log("sending transaction ...");
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
    async makePsTransaction (
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
            return txRawWithKeys;
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

    async sendPsTransaction (
        blknum1, txindex1, oindex1,
        newowner1, contractaddress1, amount1, tokenid1,
        contractaddress2, amount2, tokenid2,
        fee=0, expiretimestamp=null, salt=null,
        address1=null, sign1=null
    ) {
        const txRawWithKeys = await this.makePsTransaction(
            blknum1, txindex1, oindex1,
            newowner1, contractaddress1, amount1, tokenid1,
            contractaddress2, amount2, tokenid2,
            fee, expiretimestamp, salt,
            address1, sign1);
        const txEncoded = rlp.encode(txRawWithKeys);
        if (this.debug) console.log("sending ps transaction ...");
        return this.makeChildChainRpcRequest("apply_ps_transaction", [txEncoded.toString('hex')]);
    }

    async makeSwapPsTransaction(offerContractAddress, offerAmount, offerTokenid, receiveContractAddress, receiveAmount, receiveTokenid, options={}){
        if(offerTokenid != 0){
            throw new Error('Offer tokenid not supportted');
        }
        let address = options.from || this.defaultAccount;
        const offerUtxo = await this.getOrNewUtxo(offerAmount, offerContractAddress);
        if (this.debug) console.log("offerUtxo", offerUtxo);
        const [offerBlknum, offerTxindex, offerOindex, _offerContractAddress, _offerAmount, _offerTokenid] = offerUtxo;
        const offerPsTx = await this.makePsTransaction(
            offerBlknum, offerTxindex, offerOindex,
            address, receiveContractAddress, receiveAmount, receiveTokenid,
            offerContractAddress, offerAmount, offerTokenid,
            undefined, undefined, undefined, address
        );
        const [blknum1, txindex1, oindex1,
            blknum2, txindex2, oindex2,
            newowner1, contractaddress1, amount1, tokenid1,
            newowner2, contractaddress2, amount2, tokenid2,
            fee, expiretimestamp, salt,
            sign1, sign2] = offerPsTx;
        return {
            "blknum1": blknum1,
            "txindex1": txindex1,
            "oindex1": oindex1,
            "blknum2": blknum2,
            "txindex2": txindex2,
            "oindex2": oindex2,
            "newowner1": newowner1.toString('hex'),
            "contractaddress1": contractaddress1.toString('hex'),
            "amount1": amount1.toString(),
            "tokenid1": tokenid1,
            "newowner2": newowner2.toString('hex'),
            "contractaddress2": contractaddress2.toString('hex'),
            "amount2": amount2.toString(),
            "tokenid2": tokenid2,
            "fee": fee,
            "expiretimestamp": expiretimestamp,
            "salt": salt,
            "sig1": sign1.toString('hex'),
            "sig2": sign2.toString('hex'),
        };
    }

    /**
     * Fill the partially signed transaction.
     * @method
     * @param {object} psTransaction
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
     * @returns {UTXO} return A UTXO instance
     */
    async getNextUtxo(txQueue=[], category, options={}) {
        [category, options] = this.initCategoryParams(category, options);
        let fromAddress = options.from || this.defaultAccount;

        const utxos = (await this.getAllUTXO(fromAddress)).data.result;
        if (this.debug) console.log(utxos);

        let utxo = null, fromUtxo = null;
        for (let i in utxos) { 
            utxo = utxos[i];
            const [blknum, txindex, oindex, contract, balance, tokenid] = utxo;
            if (category &&
                normalizeAddress(category).toString('hex') != normalizeAddress(contract).toString('hex')){
                continue;
            }
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

    _splitUtxo(fromUtxo, toUtxo) {
        return this.sendTransaction(
            fromUtxo.blkNum, fromUtxo.txIndex, fromUtxo.oIndex,
            toUtxo.blkNum, toUtxo.txIndex, toUtxo.oIndex,
            fromUtxo.owner, fromUtxo.contract, toUtxo.balance, fromUtxo.tokenId,
            toUtxo.owner,toUtxo.contract, fromUtxo.balance, toUtxo.tokenId,
            0, null, null, fromUtxo.owner, fromUtxo.owner
        );
    }

    _mergeUtxo(fromUtxo, toUtxo) {
        console.log('Merging utxos amount1: '+fromUtxo.balance+', amount2: '+toUtxo.balance);
        return this.sendTransaction(
            fromUtxo.blkNum, fromUtxo.txIndex, fromUtxo.oIndex,
            toUtxo.blkNum, toUtxo.txIndex, toUtxo.oIndex,
            toUtxo.owner, toUtxo.contract, parseInt(fromUtxo.balance) + parseInt(toUtxo.balance), toUtxo.tokenId,
            "0x0", "0x0", 0, 0,
            0, null, null, fromUtxo.owner, toUtxo.owner
        );
    }

    async sendToken2(to, amount, txQueue, category, options) {
        const BN = this.BN;
        [category, options] = this.initCategoryParams(category, options);
        let fromAddress = options.from || this.defaultAccount;
        let fromUtxo=null, toUtxo=null, utxo=null, remainder=0;
        console.log('sendToken2')
        console.log(amount, category, fromAddress)
        fromUtxo = await this.searchUtxo(amount, category, {from: fromAddress});
        console.log('fromAddress == to',fromAddress == to)
        if (fromAddress == to) {
            console.log('Merge UTXO');
            if ( fromUtxo.exists() ) {
                console.log('exists')
                // don't need to anything
            } else {
                console.log('txQueue.length',txQueue.length)
                console.log({txQueue})
                if ( txQueue.length > 0) {
                    fromUtxo = txQueue.pop();
                } else {
                    fromUtxo = await this.getNextUtxo(txQueue, category, {from:fromAddress});
                }
                console.log('\nfromUtxo: ', fromUtxo);
                remainder = new BN(noExponents(amount)).sub(new BN(noExponents(fromUtxo.balance)));
                console.log('\nRemainder: ', remainder.toString());
                console.log('fromUtxo.balance',fromUtxo.balance,noExponents(fromUtxo.balance))
                if (remainder.lt('0')) {
                    // let amount1 = fromUtxo.balance + remainder;
                    // let amount2 = fromUtxo.balance - amount1;
                    let amount1 = new BN(noExponents(fromUtxo.balance)).add(remainder);
                    let amount2 = new BN(noExponents(fromUtxo.balance)).sub(amount1);
                    
                    toUtxo = new UTXO(0,0,0,fromUtxo.contract,amount2.toString(),fromUtxo.tokenId,to);
                    console.log({toUtxo});
                    fromUtxo.balance = amount1.toString();
                    let tx = await this._splitUtxo(fromUtxo, toUtxo);
                    // console.log(utxo);
                } else if ( remainder.gt('0') ) {
                    //
                    // MERGE UTXOs
                    //

                    // need to push the fromUtxo into Queue first, in order to get
                    // the correct second Utxo.
                    txQueue.push(fromUtxo);

                    toUtxo = await this.searchUtxo(remainder, category, {from: fromAddress});
                    if ( toUtxo.exists() && ! toUtxo.isEqual(fromUtxo) ) {
                        console.log('toUtxo.exists',toUtxo.exists() && ! toUtxo.isEqual(fromUtxo))
                        console.log({
                            fromUtxo,
                            toUtxo
                        })
                        // make sure fromUtxo != toUtxo
                        txQueue.pop();
                        let tx = await this._mergeUtxo(fromUtxo, toUtxo);
                        // console.log(utxo);
                    } else {
                        toUtxo = await this.getNextUtxo(txQueue, category, {from:fromAddress});
                        console.log('\ntoUtxo: ', toUtxo);

                        // txQueue = txQueue.push(toUtxo);
                        remainder = remainder.sub(new BN(noExponents(toUtxo.balance)));
                        console.log('\nRemainder: ', remainder);

                        if (remainder.gt('0')) {
                            // more utxo needs to be merged.
                            // send the transaction here
                            console.log({
                                fromUtxo,
                                toUtxo
                            })
                            let tx = await this._mergeUtxo(fromUtxo, toUtxo);
                            // get the created utxo
                            let utxo = await this.searchUtxo(
                                fromUtxo.balance + toUtxo.balance, category, {from: toUtxo.owner});
                            txQueue.pop();
                            txQueue.push(utxo);
                            console.log({utxo})
                            // then keep working on merging
                            txQueue = await this.sendToken2(to, amount, txQueue, category, options);
                        } else if (remainder.lt('0')) {
                            let amount1 = new BN(noExponents(toUtxo.balance)).add(remainder);
                            let amount2 = new BN(noExponents(toUtxo.balance)).sub(amount1);
                            let splitUtxo = new UTXO(0,0,0,toUtxo.contract,amount2.toString(),toUtxo.tokenId,toUtxo.owner);
                            toUtxo.balance = amount1.toString();
                            console.log('Spliting utxo amount1: '+amount1.toString()+', amount2: '+amount2.toString());
                            // txQueue = txQueue.push(fromUtxo);
                            let tx = await this._splitUtxo(toUtxo, splitUtxo);
                            // console.log(utxo);
                            txQueue = await this.sendToken2(to, amount, txQueue, category, options);
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
                let tx = await this._splitUtxo(fromUtxo, toUtxo);
                // console.log(utxo);
                return txQueue;
            } else {
                fromUtxo = await this.getNextUtxo(txQueue, category, {from:fromAddress});
                console.log('\nfromUtxo: ', fromUtxo);
                remainder = new BN(noExponents(amount)).sub(new BN(noExponents(fromUtxo.balance)));
                console.log('\nRemainder: ', remainder.toString());
                if ( remainder.gt('0') ) {
                    toUtxo = new UTXO(0,0,0,fromUtxo.contract,0,fromUtxo.tokenId,to);
                    let tx = await this._splitUtxo(fromUtxo, toUtxo);
                    // console.log(utxo);
                    // txQueue = txQueue.concat({from:fromUtxo, to:toUtxo})
                    // console.log('\nTxQueue ', txQueue);
                    txQueue = await this.sendToken2(to, remainder, txQueue, category, options);
                } else if (remainder < 0) {
                    let amount1 = new BN(noExponents(fromUtxo.balance)).add(remainder);
                    let amount2 = new BN(noExponents(fromUtxo.balance)).sub(amount1);
                    toUtxo = new UTXO(0,0,0,fromUtxo.contract,amount2.toString(),fromUtxo.tokenId,to);
                    fromUtxo.balance = amount1.toString();
                    let tx = await this._splitUtxo(fromUtxo, toUtxo);
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
    async sendToken(to, amount, category, options) {
        [category, options] = this.initCategoryParams(category, options);
        if (amount <= 0) return Promise.reject('The amount to send must be > 0')
        let from = options.from || this.defaultAccount;
        if (this.debug) console.log('Send '+category+' from: '+from+' to: '+to+', amount: '+amount);
        const balance = await this.getTokenBalance(from, category);
        if (this.debug) console.log('balance: ', balance);

        if (balance < amount) return Promise.reject('Not enough balance.');

        // let txPromise = Promise.reject('No eth sent');

        let txQueue = [];
        txQueue = this.sendToken2(to, amount, txQueue, category, options)

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

    createLoginString(appName) {
        return appName + "_" + Math.floor((0.1 + 0.9 * Math.random()) * Math.pow(10, 10));
    };

    async signLoginString(loginString, address) {
        if(address == null){
            address = this.defaultAccount;
        }
        return await this.sign(this.web3.utils.sha3(loginString), address);
    };

    getLoginAddress(loginString, sign) {
        return Account.recover(this.web3.utils.sha3(loginString), sign);
    };

    checkLoginString(loginString, sign, address) {
        return loginString && sign && address &&
            this.getLoginAddress(loginString, sign).toLowerCase() == address.toLowerCase();
    };

    async getCurrentBlockNum() {
        return this.getChildChainRpcResponse("get_current_block_num", []);
    }

    async getTransactionsAfter(blknum, txindex) {
        return this.getChildChainRpcResponse("get_transactions_after", [blknum, txindex]);
    };

    /**
     * Liquidity Provider (Test Only).
     */
    async getExchangeRate(fromContractAddress, toContractAddress, amount) {
        return this.getChildChainRpcResponse("get_exchange_rate", [fromContractAddress, toContractAddress, amount]);
    };

    createExchangePartiallySignedTransaction(fromContractAddress, toContractAddress, amount) {
        return this.makeChildChainRpcRequest("create_partially_signed_transaction", [fromContractAddress, toContractAddress, amount]);
    };
}

export default Client;
