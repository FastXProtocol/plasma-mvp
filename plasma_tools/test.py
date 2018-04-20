#!/usr/bin/env python
# encoding: utf-8

import os
import sys
import json
sys.path.append( os.path.join(os.path.dirname(__file__), '..') )

from ethereum import utils
from web3.contract import ConciseContract
from web3 import Web3, HTTPProvider
from plasma.cli.client import ClientParser
from plasma.config import plasma_config
from plasma_tools.config import tools_config
from plasma_tools.deployment import deploy


client_parser = ClientParser()
w3 = Web3(HTTPProvider('http://localhost:8545'))
erc721_contract = w3.eth.contract(json.load(open("contract_data/ERC721Token.json")), tools_config['ERC721_CONTRACT_ADDRESS'], ContractFactoryClass=ConciseContract)
erc20_contract = w3.eth.contract(json.load(open("contract_data/EIP20.json")), tools_config['ERC20_CONTRACT_ADDRESS'], ContractFactoryClass=ConciseContract)


def process_cmd(cmd):
    return client_parser.process_input(cmd.split(' '))


def test():
#     deploy()
    
    process_cmd("deposit 0 100 0 3bb369fecdc16b93b99514d8ed9c2e87c5824cf4a6a98d2e8e91b7dd0c063304")
    
    print("erc20 balance: ", erc20_contract.balanceOf('0xfd02EcEE62797e75D86BCff1642EB0844afB28c7'))
    erc20_contract.approve(plasma_config['ROOT_CHAIN_CONTRACT_ADDRESS'], 100, transact={'from': '0xfd02EcEE62797e75D86BCff1642EB0844afB28c7'})
    process_cmd("deposit {} 100 0 3bb369fecdc16b93b99514d8ed9c2e87c5824cf4a6a98d2e8e91b7dd0c063304".format(tools_config['ERC20_CONTRACT_ADDRESS']))
    print("erc20 balance: ", erc20_contract.balanceOf('0xfd02EcEE62797e75D86BCff1642EB0844afB28c7'))
    
    erc721_contract.mint('0xfd02EcEE62797e75D86BCff1642EB0844afB28c7', 1, transact={'from': '0xfd02EcEE62797e75D86BCff1642EB0844afB28c7'})
    erc721_contract.approve(plasma_config['ROOT_CHAIN_CONTRACT_ADDRESS'], 1, transact={'from': '0xfd02EcEE62797e75D86BCff1642EB0844afB28c7'})
    print("erc721 #1 ownner: ", erc721_contract.ownerOf(1))
    process_cmd("deposit {} 0 1 3bb369fecdc16b93b99514d8ed9c2e87c5824cf4a6a98d2e8e91b7dd0c063304".format(tools_config['ERC721_CONTRACT_ADDRESS']))
    print("erc721 #1 ownner: ", erc721_contract.ownerOf(1))
    
    process_cmd("send_tx 1 0 0 0 0 0 0xfd02ecee62797e75d86bcff1642eb0844afb28c7 50 0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26 45 5 3bb369fecdc16b93b99514d8ed9c2e87c5824cf4a6a98d2e8e91b7dd0c063304")
    process_cmd("submit_block 3bb369fecdc16b93b99514d8ed9c2e87c5824cf4a6a98d2e8e91b7dd0c063304")
    


if __name__ == '__main__':
    test()