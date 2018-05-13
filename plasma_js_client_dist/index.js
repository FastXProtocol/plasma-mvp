'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.client = undefined;

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _rlp = require('rlp');

var _rlp2 = _interopRequireDefault(_rlp);

var _getWeb = require('./utils/getWeb3');

var _getWeb2 = _interopRequireDefault(_getWeb);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _RootChain = require('../contract_data/RootChain');

var _RootChain2 = _interopRequireDefault(_RootChain);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var web3 = (0, _getWeb2.default)();
var rootChain = new web3.eth.Contract(_RootChain2.default.abi, _config2.default.rootChainAddress);

var client = exports.client = {
    web3: web3,
    makeChildChainRpcRequest: function makeChildChainRpcRequest(method, params) {
        return _axios2.default.post(_config2.default.fastXRpc, {
            "method": method,
            "params": params,
            "jsonrpc": "2.0",
            "id": 0
        });
    },
    normalizeAddress: function normalizeAddress(address) {
        if (!address) {
            throw new Error();
        }
        if ('0x' == address.substr(0, 2)) {
            address = address.substr(2);
        }
        if (address == 0) address = '0'.repeat(40);
        return new Buffer(address, 'hex');
    },
    hashTransaction: function hashTransaction(txRaw) {
        var txEncoded = _rlp2.default.encode(txRaw);
        return web3.utils.sha3(txEncoded);
    },
    createTransaction: function createTransaction(blk, txindex, oindex, contract, amountSend, amount, owner1, owner2) {
        var blk_num = blk;
        var tx_index = txindex;
        var o_index = oindex;
        var amSend = amountSend;
        var amRemain = amount - amountSend;

        if (amSend <= 0) {
            throw new Error();
        }
        if (amRemain < 0) {
            throw new Error();
        }

        var newowner1 = void 0,
            newowner2 = void 0;

        if (!owner1) {
            throw new Error();
        } else {
            newowner1 = client.normalizeAddress(owner1);
        }
        if (amSend > 0 && amRemain > 0 && !owner2) {
            // there's some change, but no owner2 is specified
            throw new Error();
        } else if (amRemain > 0) {
            newowner2 = client.normalizeAddress(owner2);
        } else {
            owner2 = 0;
            newowner2 = client.normalizeAddress('0x0');
        }

        var token_contract = new Buffer(contract, 'hex');

        return [blk_num, tx_index, o_index, 0, 0, 0, newowner1, token_contract, amSend, 0, newowner2, owner2 ? token_contract : client.normalizeAddress('0x0'), amRemain, 0];
    },
    sendDeposit: function sendDeposit(contractAddress, amount, tokenid, owner) {
        console.log("deposit contractAddress: " + contractAddress + ", amount: " + amount + ", tokenid: " + tokenid + ", owner: " + owner);
        return rootChain.methods.deposit(contractAddress, amount, tokenid).send({ from: owner, value: amount });
    },
    getBalance: function getBalance(address) {
        var block = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "latest";

        return client.makeChildChainRpcRequest("get_balance", [address, block]);
    },
    getUTXO: function getUTXO(address) {
        var block = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "latest";

        return client.makeChildChainRpcRequest("get_utxo", [address, block]);
    },
    sendTransaction: function sendTransaction(blk, txindex, oindex, contract, amountSend, amount, owner1, owner2) {
        var txRaw = client.createTransaction(blk, txindex, oindex, contract, amountSend, amount, owner1, owner2);
        var txHash = client.hashTransaction(txRaw);

        web3.eth.sign(txHash, owner2).then(function (keySigned) {
            keySigned = keySigned.substr(2);
            console.log(keySigned);
            var keySignedBytes = new Buffer(keySigned, 'hex');

            var txRawWithKeys = txRaw.concat([keySignedBytes, keySignedBytes]);
            var txEncoded = _rlp2.default.encode(txRawWithKeys);
            console.log("sending transaction ...");
            return client.makeChildChainRpcRequest("apply_transaction", [txEncoded.toString('hex')]);
        });
    }
};

exports.default = client;