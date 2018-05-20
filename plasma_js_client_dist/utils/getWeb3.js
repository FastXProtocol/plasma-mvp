'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

exports.default = getWeb3;

var _web = require('web3');

var _web2 = _interopRequireDefault(_web);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var root = (typeof self === 'undefined' ? 'undefined' : (0, _typeof3.default)(self)) === 'object' && self.self === self && self || (typeof global === 'undefined' ? 'undefined' : (0, _typeof3.default)(global)) === 'object' && global.global === global && global || undefined; /*
                                                                                                                                                                                                                                                                                   * This function can access the browser's web3 provider (e.g. MetaMask)
                                                                                                                                                                                                                                                                                   */

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