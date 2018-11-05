import os
import pickle
from time import time as ttime
from collections import defaultdict

import rlp
from ethereum import utils

from plasma.config import plasma_config
from .block import Block
from .exceptions import (InvalidBlockMerkleException,
                         InvalidBlockSignatureException,
                         InvalidTxSignatureException, TxAlreadySpentException,
                         TxAmountMismatchException, InvalidTxOutputsException,
                         InvalidTxInputsException, TxExpiredException,
                         BlockExpiredException, )
from .transaction import Transaction, UnsignedTransaction0
from .snapshot import make_snapshot


class ChildChain(object):

    def __init__(self, authority, root_chain, partially_signed_transaction_pool=None, load=True):
        self.root_chain = root_chain
        self.partially_signed_transaction_pool = partially_signed_transaction_pool
        self.authority = authority
        self.blocks = {}
        self.child_block_interval = 1000
        self.current_block_number = self.child_block_interval
        self.current_block = Block()
        self.pending_transactions = []

        if load:
            self.load()

        # Register for deposit event listener
        deposit_filter = self.root_chain.on("Deposit")
        deposit_filter.watch(self.apply_deposit)
        
        exit_start_filter = self.root_chain.on("ExitStarted")
        exit_start_filter.watch(self.apply_exit_start)

        if plasma_config["DEBUG"]:
            for abi in self.root_chain.abi:
                if abi.get("type") == "event" and abi["name"] not in ["Deposit", "ExitStarted"]:
                    self.root_chain.on(abi["name"]).watch(lambda event: print("Root Chain Event: %s" % abi["name"], event))
    
    @property
    def save_field_names(self):
        return ["blocks", "current_block_number", "current_block", "pending_transactions"]
    
    def save(self):
#         print('saving child chain...')
        if not os.path.exists(plasma_config["PICKLE_DIR"]):
            os.mkdir(plasma_config["PICKLE_DIR"])

        make_snapshot()

        for field_name in self.save_field_names:
