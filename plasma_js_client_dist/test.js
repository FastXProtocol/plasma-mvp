"use strict";

var _regenerator = require("babel-runtime/regenerator");

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require("babel-runtime/helpers/asyncToGenerator");

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _client = require("./client");

var _client2 = _interopRequireDefault(_client);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {
    var utxos, i, utxo;
    return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
            switch (_context.prev = _context.next) {
                case 0:
                    _context.prev = 0;
                    _context.next = 3;
                    return _client2.default.sendDeposit("0x0", 100, 0, "0xfd02EcEE62797e75D86BCff1642EB0844afB28c7");

                case 3:
                    _context.t0 = console;
                    _context.next = 6;
                    return _client2.default.getBalance("0xfd02EcEE62797e75D86BCff1642EB0844afB28c7");

                case 6:
                    _context.t1 = _context.sent.data.result;

                    _context.t0.log.call(_context.t0, _context.t1);

                    _context.next = 10;
                    return _client2.default.getUTXO("0xfd02ecee62797e75d86bcff1642eb0844afb28c7");

                case 10:
                    utxos = _context.sent.data.result;
                    _context.t2 = _regenerator2.default.keys(utxos);

                case 12:
                    if ((_context.t3 = _context.t2()).done) {
                        _context.next = 28;
                        break;
                    }

                    i = _context.t3.value;
                    utxo = utxos[i];

                    if (!(utxo[4] >= 0 && utxo[5] == 0)) {
                        _context.next = 26;
                        break;
                    }

                    console.log(utxo);
                    _context.next = 19;
                    return _client2.default.sendTransaction(utxo[0], utxo[1], utxo[2], 0, 0, 0, "0xfd02ecee62797e75d86bcff1642eb0844afb28c7", utxo[3], utxo[4] - 1, utxo[5], "0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26", utxo[3], 1, 0, undefined, undefined, undefined, undefined, undefined, "0xfd02ecee62797e75d86bcff1642eb0844afb28c7", "0xfd02ecee62797e75d86bcff1642eb0844afb28c7");

                case 19:
                    _context.t4 = console;
                    _context.next = 22;
                    return _client2.default.getBalance("0xfd02EcEE62797e75D86BCff1642EB0844afB28c7");

                case 22:
                    _context.t5 = _context.sent.data.result;

                    _context.t4.log.call(_context.t4, _context.t5);

                    process.exit();
                    return _context.abrupt("break", 28);

                case 26:
                    _context.next = 12;
                    break;

                case 28:
                    _context.next = 34;
                    break;

                case 30:
                    _context.prev = 30;
                    _context.t6 = _context["catch"](0);

                    console.log(_context.t6);
                    process.exit();

                case 34:
                case "end":
                    return _context.stop();
            }
        }
    }, _callee, undefined, [[0, 30]]);
}))();