from collections import defaultdict

import rlp
from ethereum import utils

from .block import Block
from .exceptions import (InvalidBlockMerkleException,
                         InvalidBlockSignatureException,
                         InvalidTxSignatureException, TxAlreadySpentException,
                         TxAmountMismatchException, InvalidTxOutputsException)
from .transaction import Transaction


class ChildChain(object):

    def __init__(self, authority, root_chain):
        self.root_chain = root_chain
        self.authority = authority
        self.blocks = {}
        self.current_block_number = 1
        self.current_block = Block()
        self.pending_transactions = []

        # Register for deposit event listener
        deposit_filter = self.root_chain.on('Deposit')
        deposit_filter.watch(self.apply_deposit)

    def apply_deposit(self, event):
        newowner1 = event['args']['depositor']
        contractaddress1 = event['args']['contractAddress']
        amount1 = event['args']['amount']
        tokenid1 = event['args']['tokenId']
        blknum1 = event['args']['depositBlock']
        deposit_tx = Transaction(blknum1, 0, 0, 0, 0, 0,
                                 newowner1, contractaddress1, amount1, tokenid1,
                                 b'\x00' * 20, 0, 0, 0)
        deposit_block = Block([deposit_tx])
        # Add block validation
        self.blocks[self.current_block_number] = deposit_block
        self.current_block_number += 1

    def apply_transaction(self, transaction):
        tx = rlp.decode(utils.decode_hex(transaction), Transaction)

        # Validate the transaction
        self.validate_tx(tx)

        # Mark the inputs as spent
        self.mark_utxo_spent(tx.blknum1, tx.txindex1, tx.oindex1)
        self.mark_utxo_spent(tx.blknum2, tx.txindex2, tx.oindex2)

        self.current_block.transaction_set.append(tx)

    def validate_outputs(self, contractaddress, amount, tokenid):
        if contractaddress == utils.normalize_address(0) and \
            amount == 0 and \
            tokenid == 0:
            return True

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
        self.validate_outputs(tx.contractaddress1, tx.amount1, tx.tokenid1)
        self.validate_outputs(tx.contractaddress2, tx.amount2, tx.tokenid2)
        
        if tx.tokenid1 != 0 and \
            tx.tokenid2 != 0 and \
            tx.tokenid1 == tx.tokenid2 and \
            tx.contractaddress1 == tx.contractaddress2:
            raise InvalidTxOutputsException('failed to validate tx')
        
        output_amounts = defaultdict(int)
        output_amounts[tx.contractaddress1] += tx.amount1
        output_amounts[tx.contractaddress2] += tx.amount2
        
        output_nfts = []
        if tx.tokenid1 != 0:
            output_nfts.append((tx.contractaddress1, tx.tokenid1))
        if tx.tokenid2 != 0:
            output_nfts.append((tx.contractaddress2, tx.tokenid2))
        
        inputs = [(tx.blknum1, tx.txindex1, tx.oindex1), (tx.blknum2, tx.txindex2, tx.oindex2)]

        input_amounts = defaultdict(int)
        input_nfts = []

        for (blknum, txindex, oindex) in inputs:
            # Assume empty inputs and are valid
            if blknum == 0:
                continue

            transaction = self.blocks[blknum].transaction_set[txindex]

            if oindex == 0:
                valid_signature = tx.sig1 != b'\x00' * 65 and transaction.newowner1 == tx.sender1
                spent = transaction.spent1
                input_amounts[transaction.contractaddress1] += transaction.amount1
                if transaction.tokenid1 != 0:
                    input_nfts.append((transaction.contractaddress1, transaction.tokenid1))
            else:
                valid_signature = tx.sig2 != b'\x00' * 65 and transaction.newowner2 == tx.sender2
                spent = transaction.spent2
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

    def submit_block(self, block):
        block = rlp.decode(utils.decode_hex(block), Block)
        if block.merkilize_transaction_set != self.current_block.merkilize_transaction_set:
            raise InvalidBlockMerkleException('input block merkle mismatch with the current block')

        valid_signature = block.sig != b'\x00' * 65 and block.sender == self.authority
        if not valid_signature:
            raise InvalidBlockSignatureException('failed to submit block')

        self.root_chain.transact({'from': '0x' + self.authority.hex()}).submitBlock(block.merkle.root)
        # TODO: iterate through block and validate transactions
        self.blocks[self.current_block_number] = self.current_block
        self.current_block_number += 1
        self.current_block = Block()

    def get_transaction(self, blknum, txindex):
        return rlp.encode(self.blocks[blknum].transaction_set[txindex]).hex()

    def get_block(self, blknum):
        return rlp.encode(self.blocks[blknum]).hex()

    def get_current_block(self):
        return rlp.encode(self.current_block).hex()

    def get_current_block_num(self):
        return self.current_block_number