#             print('saving %s...' % field_name)
            with open(os.path.join(plasma_config["PICKLE_DIR"], field_name + ".pickle"), "wb") as f:
                pickle.dump(getattr(self, field_name), f, pickle.HIGHEST_PROTOCOL)
        print('child chain saved')
    
    def load(self):
        if os.path.exists(plasma_config["PICKLE_DIR"]):
            for field_name in self.save_field_names:
                print('loading %s...' % field_name)
                try:
                    with open(os.path.join(plasma_config["PICKLE_DIR"], field_name + ".pickle"), 'rb') as f:
                        setattr(self, field_name, pickle.load(f))
                except Exception as e:
                    print("load %s failed: %s" % (field_name, str(e)))

    def apply_deposit(self, event):
        event_args = event['args']
        newowner1 = event_args['depositor']
        contractaddress1 = event_args['contractAddress']
        amount1 = event_args['amount']
        tokenid1 = event_args['tokenId']
        blknum1 = event_args['depositBlock']

        deposit_tx = Transaction(blknum1, 0, 0, 0, 0, 0,
                                 newowner1, contractaddress1, amount1, tokenid1,
                                 b'\x00' * 20, 0, 0, 0)
        deposit_block = Block([deposit_tx])

        self.blocks[blknum1] = deposit_block
        print("Deposit Block Number: %s" % blknum1)
        
        self.save()
    
    def challenge_exit(self, utxopos, blknum, txindex, oindex):
        for block_number, block in self.blocks.items():
            if block_number >= blknum:
                for transaction_index, transaction in enumerate(block.transaction_set):
                    e_utxo_index = None
                    if transaction.blknum1 == blknum and \
                        transaction.txindex1 == txindex and \
                        transaction.oindex1 == oindex:
                        e_utxo_index = 0
                    if transaction.blknum2 == blknum and \
                        transaction.txindex2 == txindex and \
                        transaction.oindex2 == oindex:
                        e_utxo_index = 1
                    if e_utxo_index is not None:
                        block.merklize_transaction_set()
                        proof = block.merkle.create_membership_proof(transaction.merkle_hash)
                        self.root_chain.transact({'from': '0x' + self.authority.hex()}).challengeExit(
                            block_number * 1000000000 + transaction_index * 10000,
                            e_utxo_index,
                            rlp.encode(transaction, UnsignedTransaction0),
                            proof,
                            transaction.sig1 + transaction.sig2)
                        print("Exiting Challenged Send, UTXOPos: %s" % utxopos)
                        return None
        print("Exiting Challenge Does Not Exists, UTXOPos: %s" % utxopos)
    
    def apply_exit_start(self, event):
        event_args = event['args']
        exitor = event_args['exitor']
        utxopos = event_args['utxoPos']
        contractaddress = event_args['contractAddress']
        amount = event_args['amount']
        tokenid = event_args['tokenId']
        
        blknum = utxopos // 1000000000
        txindex = (utxopos % 1000000000) // 10000
        oindex = utxopos - blknum * 1000000000 - txindex * 10000
        
        block = self.blocks.get(blknum)
        if block is None:
            print("Exiting Block Does Not Exists, UTXOPos: %s" % utxopos)
            return None
        
        try:
            transaction = block.transaction_set[txindex]
        except IndexError:
            print("Exiting Transaction Does Not Exists, UTXOPos: %s" % utxopos)
            return None
        
        if oindex == 0:
            if utils.normalize_address(transaction.newowner1) != utils.normalize_address(exitor) or \
                utils.normalize_address(transaction.contractaddress1) != utils.normalize_address(contractaddress) or \
                transaction.amount1 != amount or \
                transaction.tokenid1 != tokenid:
                print("Exiting UTXO Does Not Match, UTXOPos: %s" % utxopos)
                return None
            if transaction.spent1:
                return self.challenge_exit(utxopos, blknum, txindex, oindex)
        else:
            if utils.normalize_address(transaction.newowner2) != utils.normalize_address(exitor) or \
                utils.normalize_address(transaction.contractaddress2) != utils.normalize_address(contractaddress) or \
                transaction.amount2 != amount or \
                transaction.tokenid2 != tokenid:
                print("Exiting UTXO Does Not Match, UTXOPos: %s" % utxopos)
                return None
            if transaction.spent2:
                return self.challenge_exit(utxopos, blknum, txindex, oindex)
        
        self.mark_utxo_spent(blknum, txindex, oindex)
        print("Exit Start %s %s %s" % (blknum, txindex, oindex))
        
        self.save()

    def apply_transaction(self, transaction):
        tx = rlp.decode(utils.decode_hex(transaction), Transaction)

        # Validate the transaction
        self.validate_tx(tx)

        # Mark the inputs as spent
        self.mark_utxo_spent(tx.blknum1, tx.txindex1, tx.oindex1)
        self.mark_utxo_spent(tx.blknum2, tx.txindex2, tx.oindex2)

        self.current_block.transaction_set.append(tx)
        self.blocks[self.current_block_number] = self.current_block
        
