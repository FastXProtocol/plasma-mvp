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
#     process_cmd("submitblock 3bb369fecdc16b93b99514d8ed9c2e87c5824cf4a6a98d2e8e91b7dd0c063304")
    utxos = client.get_utxo(sys.argv[2], "latest")
    for blknum, txindex, oindex, contractaddress, amount, tokenid in utxos:
        if contractaddress.lower() == tools_config["ERC20_CONTRACT_ADDRESS"][2:].lower():
            if amount >= 1:
                process_cmd("sendtx {0} {1} {2} 0 0 0 {4} {5} 1 0 {6} {8} {3} 0 {7} {7}".format(
                    blknum, txindex, oindex,
                    amount - 1, sys.argv[1],
                    tools_config["ERC20_CONTRACT_ADDRESS"],
                    sys.argv[2] if amount - 1 > 0 else "0x0", sys.argv[3],
                    tools_config["ERC20_CONTRACT_ADDRESS"] if amount - 1 > 0 else "0x0"
                ))
                break
    else:
        raise ValueError("no available utxo")


if __name__ == '__main__':
    main()