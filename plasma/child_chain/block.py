import rlp
from rlp.sedes import binary, CountableList
from ethereum import utils
from plasma.utils.merkle.fixed_merkle import FixedMerkle
from plasma.utils.utils import sign, get_sender
from plasma.child_chain.transaction import Transaction


EXPIRE_BUFFER_SECONDS = 600


class Block(rlp.Serializable):

    fields = [
        ('transaction_set', CountableList(Transaction)),
        ('sig', binary),
    ]

    def __init__(self, transaction_set=[], sig=b'\x00' * 65):
        self.transaction_set = transaction_set
        self.sig = sig
        self.merkle = None

    @property
    def hash(self):
        return utils.sha3(rlp.encode(self, UnsignedBlock))

    def sign(self, key):
        self.sig = sign(self.hash, key)

    @property
    def sender(self):
        return get_sender(self.hash, self.sig)
    
    @property
    def min_expire_timestamp(self):
        if len(self.transaction_set) == 0:
            return 0
        return min(*[tx.expiretimestamp for tx in self.transaction_set])
    
    def remove_expired_transactions(self, target_timestamp):
        if self.min_expire_timestamp > target_timestamp:
            return
        res = []
        for transaction in self.transaction_set:
            pass

    def merklize_transaction_set(self):
        hashed_transaction_set = [transaction.merkle_hash for transaction in self.transaction_set]
        self.merkle = FixedMerkle(16, hashed_transaction_set, hashed=True)
        return self.merkle.root
    
    def __str__(self):
        res = []
        res.append("%s: %s" % ("transaction_set", "[ %s ]" % ", ".join([str(tx) for tx in self.transaction_set])))
        res = ", ".join(res)
        res = "Block< %s >" % res
        return res


UnsignedBlock = Block.exclude(['sig'])
