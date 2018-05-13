'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; /*
                                                                                                                                                                                                                                                                               * This function can access the browser's web3 provider (e.g. MetaMask)
                                                                                                                                                                                                                                                                               */

exports.default = getWeb3;

var _web = require('web3');

var _web2 = _interopRequireDefault(_web);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var root = (typeof self === 'undefined' ? 'undefined' : _typeof(self)) === 'object' && self.self === self && self || (typeof global === 'undefined' ? 'undefined' : _typeof(global)) === 'object' && global.global === global && global || undefined;

var web3 = null;

function getWeb3() {
  if (typeof root.web3 === 'undefined') {
    // No web3 injected from the browser, use fallback...
    web3 = new _web2.default('ws://127.0.0.1:8545');
    root.web3 = web3;
  }

  // root.web3 == web3 most of the time, so we don't override the provided web3 and instead just wrap it in Web3
  var myWeb3 = new _web2.default(web3.currentProvider);

  // The default account doesn't seem to be persisted, so copy it to our new instance
  myWeb3.eth.defaultAccount = root.web3.eth.defaultAccount;

  return myWeb3;
}