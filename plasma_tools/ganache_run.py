#!/usr/bin/env python
# encoding: utf-8

import os
import sys
import signal
import shutil
import subprocess
import traceback
from time import sleep
sys.path.append( os.path.join(os.path.dirname(__file__), '..') )

from plasma_tools.deployment import deploy


def ganache_run():
    process = subprocess.Popen(
        ["ganache-cli", "-m", "plasma_mvp"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    deployed = False
    while True:
        out = process.stdout.readline()[:-1]
        if out:
            out = out.decode()
            if not deployed and out.startswith("Listening on "):
                deployed = True
                print("--------- deploying ---------")
                try:
                    deploy()
                except Exception as e:
                    print("deploy failed")
                    traceback.print_exc()
                    os.killpg(os.getpgid(process.pid), signal.SIGTERM)
                    raise e
                print("--------- deployed ---------")
            print(out)
        else:
            sleep(0.2)
    
    
if __name__ == "__main__":
    ganache_run()