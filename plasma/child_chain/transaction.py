from time import time as ttime
from random import randint

import rlp
from rlp.sedes import big_endian_int, binary
from ethereum import utils
from plasma.utils.utils import get_sender, sign


DEFAULT_FEE = 0
DEFAULT_DELAY_SECONDS = 3600


class Transaction(rlp.Serializable):

    fields = [
        ('blknum1', big_endian_int),
        ('txindex1', big_endian_int),
        ('oindex1', big_endian_int),
        ('blknum2', big_endian_int),
        ('txindex2', big_endian_int),
        ('oindex2', big_endian_int),
        ('newowner1', utils.address),
        ('contractaddress1', utils.address),
        ('amount1', big_endian_int),
        ('tokenid1', big_endian_int),
        ('newowner2', utils.address),
        ('contractaddress2', utils.address),
        ('amount2', big_endian_int),
        ('tokenid2', big_endian_int),
        
        ('fee', big_endian_int),
        
        ('expiretimestamp', big_endian_int),
        ('salt', big_endian_int),
        
        ('sig1', binary),
        ('sig2', binary),
    ]

    def __init__(self,
                 blknum1, txindex1, oindex1,
                 blknum2, txindex2, oindex2,
                 newowner1, contractaddress1, amount1, tokenid1,
                 newowner2, contractaddress2, amount2, tokenid2,
                 fee=DEFAULT_FEE, expiretimestamp=None, salt=None,
                 sig1=b'\x00' * 65,
                 sig2=b'\x00' * 65):
        if expiretimestamp is None:
            expiretimestamp = int(ttime()) + DEFAULT_DELAY_SECONDS
        if salt is None:
            salt = randint(1000000000000, 9999999999999)
        
        # Input 1
        self.blknum1 = blknum1
        self.txindex1 = txindex1
        self.oindex1 = oindex1
        self.sig1 = sig1

        # Input 2
        self.blknum2 = blknum2
        self.txindex2 = txindex2
        self.oindex2 = oindex2
        self.sig2 = sig2

        # Outputs
        self.newowner1 = utils.normalize_address(newowner1)
        self.contractaddress1 = utils.normalize_address(contractaddress1)
        self.amount1 = amount1
        self.tokenid1 = tokenid1

        self.newowner2 = utils.normalize_address(newowner2)
        self.contractaddress2 = utils.normalize_address(contractaddress2)
        self.amount2 = amount2
        self.tokenid2 = tokenid2
        
        self.fee = fee
        self.expiretimestamp = expiretimestamp
        self.salt = salt

        self.confirmation1 = None
        self.confirmation2 = None

        self.spent1 = False
        self.spent2 = False

    @property
    def hash0(self):
        return utils.sha3(rlp.encode(self, UnsignedTransaction0))

    @property
    def hash1(self):
        return utils.sha3(rlp.encode(self, UnsignedTransaction1))

    @property
    def hash2(self):
        return utils.sha3(rlp.encode(self, UnsignedTransaction2))

    @property
    def merkle_hash(self):
        return utils.sha3(self.hash0 + self.sig1 + self.sig2)

    def sign1(self, key):
        self.sig1 = sign(self.hash1, key)

    def sign2(self, key):
        self.sig2 = sign(self.hash2, key)

    @property
    def is_single_utxo(self):
        if self.blknum2 == 0:
            return True
        return False

    @property
    def sender1(self):
        return get_sender(self.hash1, self.sig1)

    @property
    def sender2(self):
        return get_sender(self.hash2, self.sig2)
    
    def to_json(self):
        res = {}
        for field_name, field_type in self.fields:
            field_value = getattr(self, field_name)
            if field_type == binary:
                field_value = field_value.hex()
            elif field_type == utils.address:
                field_value = utils.decode_addr(field_value)
            res[field_name] = field_value
        return res
    
    def __str__(self):
        res = []
        for field_name, field_type in UnsignedTransaction0.fields:
            if field_type == binary:
                continue
            field_value = getattr(self, field_name)
            if field_type == utils.address:
                field_value = utils.decode_addr(field_value)
            res.append("%s: %s" % (field_name, field_value))
        res.append("%s: %s" % ("spent1", self.spent1))
        res.append("%s: %s" % ("spent2", self.spent2))
        res = ", ".join(res)
        res = "Transaction< %s >" % res
        return res


UnsignedTransaction0 = Transaction.exclude(['sig1', 'sig2'])
UnsignedTransaction1 = Transaction.exclude(['sig1', 'sig2', 'blknum2', 'txindex2', 'oindex2', 'newowner2'])
UnsignedTransaction2 = Transaction.exclude(['sig1', 'sig2', 'blknum1', 'txindex1', 'oindex1', 'newowner1'])
