#!/usr/bin/env python
# encoding: utf-8

import os
import sys
import shutil
sys.path.append( os.path.join(os.path.dirname(__file__), '..') )

import json
from solc import compile_standard
from web3.contract import ConciseContract, Contract
from web3 import Web3, HTTPProvider
from plasma.config import plasma_config
from plasma.root_chain.deployer import Deployer
from plasma.utils.utils import send_transaction_sync

OWN_DIR = os.path.dirname(os.path.realpath(__file__))
CONTRACTS_DIR = OWN_DIR + '/contracts'
OUTPUT_DIR = OWN_DIR + '/contract_data'


def deploy():
    address = plasma_config["COINBASE"]

    root_deployer = Deployer()
    root_chain = root_deployer.get_contract_at_address("RootChain", plasma_config['ROOT_CHAIN_CONTRACT_ADDRESS'], concise=False)
    
    deployer = Deployer(CONTRACTS_DIR=CONTRACTS_DIR, OUTPUT_DIR=OUTPUT_DIR)
    deployer.compile_all()
    
#     erc721_contract = deployer.deploy_contract("ERC721Token", args=("My ERC721 Token", "MET721"))
    erc721_address = "0x952CE607bD9ab82e920510b2375cbaD234d28c8F"
    erc721_contract = deployer.get_contract_at_address("ERC721Token", erc721_address, concise=False)
    
    print("minting erc721 ...")
    def mint(token_id):
        send_transaction_sync(deployer.w3, erc721_contract.functions.mint(plasma_config["COINBASE"], token_id), options={'gas': 300000})
        send_transaction_sync(deployer.w3, erc721_contract.functions.approve(plasma_config['ROOT_CHAIN_CONTRACT_ADDRESS'], token_id), options={'gas': 300000})
        send_transaction_sync(root_deployer.w3, root_chain.functions.deposit(erc721_address, 0, token_id), options={'gas': 300000})

    mint(117)
#     erc721_contract.mint(plasma_config["COINBASE"], 1, transact={'from': plasma_config["COINBASE"]})
#     erc721_contract.transact({'from': address}).mint(plasma_config["COINBASE"], 1)
#     root_chain.transact({'from': address}).deposit(erc721_contract.address, 0, 1)
    # erc721_contract.mint(plasma_config["COINBASE"], 4, transact={'from': plasma_config["COINBASE"]})
    # erc721_contract.mint(plasma_config["COINBASE"], 10, transact={'from': plasma_config["COINBASE"]})
    # erc721_contract.mint(plasma_config["COINBASE"], 16, transact={'from': plasma_config["COINBASE"]})
    # erc721_contract.mint(plasma_config["COINBASE"], 888, transact={'from': plasma_config["COINBASE"]})
    print("erc721 initialized")


if __name__ == '__main__':
    deploy()