#         if self.partially_signed_transaction_pool is not None:
#             self.partially_signed_transaction_pool.remove_ps_transaction(tx)
        
        self.save()
        
        return tx.hash0.hex()

    def validate_outputs(self, contractaddress, amount, tokenid):
        if amount < 0 or tokenid < 0:
            raise InvalidTxOutputsException('failed to validate tx')
        if contractaddress == utils.normalize_address(0) and \
            amount == 0 and \
            tokenid == 0:
            return True
        if amount == 0 and tokenid == 0:
            raise InvalidTxOutputsException('failed to validate tx')

        if contractaddress == utils.normalize_address(0):
            if tokenid != 0:
                raise InvalidTxOutputsException('failed to validate tx')
        elif amount == 0:
            if tokenid == 0:
                raise InvalidTxOutputsException('failed to validate tx')
        else:
            if tokenid != 0:
                raise InvalidTxOutputsException('failed to validate tx')
        return True

    def validate_tx(self, tx):
        if tx.sig1 == b'\x00' * 65 or tx.sig2 == b'\x00' * 65:
            raise InvalidTxSignatureException('failed to validate tx')
        
        if (tx.blknum1, tx.txindex1, tx.oindex1) == (tx.blknum2, tx.txindex2, tx.oindex2):
            raise InvalidTxInputsException('failed to validate tx')
        
        if (int(ttime()) + plasma_config["TX_EXPIRE_BUFFER_SECONDS"] > tx.expiretimestamp):
            raise TxExpiredException('failed to validate tx')
        
        self.validate_outputs(tx.contractaddress1, tx.amount1, tx.tokenid1)
        self.validate_outputs(tx.contractaddress2, tx.amount2, tx.tokenid2)
        
        if tx.tokenid1 != 0 and \
            tx.tokenid2 != 0 and \
            tx.tokenid1 == tx.tokenid2 and \
            tx.contractaddress1 == tx.contractaddress2:
            raise InvalidTxOutputsException('failed to validate tx')
        
        output_amounts = defaultdict(int)
        if tx.amount1 != 0:
            output_amounts[tx.contractaddress1] += tx.amount1
        if tx.amount2 != 0:
            output_amounts[tx.contractaddress2] += tx.amount2
        
        output_nfts = []
        if tx.tokenid1 != 0:
            output_nfts.append((tx.contractaddress1, tx.tokenid1))
        if tx.tokenid2 != 0:
            output_nfts.append((tx.contractaddress2, tx.tokenid2))
        
        inputs = [(tx.blknum1, tx.txindex1, tx.oindex1), (tx.blknum2, tx.txindex2, tx.oindex2)]

        input_amounts = defaultdict(int)
        input_nfts = []

        for i, (blknum, txindex, oindex) in enumerate(inputs):
            # Assume empty inputs and are valid
            if blknum == 0:
                continue
            
            curSign = getattr(tx, "sign" + str(i + 1))
            curSender = getattr(tx, "sender" + str(i + 1))
            
            transaction = self.blocks[blknum].transaction_set[txindex]

            if oindex == 0:
                valid_signature = curSign != b'\x00' * 65 and transaction.newowner1 == curSender
                spent = transaction.spent1
                if transaction.amount1 != 0:
                    input_amounts[transaction.contractaddress1] += transaction.amount1
                if transaction.tokenid1 != 0:
                    input_nfts.append((transaction.contractaddress1, transaction.tokenid1))
            else:
                valid_signature = curSign != b'\x00' * 65 and transaction.newowner2 == curSender
                spent = transaction.spent2
                if transaction.amount2 != 0:
                    input_amounts[transaction.contractaddress2] += transaction.amount2
                if transaction.tokenid2 != 0:
                    input_nfts.append((transaction.contractaddress2, transaction.tokenid2))
            if spent:
                raise TxAlreadySpentException('failed to validate tx')
            if not valid_signature:
                raise InvalidTxSignatureException('failed to validate tx')
        
        if sorted(output_amounts.items()) != sorted(input_amounts.items()):
            raise TxAmountMismatchException('failed to validate tx')
        
        if sorted(output_nfts) != sorted(input_nfts):
            raise TxAmountMismatchException('failed to validate tx')

    def mark_utxo_spent(self, blknum, txindex, oindex):
        if blknum == 0:
            return

        if oindex == 0:
            self.blocks[blknum].transaction_set[txindex].spent1 = True
        else:
            self.blocks[blknum].transaction_set[txindex].spent2 = True
        
        if self.partially_signed_transaction_pool is not None:
            self.partially_signed_transaction_pool.utxo_spent(blknum, txindex, oindex)

    def _submit_block(self, block):
        self.root_chain.transact({'from': '0x' + self.authority.hex()}).submitBlock(block.merkle.root, block.min_expire_timestamp)
        # TODO: iterate through block and validate transactions
        self.blocks[self.current_block_number] = self.current_block
        self.current_block_number += self.child_block_interval
        self.current_block = Block()
        self.save()
    

    def submit_curblock(self):
        block = self.current_block
        if len(block.transaction_set) > 0:
            if (int(ttime()) + plasma_config["BLOCK_EXPIRE_BUFFER_SECONDS"] > block.min_expire_timestamp):
                print('block expired, drop it')
                self.current_block = Block()
                self.blocks[self.current_block_number] = self.current_block
                
                self.save()
            else:
                block.sign(plasma_config["AUTHORITY_KEY"])
                block.merklize_transaction_set()
                print("submit block #%s" % self.current_block_number)
                self._submit_block(block)
    
    def submit_block(self, block):
        block = rlp.decode(utils.decode_hex(block), Block)
        if block.merklize_transaction_set() != self.current_block.merklize_transaction_set():
            raise InvalidBlockMerkleException('input block merkle mismatch with the current block')

        valid_signature = block.sig != b'\x00' * 65 and block.sender == self.authority
        if not valid_signature:
            raise InvalidBlockSignatureException('failed to submit block')
        
        if len(block.transaction_set) == 0:
            print("no transaction in block, do nothing")
            return
        
        if (int(ttime()) + plasma_config["BLOCK_EXPIRE_BUFFER_SECONDS"] > block.min_expire_timestamp):
