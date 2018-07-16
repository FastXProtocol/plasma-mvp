# FastX Protocol

Live demo: https://fastxprotocol.github.io

This project is forked from Omisego's [Plasma MVP](https://github.com/omisego/plasma-mvp), but we've added a few more features as follows: 

* First, we implemented a Javascript client/wallet, to have it to work both on the server and in the browser.

* Secondly, we added supports for creating orders directly on the child chain. A user creates an order by specifying the asset and amount to sell, the asset and amount to buy, and other parameters, like the expiration date etc; signs the transaction and sends it to the network. The orders are stored in order pools of all FastX nodes. If there's another user who wants to take the order, she then signs the order with her private key, and sends signed order to the network to finish the deal. That way, wallet-to-wallet tradings can be done without any 3rd-party intermediaries.

* Time-locks are added to allow transactions to expire in a given period of time.

* A few tools, like taking snapshots of the child chain, are added for easier development and debugging

## Overview

FastX consists of three parts, `root_chain`, `child_chain`, and `client/wallet`. Below is an overview of each sub-project.

### root_chain

`root_chain` represents the FastX contract to be deployed to the root blockchain. In our case, this contract is written in Solidity and is designed to be deployed to Ethereum. `root_chain` also includes a compilation/deployment script. 

`RootChain.sol` is based off of the Plasma design specified in [Minimum Viable Plasma](https://ethresear.ch/t/minimal-viable-plasma/426). Currently, this contract allows a single authority to publish child chain blocks to the root chain. This is *not* a permanent design and is intended to simplify development of more critical components in the short term. 

### child_chain

`child_chain` is a Python implementation of a Plasma MVP child chain client. It's useful to think of `child_chain` as analogous to [Parity](https://www.parity.io) or [Geth](https://geth.ethereum.org). This component manages a store of `Blocks` and `Transactions` that are updated when events are fired in the root contract.

`child_chain` also contains an RPC server that enables client interactions. By default, this server runs on port `8546`. 

### client

`plasma_js_client` is implemented in Javascript, so that it can be run both on the server and in the browser.


## Getting Started

### Dependencies

This project has a few pre-installation dependencies.

- [LevelDB](https://github.com/google/leveldb)

Mac:
```
$ brew install leveldb
```

Linux:

LevelDB should be installed along with `plyvel` once you make the project later on.

Windows:

First, install [vcpkg](https://github.com/Microsoft/vcpkg). Then,

```
> vcpkg install leveldb
```

- [Solidity 0.4.18](https://github.com/ethereum/solidity/releases/tag/v0.4.18)

Mac:
```
$ brew unlink solidity
$ brew install https://raw.githubusercontent.com/ethereum/homebrew-ethereum/2aea171d7d6901b97d5f1f71bd07dd88ed5dfb42/solidity.rb
```

Linux:
```
$ wget https://github.com/ethereum/solidity/releases/download/v0.4.18/solc-static-linux
$ chmod +x ./solc-static-linux
$ sudo mv solc-static-linux /usr/bin/solc
```

Windows:

Follow [this guide](https://solidity.readthedocs.io/en/v0.4.21/installing-solidity.html#prerequisites-windows).

- [Python 3.2+](https://www.python.org/downloads/)

It's also recommended to run [`ganache-cli`](https://github.com/trufflesuite/ganache-cli) when developing, testing, or playing around. This will allow you to receive near instant feedback.

### Installation

Use [Miniconda](https://conda.io/miniconda.html) to create an isolated Python environment:

    $ conda create -n plasma-mvp python=3
    $ source activate plasma-mvp

Fetch and install the project's dependencies with:

    $ python setup.py develop

To install dependencies of the Javascript client:

    $ yarn install


### Starting Plasma

The fastest way to start playing with our Plasma MVP is by starting up `ganache-cli`, deploying everything locally, and running our CLI. Full documentation for the CLI is available [here](#cli-documentation).

```bash
$ ganache-cli -m=plasma_mvp              # Start ganache-cli
$ python plasma_tools/deployment.py      # Deploy the root chain contract
$ python plasma_tools/server.py          # Run our child chain and server
```

### Test the client

Before you run tests, make sure you have an Ethereum client running and an JSON RPC API exposed on port `8545`. and Plasma server is running on port `8546`.

Client tests can be found in the `plasma_js_client/` folder. All the tests can be listed by:

    $ npm run test


## Useful Tools for Development and Debugging

### Child-chain Auto-snapshots

Add `MIN_SNAPSHOT_SECONDS=60` to `plasma\config.py` to enable auto-snapshots feature for the child chain. The value is in seconds, and `0` means to turn off the feature.

Once there are snapshots taken, run the following comand to load and inspect any snapshots:

    $ python plamsa_tools/chain_inspect.py
    
