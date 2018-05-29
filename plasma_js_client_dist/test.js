"use strict";

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _client = require("./client");

var _client2 = _interopRequireDefault(_client);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var testAddress = "0xfd02EcEE62797e75D86BCff1642EB0844afB28c7";

var logBalance = function () {
    var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
        var address = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : testAddress;
        return _regenerator2.default.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        _context.t0 = console;
                        _context.next = 3;
                        return _client2.default.getBalance("0xfd02EcEE62797e75D86BCff1642EB0844afB28c7");

                    case 3:
                        _context.t1 = _context.sent.data.result;

                        _context.t0.log.call(_context.t0, "balance", _context.t1);

                    case 5:
                    case "end":
                        return _context.stop();
                }
            }
        }, _callee, undefined);
    }));

    return function logBalance() {
        return _ref.apply(this, arguments);
    };
}();

var getUTXOs = function () {
    var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2() {
        var address = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : testAddress;
        return _regenerator2.default.wrap(function _callee2$(_context2) {
            while (1) {
                switch (_context2.prev = _context2.next) {
                    case 0:
                        _context2.next = 2;
                        return _client2.default.getUTXO("0xfd02ecee62797e75d86bcff1642eb0844afb28c7");

                    case 2:
                        return _context2.abrupt("return", _context2.sent.data.result);

                    case 3:
                    case "end":
                        return _context2.stop();
                }
            }
        }, _callee2, undefined);
    }));

    return function getUTXOs() {
        return _ref2.apply(this, arguments);
    };
}();

var testTx = function () {
    var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3() {
        var utxos, i, utxo;
        return _regenerator2.default.wrap(function _callee3$(_context3) {
            while (1) {
                switch (_context3.prev = _context3.next) {
                    case 0:
                        console.log("---------- testing transaction ----------");
                        _context3.prev = 1;
                        _context3.next = 4;
                        return _client2.default.sendDeposit("0x0", 100, 0, "0xfd02EcEE62797e75D86BCff1642EB0844afB28c7");

                    case 4:
                        _context3.next = 6;
                        return logBalance();

                    case 6:
                        _context3.next = 8;
                        return getUTXOs();

                    case 8:
                        utxos = _context3.sent;
                        _context3.t0 = _regenerator2.default.keys(utxos);

                    case 10:
                        if ((_context3.t1 = _context3.t0()).done) {
                            _context3.next = 22;
                            break;
                        }

                        i = _context3.t1.value;
                        utxo = utxos[i];

                        if (!(utxo[4] >= 0 && utxo[5] == 0)) {
                            _context3.next = 20;
                            break;
                        }

                        console.log(utxo);
                        //                 await client.sendTransaction(utxo[0], utxo[1], utxo[2], 0, 0, 0, "0xfd02ecee62797e75d86bcff1642eb0844afb28c7", utxo[3], utxo[4] - 1, utxo[5], "0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26", utxo[3], 1, 0, undefined, undefined, undefined, undefined, undefined, "0xfd02ecee62797e75d86bcff1642eb0844afb28c7", "0xfd02ecee62797e75d86bcff1642eb0844afb28c7");
                        _context3.next = 17;
                        return _client2.default.sendTransaction(utxo[0], utxo[1], utxo[2], 0, 0, 0, "0xfd02ecee62797e75d86bcff1642eb0844afb28c7", utxo[3], utxo[4] - 1, utxo[5], "0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26", utxo[3], 1, 0);

                    case 17:
                        _context3.next = 19;
                        return logBalance();

                    case 19:
                        return _context3.abrupt("break", 22);

                    case 20:
                        _context3.next = 10;
                        break;

                    case 22:
                        _context3.next = 28;
                        break;

                    case 24:
                        _context3.prev = 24;
                        _context3.t2 = _context3["catch"](1);

                        console.log(_context3.t2);
                        process.exit();

                    case 28:
                    case "end":
                        return _context3.stop();
                }
            }
        }, _callee3, undefined, [[1, 24]]);
    }));

    return function testTx() {
        return _ref3.apply(this, arguments);
    };
}();

var testPsTx = function () {
    var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4() {
        var utxos, i, utxo, psTransaction;
        return _regenerator2.default.wrap(function _callee4$(_context4) {
            while (1) {
                switch (_context4.prev = _context4.next) {
                    case 0:
                        console.log("---------- testing partially signed transaction ----------");
                        _context4.t0 = console;
                        _context4.next = 4;
                        return _client2.default.getAllPsTransactions();

                    case 4:
                        _context4.t1 = _context4.sent.data.result;

                        _context4.t0.log.call(_context4.t0, "ps tranctions", _context4.t1);

                        _context4.next = 8;
                        return getUTXOs();

                    case 8:
                        utxos = _context4.sent;
                        _context4.t2 = _regenerator2.default.keys(utxos);

                    case 10:
                        if ((_context4.t3 = _context4.t2()).done) {
                            _context4.next = 35;
                            break;
                        }

                        i = _context4.t3.value;
                        utxo = utxos[i];

                        if (!(utxo[4] >= 0 && utxo[5] == 0)) {
                            _context4.next = 33;
                            break;
                        }

                        console.log(utxo);
                        _context4.next = 17;
                        return _client2.default.sendPsTransaction(utxo[0], utxo[1], utxo[2], "0xfd02ecee62797e75d86bcff1642eb0844afb28c7", utxo[3], utxo[4] - 1, utxo[5], utxo[3], 1, 0);

                    case 17:
                        _context4.next = 19;
                        return logBalance();

                    case 19:
                        _context4.next = 21;
                        return _client2.default.getAllPsTransactions();

                    case 21:
                        psTransaction = _context4.sent.data.result[0];

                        console.log(psTransaction);
                        _context4.next = 25;
                        return _client2.default.sendPsTransactionFill(psTransaction, 0, 0, 0, "0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26");

                    case 25:
                        _context4.t4 = console;
                        _context4.next = 28;
                        return _client2.default.getAllPsTransactions();

                    case 28:
                        _context4.t5 = _context4.sent.data.result;

                        _context4.t4.log.call(_context4.t4, "ps tranctions", _context4.t5);

                        _context4.next = 32;
                        return logBalance();

                    case 32:
                        return _context4.abrupt("break", 35);

                    case 33:
                        _context4.next = 10;
                        break;

                    case 35:
                    case "end":
                        return _context4.stop();
                }
            }
        }, _callee4, undefined);
    }));

    return function testPsTx() {
        return _ref4.apply(this, arguments);
    };
}();

var main = function () {
    var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5() {
        return _regenerator2.default.wrap(function _callee5$(_context5) {
            while (1) {
                switch (_context5.prev = _context5.next) {
                    case 0:
                        _context5.next = 2;
                        return testTx();

                    case 2:
                        _context5.next = 4;
                        return testPsTx();

                    case 4:
                        process.exit();

                    case 5:
                    case "end":
                        return _context5.stop();
                }
            }
        }, _callee5, undefined);
    }));

    return function main() {
        return _ref5.apply(this, arguments);
    };
}();

main();