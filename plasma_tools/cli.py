#!/usr/bin/env python
# encoding: utf-8

import os
import sys
sys.path.append( os.path.join(os.path.dirname(__file__), '..') )

from plasma import cli


if __name__ == '__main__':
    cli.cli()