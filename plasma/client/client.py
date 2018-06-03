import rlp
from ethereum import utils
from web3 import HTTPProvider
from plasma.child_chain.block import Block
from plasma.config import plasma_config
from plasma.root_chain.deployer import Deployer
from plasma.child_chain.transaction import Transaction, UnsignedTransaction1, UnsignedTransaction2
from .child_chain_service import ChildChainService


class Client(object):

    def __init__(self, root_chain_provider=HTTPProvider(plasma_config['NETWORK']), child_chain_url="http://localhost:8546/jsonrpc"):
        deployer = Deployer(root_chain_provider)
        self.root_chain = deployer.get_contract_at_address("RootChain", plasma_config['ROOT_CHAIN_CONTRACT_ADDRESS'], concise=True)
        self.child_chain = ChildChainService(child_chain_url)

    def create_transaction(self, blknum1=0, txindex1=0, oindex1=0,
                           blknum2=0, txindex2=0, oindex2=0,
                           newowner1=b'\x00' * 20, contractaddress1=b'\x00' * 20, amount1=0, tokenid1=0,
                           newowner2=b'\x00' * 20, contractaddress2=b'\x00' * 20, amount2=0, tokenid2=0):
        return Transaction(blknum1, txindex1, oindex1,
                           blknum2, txindex2, oindex2,
                           newowner1, contractaddress1, amount1, tokenid1,
                           newowner2, contractaddress2, amount2, tokenid2)

    def sign_transaction(self, transaction, key1=b'', key2=b''):
        if key1:
            transaction.sign1(key1)
        if key2:
            transaction.sign1(key2)
        return transaction

    def deposit(self, contractAddress, amount, tokenId, owner):
        self.root_chain.deposit(contractAddress, amount, tokenId, transact={'from': owner, 'value': amount})

    def apply_transaction(self, transaction):
        self.child_chain.apply_transaction(transaction)

    def submit_block(self, block):
        self.child_chain.submit_block(block)

    def withdraw(self, blknum, txindex, oindex, tx, proof, sigs):
        utxo_pos = blknum * 1000000000 + txindex * 10000 + oindex * 1
        self.root_chain.startExit(
            utxo_pos,
            rlp.encode(tx, UnsignedTransaction2 if oindex == 0 else UnsignedTransaction1),
            proof,
            sigs,
            transact={'from': '0x' + tx.newowner1.hex()}
        )

    def withdraw_deposit(self, owner, deposit_pos, amount):
        self.root_chain.startDepositExit(deposit_pos, amount, transact={'from': owner})

    def get_transaction(self, blknum, txindex):
        encoded_transaction = self.child_chain.get_transaction(blknum, txindex)
        return rlp.decode(utils.decode_hex(encoded_transaction), Transaction)

    def get_current_block(self):
        encoded_block = self.child_chain.get_current_block()
        return rlp.decode(utils.decode_hex(encoded_block), Block)

    def get_block(self, blknum):
        encoded_block = self.child_chain.get_block(blknum)
        return rlp.decode(utils.decode_hex(encoded_block), Block)

    def get_current_block_num(self):
        return self.child_chain.get_current_block_num()

    def get_balance(self, address, block):
        return self.child_chain.get_balance(address, block)

    def get_utxo(self, address, block):
        return self.child_chain.get_utxo(address, block)

    def get_all_transactions(self):
        return self.child_chain.get_all_transactions()