#!/usr/bin/env python
# encoding: utf-8

import os
import sys
import subprocess

sys.path.append( os.path.join(os.path.dirname(__file__), '..') )


if __name__ == '__main__':
    subprocess.call("python -m plasma.child_chain.server", shell=True)
