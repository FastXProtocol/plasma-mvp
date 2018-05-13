"use strict";

var _index = require("./index");

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var errHandler = function errHandler(name) {
    return function (e) {
        if (name != null) {
            console.log(name + " failed");
        }
        console.log(e);
        process.exit();
    };
};

/*
client.sendDeposit("0x0", 100, 0, "0xfd02EcEE62797e75D86BCff1642EB0844afB28c7").then((tx)=>{
    client.getBalance("0xfd02EcEE62797e75D86BCff1642EB0844afB28c7").then((res) => {
        console.log(res.data.result);
        process.exit();
    }, errHandler);
}, errHandler);
*/

_index2.default.getUTXO("0xfd02ecee62797e75d86bcff1642eb0844afb28c7").then(function (res) {
    var utxo = res.data.result[0];
    for (var i in res.data.result) {
        var _utxo = res.data.result[i];
        if (_utxo[4] >= 0 && _utxo[5] == 0) {
            console.log(_utxo);
            _index2.default.sendTransaction(_utxo[0], _utxo[1], _utxo[2], 0, 0, 0, "0xfd02ecee62797e75d86bcff1642eb0844afb28c7", _utxo[3], _utxo[4] - 1, _utxo[5], "0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26", _utxo[3], 1, 0, undefined, undefined, undefined, undefined, undefined, "0xfd02ecee62797e75d86bcff1642eb0844afb28c7", "0xfd02ecee62797e75d86bcff1642eb0844afb28c7").then(function (res) {
                _index2.default.getBalance("0xfd02EcEE62797e75D86BCff1642EB0844afB28c7").then(function (res) {
                    console.log(res.data.result);
                    process.exit();
                }, errHandler);
            }, errHandler);
            break;
        }
    }
}, errHandler);
// client.sendTransaction(1, 0, 0, 0, 0, 0, "0xfd02ecee62797e75d86bcff1642eb0844afb28c7", "0x0", 40, 0, "0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26", "0x0", "60", 0)