import click
import rlp
from ethereum import utils
from plasma.utils.utils import confirm_tx
from plasma.client.client import Client
from plasma.child_chain.block import Block
from plasma.child_chain.transaction import Transaction


CONTEXT_SETTINGS = dict(
    help_option_names=['-h', '--help']
)
NULL_ADDRESS = b'\x00' * 20


@click.group(context_settings=CONTEXT_SETTINGS)
@click.pass_context
def cli(ctx):
    ctx.obj = Client()


@cli.command()
@click.argument('contractaddress', required=True)
@click.argument('amount', required=True, type=int)
@click.argument('tokenid', required=True, type=int)
@click.argument('address', required=True)
@click.pass_obj
def deposit(client, contractaddress, amount, tokenid, address):
    if contractaddress == "0x0":
        contractaddress = NULL_ADDRESS
    client.deposit(contractaddress, amount, tokenid, address)
    print("Deposited {0} {1} #{2} to {3}".format(contractaddress, amount, tokenid, address))


@cli.command()
@click.argument('blknum1', type=int)
@click.argument('txindex1', type=int)
@click.argument('oindex1', type=int)
@click.argument('blknum2', type=int)
@click.argument('txindex2', type=int)
@click.argument('oindex2', type=int)
@click.argument('newowner1')
@click.argument('contractaddress1')
@click.argument('amount1', type=int)
@click.argument('tokenid1', type=int)
@click.argument('newowner2')
@click.argument('contractaddress2')
@click.argument('amount2', type=int)
@click.argument('tokenid2', type=int)
@click.argument('key1')
@click.argument('key2', required=False)
@click.pass_obj
def sendtx(client,
           blknum1, txindex1, oindex1,
           blknum2, txindex2, oindex2,
           newowner1, contractaddress1, amount1, tokenid1,
           newowner2, contractaddress2, amount2, tokenid2,
           key1, key2):
    if newowner1 == "0x0":
        newowner1 = NULL_ADDRESS
    if newowner2 == "0x0":
        newowner2 = NULL_ADDRESS
    if contractaddress1 == "0x0":
        contractaddress1 = NULL_ADDRESS
    if contractaddress2 == "0x0":
        contractaddress2 = NULL_ADDRESS

    # Form a transaction
    tx = Transaction(blknum1, txindex1, oindex1,
                     blknum2, txindex2, oindex2,
                     utils.normalize_address(newowner1), utils.normalize_address(contractaddress1), amount1, tokenid1,
                     utils.normalize_address(newowner2), utils.normalize_address(contractaddress2), amount2, tokenid2)

    # Sign it
    if key1:
        tx.sign1(utils.normalize_key(key1))
    if key2:
        tx.sign2(utils.normalize_key(key2))

    client.apply_transaction(tx)
    print("Sent transaction")


@cli.command()
@click.argument('key', required=True)
@click.pass_obj
def submitblock(client, key):
    # Get the current block and decode it
    encoded_block = client.get_current_block()
    block = rlp.decode(utils.decode_hex(encoded_block), Block)

    # Sign the block
    block.make_mutable()
    normalized_key = utils.normalize_key(key)
    block.sign(normalized_key)

    client.submit_block(block)
    print("Submitted current block")


@cli.command()
@click.argument('blknum', required=True, type=int)
@click.argument('txindex', required=True, type=int)
@click.argument('oindex', required=True, type=int)
@click.argument('key1')
@click.argument('key2', required=False)
@click.pass_obj
def withdraw(client,
             blknum, txindex, oindex,
             key1, key2):
    # Get the transaction's block and decode it
    encoded_block = client.get_block(blknum)
    block = rlp.decode(utils.decode_hex(encoded_block), Block)

    # Create a Merkle proof
    tx = block.transaction_set[txindex]
    block.merklize_transaction_set()
    proof = block.merkle.create_membership_proof(tx.merkle_hash)

    # Create the confirmation signatures
    confirmSig1, confirmSig2 = b'', b''
    if key1:
        confirmSig1 = confirm_tx(tx, block.merkle.root, utils.normalize_key(key1))
    if key2:
        confirmSig2 = confirm_tx(tx, block.merkle.root, utils.normalize_key(key2))
    sigs = tx.sig1 + tx.sig2 + confirmSig1 + confirmSig2

    client.withdraw(blknum, txindex, oindex, tx, proof, sigs)
    print('Submitted withdrawal')


@cli.command()
@click.argument('owner', required=True)
@click.argument('blknum', required=True, type=int)
@click.argument('amount', required=True, type=int)
@click.pass_obj
def withdrawdeposit(client, owner, blknum, amount):
    deposit_pos = blknum * 1000000000
    client.withdraw_deposit(owner, deposit_pos, amount)
    print('Submitted withdrawal')

@cli.command()
@click.argument('address', required=True)
@click.pass_obj
def balance(client, address):
    balance = client.get_balance(address, 'latest')
    print("%s balance: %d" % (address, balance))

@cli.command()
@click.argument('address', required=True)
@click.argument('block', required=True)
@click.pass_obj
def balance(client, address, block):
    balance = client.get_balance(address, block)
    print(balance)


@cli.command()
@click.argument('address', required=True)
@click.argument('block', required=True)
@click.pass_obj
def utxo(client, address, block):
    utxo = client.get_utxo(address, block)
    print(utxo)


@cli.command()
@click.pass_obj
def all_transactions(client):
    all_transactions = client.get_all_transactions()
    for line in all_transactions:
        print(line)


if __name__ == '__main__':
    cli()
