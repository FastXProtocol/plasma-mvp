#!/usr/bin/env python
# encoding: utf-8

import os
import sys
import json
import subprocess
sys.path.append( os.path.join(os.path.dirname(__file__), '..') )

from ethereum import utils
from web3.contract import ConciseContract
from web3 import Web3, HTTPProvider
from plasma.cli import cli
from plasma.config import plasma_config
from plasma_tools.config import tools_config
from plasma.root_chain.deployer import Deployer


w3 = Web3(HTTPProvider(plasma_config['NETWORK']))
deployer = Deployer()
erc721_contract = deployer.get_contract_at_address("ERC721Token", tools_config['ERC721_CONTRACT_ADDRESS'], concise=True)
erc20_contract = deployer.get_contract_at_address("EIP20", tools_config['ERC20_CONTRACT_ADDRESS'], concise=True)


def process_cmd(command, raise_exception=True):
    command = "python plasma_tools/cli.py %s" % command
    print("cmd: " + command)
    status, output = subprocess.getstatusoutput(command)
    if status != 0 and raise_exception:
        raise Exception("None zero return code")
    print(output)
    return status, output


def test():
    process_cmd("deposit 0x0 100 0 0xfd02EcEE62797e75D86BCff1642EB0844afB28c7")
    
    print("erc20 balance: ", erc20_contract.balanceOf('0xfd02EcEE62797e75D86BCff1642EB0844afB28c7'))
    erc20_contract.approve(plasma_config['ROOT_CHAIN_CONTRACT_ADDRESS'], 100, transact={'from': '0xfd02EcEE62797e75D86BCff1642EB0844afB28c7'})
    process_cmd("deposit {} 100 0 0xfd02EcEE62797e75D86BCff1642EB0844afB28c7".format(tools_config['ERC20_CONTRACT_ADDRESS']))
    print("erc20 balance: ", erc20_contract.balanceOf('0xfd02EcEE62797e75D86BCff1642EB0844afB28c7'))
    
    erc721_contract.mint('0xfd02EcEE62797e75D86BCff1642EB0844afB28c7', 1, transact={'from': '0xfd02EcEE62797e75D86BCff1642EB0844afB28c7'})
    erc721_contract.approve(plasma_config['ROOT_CHAIN_CONTRACT_ADDRESS'], 1, transact={'from': '0xfd02EcEE62797e75D86BCff1642EB0844afB28c7'})
    print("erc721 #1 ownner: ", erc721_contract.ownerOf(1))
    process_cmd("deposit {} 0 1 0xfd02EcEE62797e75D86BCff1642EB0844afB28c7".format(tools_config['ERC721_CONTRACT_ADDRESS']))
    print("erc721 #1 ownner: ", erc721_contract.ownerOf(1))
    
    process_cmd("submitblock 3bb369fecdc16b93b99514d8ed9c2e87c5824cf4a6a98d2e8e91b7dd0c063304")
    
    process_cmd("balance 0xfd02EcEE62797e75D86BCff1642EB0844afB28c7 latest")
    
    process_cmd("sendtx 1 0 0 0 0 0 0xfd02ecee62797e75d86bcff1642eb0844afb28c7 0x0 40 0 0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26 0x0 60 0 3bb369fecdc16b93b99514d8ed9c2e87c5824cf4a6a98d2e8e91b7dd0c063304")
    
    process_cmd("sendtx 2 0 0 0 0 0 0xfd02ecee62797e75d86bcff1642eb0844afb28c7 {ERC20_CONTRACT_ADDRESS} 30 0 0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26 {ERC20_CONTRACT_ADDRESS} 70 0 3bb369fecdc16b93b99514d8ed9c2e87c5824cf4a6a98d2e8e91b7dd0c063304".format(**tools_config))
    
    process_cmd("sendtx 3 0 0 0 0 0 0x4b3ec6c9dc67079e82152d6d55d8dd96a8e6aa26 {ERC721_CONTRACT_ADDRESS} 0 1 0x0 0x0 0 0 3bb369fecdc16b93b99514d8ed9c2e87c5824cf4a6a98d2e8e91b7dd0c063304".format(**tools_config))
    
    process_cmd("submitblock 3bb369fecdc16b93b99514d8ed9c2e87c5824cf4a6a98d2e8e91b7dd0c063304")
    
    process_cmd("balance 0xfd02EcEE62797e75D86BCff1642EB0844afB28c7 latest")


if __name__ == '__main__':
    test()