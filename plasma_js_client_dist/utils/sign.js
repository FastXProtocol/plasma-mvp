"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

var _account = require("eth-lib/lib/account");

var _account2 = _interopRequireDefault(_account);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = function (msg) {
    return new _promise2.default(function (resolve, reject) {
        return resolve(_account2.default.sign(msg, process.env.AUTHORITY_KEY));
    });
};