#             raise BlockExpiredException('failed to submit block')
                print('block expired, drop it!')
                self.current_block = Block()
                
                self.save()

        print("submit block ...")
        self._submit_block(block)

    def get_transaction(self, blknum, txindex):
        return rlp.encode(self.blocks[blknum].transaction_set[txindex]).hex()

    def get_block(self, blknum):
        return rlp.encode(self.blocks[blknum]).hex()

    def get_current_block(self):
        return rlp.encode(self.current_block).hex()

    def get_current_block_num(self):
        return self.current_block_number

    #
    # MetaMask Interface
    #
    def get_version(self):
        return "0x100"

    def get_balance(self, address, block):
        if block != "latest":
            raise Exception("only support block: latest")
        if not address:
            raise Exception("address required")

        output_amounts = defaultdict(int)
        output_nfts = []

        for block_number, block in self.blocks.items():
            for tx in block.transaction_set:
                # check if utxo belongs to the owner and is not spent
                if tx.newowner1 == utils.normalize_address(address) and tx.spent1 == False:
                    if tx.amount1 != 0:
                        output_amounts[utils.decode_addr(tx.contractaddress1)] += tx.amount1
                    if tx.tokenid1 != 0:
                        output_nfts.append((utils.decode_addr(tx.contractaddress1), tx.tokenid1))
                if tx.newowner2 == utils.normalize_address(address) and tx.spent2 == False:
                    if tx.amount2 != 0:
                        output_amounts[utils.decode_addr(tx.contractaddress2)] += tx.amount2
                    if tx.tokenid2 != 0:
                        output_nfts.append((utils.decode_addr(tx.contractaddress2), tx.tokenid2))
        res = {
            "FT": sorted(output_amounts.items()),
            "NFT": sorted(output_nfts),
        }
        print("balance: %s" % res)
        return res

    def get_block_by_num(self, block, deep):
        print("get_block_by_num with %s and %s" %(block, deep))
        try:
            rlp.encode(self.blocks[self.current_block_number-1]).hex()
        except KeyError:
            return {}
            
    def get_utxo(self, address, block):
        if block != "latest":
            raise Exception("only support block: latest")

        utxo = []
        for block_number, block in self.blocks.items():
            for tx_index, tx in enumerate(block.transaction_set):
                # check if utxo belongs to the owner and is not spent
                if tx.newowner1 == utils.normalize_address(address) and tx.spent1 == False and not (tx.amount1 == 0 and tx.tokenid1 == 0):
                    utxo.append([block_number, tx_index, 0, utils.decode_addr(tx.contractaddress1), tx.amount1, tx.tokenid1])
                if tx.newowner2 == utils.normalize_address(address) and tx.spent2 == False and not (tx.amount2 == 0 and tx.tokenid2 == 0):
                    utxo.append([block_number, tx_index, 1, utils.decode_addr(tx.contractaddress2), tx.amount2, tx.tokenid2])
        return utxo

    def get_all_transactions(self):
        res = []
        for block_number, block in self.blocks.items():
            for tx_index, tx in enumerate(block.transaction_set):
                res.append([block_number, tx_index, str(tx)])
        return res

    def eth_raw_transaction(self, raw_tx):
        # print(raw_tx[2:])
        return self.apply_transaction(raw_tx[2:])
