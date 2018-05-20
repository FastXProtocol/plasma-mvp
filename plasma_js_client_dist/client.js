'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _rlp = require('rlp');

var _rlp2 = _interopRequireDefault(_rlp);

var _getWeb = require('./utils/getWeb3');

var _getWeb2 = _interopRequireDefault(_getWeb);

var _sign = require('./utils/sign');

var _sign2 = _interopRequireDefault(_sign);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _RootChain = require('../contract_data/RootChain');

var _RootChain2 = _interopRequireDefault(_RootChain);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var web3 = (0, _getWeb2.default)();
var rootChain = new web3.eth.Contract(_RootChain2.default.abi, _config2.default.rootChainAddress);

var client = {
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
    encodeTransaction: function encodeTransaction(txRaw) {
        return _rlp2.default.encode(txRaw);
    },
    hashTransaction: function hashTransaction(txRaw) {
        var txEncoded = client.encodeTransaction(txRaw);
        return web3.utils.sha3(txEncoded);
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
    sendTransaction: function sendTransaction(blknum1, txindex1, oindex1, blknum2, txindex2, oindex2, newowner1, contractaddress1, amount1, tokenid1, newowner2, contractaddress2, amount2, tokenid2) {
        var fee = arguments.length > 14 && arguments[14] !== undefined ? arguments[14] : 0;
        var expiretimestamp = arguments.length > 15 && arguments[15] !== undefined ? arguments[15] : null;
        var salt = arguments.length > 16 && arguments[16] !== undefined ? arguments[16] : null;
        var sign1 = arguments.length > 17 && arguments[17] !== undefined ? arguments[17] : null;
        var sign2 = arguments.length > 18 && arguments[18] !== undefined ? arguments[18] : null;
        var address1 = arguments.length > 19 && arguments[19] !== undefined ? arguments[19] : null;
        var address2 = arguments.length > 20 && arguments[20] !== undefined ? arguments[20] : null;

        if (sign1 == null && address1 == null) {
            throw new Error("sign1 and address1 can not both be none");
        }
        if (sign2 == null && address2 == null) {
            throw new Error("sign2 and address2 can not both be none");
        }
        if (expiretimestamp == null) {
            expiretimestamp = Math.ceil(Date.now() / 1000) + 3600;
        }
        if (salt == null) {
            salt = Math.floor(Math.random() * 1000000000000);
        }
        contractaddress1 = client.normalizeAddress(contractaddress1);
        newowner1 = client.normalizeAddress(newowner1);
        contractaddress2 = client.normalizeAddress(contractaddress2);
        newowner2 = client.normalizeAddress(newowner2);

        var txRaw = [blknum1, txindex1, oindex1, blknum2, txindex2, oindex2, newowner1, contractaddress1, amount1, tokenid1, newowner2, contractaddress2, amount2, tokenid2, fee, expiretimestamp, salt];

        var afterSign2 = function afterSign2(sign1, sign2) {
            sign1 = sign1.substr(2);
            sign2 = sign2.substr(2);
            var txRawWithKeys = txRaw.concat([new Buffer(sign1, 'hex'), new Buffer(sign2, 'hex')]);
            var txEncoded = _rlp2.default.encode(txRawWithKeys);
            console.log("sending transaction ...");
            return client.makeChildChainRpcRequest("apply_transaction", [txEncoded.toString('hex')]);
        };

        var afterSign1 = function afterSign1(sign1) {
            if (sign2 == null) {
                var hash2 = client.hashTransaction([blknum2, txindex2, oindex2, contractaddress1, amount1, tokenid1, newowner2, contractaddress2, amount2, tokenid2, fee, expiretimestamp, salt]);
                (0, _sign2.default)(hash2).then(function (sign2) {
                    afterSign2(sign1, sign2);
                });
            } else {
                afterSign2(sign1, sign2);
            }
        };

        if (sign1 == null) {
            var hash1 = client.hashTransaction([blknum1, txindex1, oindex1, newowner1, contractaddress1, amount1, tokenid1, contractaddress2, amount2, tokenid2, fee, expiretimestamp, salt]);
            (0, _sign2.default)(hash1).then(afterSign1);
        } else {
            afterSign1(sign1);
        }
    }
};

exports.default = client;