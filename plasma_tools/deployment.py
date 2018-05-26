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

from plasma.child_chain.child_chain import PICKLE_DIR

OWN_DIR = os.path.dirname(os.path.realpath(__file__))
CONTRACTS_DIR = OWN_DIR + '/contracts'
OUTPUT_DIR = OWN_DIR + '/contract_data'

def get_solc_input():
    """Walks the contract directory and returns a Solidity input dict

    Learn more about Solidity input JSON here: https://goo.gl/7zKBvj

    Returns:
        dict: A Solidity input JSON object as a dict
    """

    solc_input = {
        'language': 'Solidity',
        'sources': {
            file_name: {
                'urls': [os.path.realpath(os.path.join(r, file_name))]
            } for r, d, f in os.walk(CONTRACTS_DIR) for file_name in f if not file_name.startswith(".")
        }
    }

    return solc_input

def compile_contracts():
    """Compiles all of the contracts in the /contracts directory

    Creates {contract name}.json files in /build that contain
    the build output for each contract.
    """

    # Solidity input JSON
    solc_input = get_solc_input()

    # Compile the contracts
    compilation_result = compile_standard(solc_input, allow_paths=CONTRACTS_DIR)

    # Create the output folder if it doesn't already exist
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Write the contract ABI to output files
    compiled_contracts = compilation_result['contracts']
    for contract_file in compiled_contracts:
        for contract in compiled_contracts[contract_file]:
            contract_name = contract.split('.')[0]
            contract_data = compiled_contracts[contract_file][contract_name]

            contract_data_path = OUTPUT_DIR + '/{0}.json'.format(contract_name)
            with open(contract_data_path, "w+") as contract_data_file:
                json.dump(contract_data, contract_data_file)

def deploy():
    print("deleting child chain pickle")
    shutil.rmtree(PICKLE_DIR, ignore_errors=True)
    
    from plasma.root_chain.deployer import Deployer
    
    deployer = Deployer()
    deployer.compile_all()
    deployer.deploy_contract("RootChain")
    
    compile_contracts()
    erc721_contract = deployer.deploy_contract("ERC721Token", args=("My ERC721 Token", "MET721"))
    erc20_contract = deployer.deploy_contract("EIP20", args=(100000000 * (10 ** 18), "GOLD", 18, "GOLD"))


if __name__ == '__main__':
    deploy()