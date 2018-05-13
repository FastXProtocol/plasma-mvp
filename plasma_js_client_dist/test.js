"use strict";

var _index = require("./index");

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var errHanler = function errHanler(name) {
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
    }, errHanler);
}, errHanler);
*/

_index2.default.sendTransaction(1000, 0, 0, _index2.default.web3.utils.padLeft("", 40), 1, 40, web3.utils.padLeft("1", 40), "0xfd02EcEE62797e75D86BCff1642EB0844afB28c7");