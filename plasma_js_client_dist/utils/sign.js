"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

var _typeof2 = require("babel-runtime/helpers/typeof");

var _typeof3 = _interopRequireDefault(_typeof2);

var _account = require("eth-lib/lib/account");

var _account2 = _interopRequireDefault(_account);

var _getWeb = require("./getWeb3");

var _getWeb2 = _interopRequireDefault(_getWeb);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var root = (typeof self === "undefined" ? "undefined" : (0, _typeof3.default)(self)) === 'object' && self.self === self && self || (typeof global === "undefined" ? "undefined" : (0, _typeof3.default)(global)) === 'object' && global.global === global && global || undefined;
var web3 = (0, _getWeb2.default)();

exports.default = function (hash, address) {
    if (root.process) {
        return new _promise2.default(function (resolve, reject) {
            return resolve(_account2.default.sign(hash, process.env.AUTHORITY_KEY));
        });
    } else {
        return web3.eth.sign(hash, address);
    }
};