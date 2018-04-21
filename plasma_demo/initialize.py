#!/usr/bin/env python
# encoding: utf-8

import os
import sys
import json
import subprocess
sys.path.append( os.path.join(os.path.dirname(__file__), '..') )

from plasma_tools.deployment import deploy
from plasma_tools.config import tools_config


def process_cmd(command, raise_exception=True):
    command = "python plasma_tools/cli.py %s" % command
    print("cmd: " + command)
    status, output = subprocess.getstatusoutput(command)
    if status != 0 and raise_exception:
        raise Exception("None zero return code")
    print(output)
    return status, output


def main():
    deploy()
    process_cmd("deposit {0} 1000000000 0 0xfd02EcEE62797e75D86BCff1642EB0844afB28c7".format(tools_config["ERC20_CONTRACT_ADDRESS"]))
    process_cmd("submitblock 3bb369fecdc16b93b99514d8ed9c2e87c5824cf4a6a98d2e8e91b7dd0c063304")
    process_cmd("balance 0xfd02EcEE62797e75D86BCff1642EB0844afB28c7 latest")


if __name__ == '__main__':
    main()