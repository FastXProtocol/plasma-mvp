import os
import pickle
from time import time as ttime

import rlp
from ethereum import utils

from plasma.config import plasma_config
from .child_chain import PICKLE_DIR
from .transaction import Transaction
from .exceptions import PsTxAlreadyExistsException, PsTxExpiredException


class PartiallySignedTransactionPool(object):
    def __init__(self, load=True):
        self.ps_transactions = []
        
        if load:
            self.load()

    @property
    def save_field_names(self):
        return ["ps_transactions"]
    
    def save(self):
        print('saving ps transaction pool...')
        if not os.path.exists(PICKLE_DIR):
            os.mkdir(PICKLE_DIR)
        for field_name in self.save_field_names:
            print('saving %s...' % field_name)
            with open(os.path.join(PICKLE_DIR, field_name + ".pickle"), "wb") as f:
                pickle.dump(getattr(self, field_name), f, pickle.HIGHEST_PROTOCOL)
        print('ps transaction pool saved')
    
    def load(self):
        if os.path.exists(PICKLE_DIR):
            for field_name in self.save_field_names:
                print('loading %s...' % field_name)
                try:
                    with open(os.path.join(PICKLE_DIR, field_name + ".pickle"), 'rb') as f:
                        setattr(self, field_name, pickle.load(f))
                except Exception as e:
                    print("load %s failed: %s" % (field_name, str(e)))
        self.clear_expired_ps_transactions()
    
    def is_ps_transaction_expired(self, ps_transaction):
        return int(ttime()) + plasma_config["PSTX_EXPIRE_BUFFER_SECONDS"] > ps_transaction.expiretimestamp
    
    def clear_expired_ps_transactions(self):
        self.ps_transactions = list(filter(lambda x: not self.is_ps_transaction_expired(x), self.ps_transactions))
    
    def validate_ps_tx(self, ps_transaction):
        if self.is_ps_transaction_expired(ps_transaction):
            raise PsTxExpiredException('failed to validate ps tx')
        for tx in self.ps_transactions:
            if self.is_same_transaction(tx, ps_transaction):
                raise PsTxAlreadyExistsException('failed to validate ps tx')
    
    def apply_ps_transaction(self, ps_transaction):
        self.clear_expired_ps_transactions()
        ps_tx = rlp.decode(utils.decode_hex(ps_transaction), Transaction)
        
        self.validate_ps_tx(ps_tx)
        
        self.ps_transactions.append(ps_tx)
        
        self.save()
        return ps_tx.hash0.hex()
    
    def is_same_transaction(self, transaction1, transaction2):
        return transaction1.hash1 == transaction2.hash1 or transaction1.hash2 == transaction2.hash2
    
    def utxo_spent(self, blknum, txindex, oindex):
        self.clear_expired_ps_transactions()
        self.ps_transactions = list(filter(
            lambda x: not (
                (x.blknum1 == blknum and x.txindex1 == txindex and x.oindex1 == oindex) or \
                (x.blknum2 == blknum and x.txindex2 == txindex and x.oindex2 == oindex)
            ), self.ps_transactions
        ))
        
        self.save()
    
    def remove_ps_transaction(self, transaction):
        self.clear_expired_ps_transactions()
        self.ps_transactions = list(filter(lambda x: not self.is_same_transaction(transaction, x), self.ps_transactions))
        
        self.save()

    def get_all_ps_transactions(self):
        self.clear_expired_ps_transactions()
        res = [ps_tx.to_json() for ps_tx in self.ps_transactions]
        return res