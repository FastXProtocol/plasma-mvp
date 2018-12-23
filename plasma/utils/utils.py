from time import sleep
from datetime import datetime, timedelta

from ethereum import utils as u
from plasma.config import plasma_config
from plasma.utils.merkle.fixed_merkle import FixedMerkle


def get_empty_merkle_tree_hash(depth):
    zeroes_hash = b'\x00' * 32
    for i in range(depth):
        zeroes_hash = u.sha3(zeroes_hash + zeroes_hash)
    return zeroes_hash


def get_merkle_of_leaves(depth, leaves):
    return FixedMerkle(depth, leaves)


def bytes_fill_left(inp, length):
    return bytes(length - len(inp)) + inp


ZEROS_BYTES = [b'\x00' * 32]


def confirm_tx(tx, root, key):
    return sign(u.sha3(tx.hash + root), key)


def get_deposit_hash(owner, value):
    return u.sha3(owner + b'\x00' * 31 + u.int_to_bytes(value))


def sign(hash, key):
    vrs = u.ecsign(hash, key)
    rsv = vrs[1:] + vrs[:1]
    vrs_bytes = [u.encode_int32(i) for i in rsv[:2]] + [u.int_to_bytes(rsv[2])]
    return b''.join(vrs_bytes)


def get_sender(hash, sig):
    v = sig[64]
    if v < 27:
        v += 27
    r = u.bytes_to_int(sig[:32])
    s = u.bytes_to_int(sig[32:64])
    pub = u.ecrecover_to_pub(hash, v, r, s)
    return u.sha3(pub)[-20:]


def send_transaction(w3, constructor, options=None, private_key=None):
    if private_key is None:
        private_key = plasma_config["AUTHORITY_KEY"]
    if options is None:
        options = {}
    acct = w3.eth.account.privateKeyToAccount(private_key)
    new_options = {
        'from': acct.address,
        'nonce': w3.eth.getTransactionCount(acct.address)}
    new_options.update(options)
    construct_txn = constructor.buildTransaction(new_options)
    signed = acct.signTransaction(construct_txn)
    tx_hash = w3.eth.sendRawTransaction(signed.rawTransaction)
    return tx_hash


def get_tx_receipt_sync(w3, tx_hash, interval=1, timeout=60*10):
    tx_receipt = None
    start = datetime.now()
    print("Getting tx receipt: 0x%s" % tx_hash.hex())
    while True:
        print("Trying getting tx receipt: 0x%s" % tx_hash.hex())
        tx_receipt = w3.eth.getTransactionReceipt(tx_hash)
        if tx_receipt:
            break
        if datetime.now() - start >= timedelta(seconds=timeout):
            break
        sleep(interval)
    return tx_receipt


def send_transaction_sync(w3, constructor, options=None, private_key=None):
    tx_hash = send_transaction(w3, constructor, options=options, private_key=private_key)
    return get_tx_receipt_sync(w3, tx_hash)