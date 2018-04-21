#!/usr/bin/env python
# encoding: utf-8

import os
import sys
import subprocess
sys.path.append( os.path.join(os.path.dirname(__file__), '..') )

from plasma.client.client import Client
from plasma_tools.config import tools_config


def process_cmd(command, raise_exception=True):
    command = "python plasma_tools/cli.py %s" % command
    print("cmd: " + command)
    status, output = subprocess.getstatusoutput(command)
    if status != 0 and raise_exception:
        raise Exception("None zero return code")
    print(output)
    return status, output


client = Client()


def main():
    utxos = client.get_utxo("0xfd02EcEE62797e75D86BCff1642EB0844afB28c7", "latest")
    for blknum, txindex, oindex, contractaddress, amount, tokenid in utxos:
        if contractaddress.lower() == tools_config["ERC20_CONTRACT_ADDRESS"][2:].lower():
            if amount > 1:
                process_cmd("sendtx {0} {1} {2} 0 0 0 0xfd02ecee62797e75d86bcff1642eb0844afb28c7 {5} {3} 0 {4} {5} 1 0 3bb369fecdc16b93b99514d8ed9c2e87c5824cf4a6a98d2e8e91b7dd0c063304".format(
                    blknum, txindex, oindex, amount - 1, sys.argv[1], tools_config["ERC20_CONTRACT_ADDRESS"]
                ))
                break
    
#     get_available_eth("0xfd02EcEE62797e75D86BCff1642EB0844afB28c7")
#     balance = client.get_balance("0xfd02EcEE62797e75D86BCff1642EB0844afB28c7", "latest")


if __name__ == '__main__':
    main()