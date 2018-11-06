import json

import rlp
from ethereum import utils

from plasma.config import plasma_config
from plasma.root_chain.deployer import Deployer
from plasma.child_chain.transaction import Transaction


EXCHANGE_RATE = {
    ("0x0", "0x395B650707cAA0d300615bBa2901398DFf64CF7c"): 10,
}
CONTRACT_DATA_DIR = 'contract_data'


class LiquidilyProvider(object):
    def __init__(self, child_chain, CONTRACT_DATA_DIR=CONTRACT_DATA_DIR):
        self.CONTRACT_DATA_DIR = CONTRACT_DATA_DIR
        self.child_chain = child_chain
        self.root_chain = self.child_chain.root_chain
        self.root_address = self.root_chain.address
        self.authority = self.child_chain.authority
        self.address = "0x" + self.authority.hex()
        self.to_contractaddresses = set([to_contractaddress for _, to_contractaddress in EXCHANGE_RATE])
        self.contract_instances = {}
        for contractaddress in self.to_contractaddresses:
            self.contract_instances[contractaddress] = Deployer().get_contract_at_address("ERC20", contractaddress, concise=False)

        if not self.get_balance():
            for contractaddress in self.to_contractaddresses:
                contract_instance = self.contract_instances[contractaddress]
                amount = int(100000000 * (10 ** 18) / 100)
                contract_instance.transact({'from': self.address}).approve(self.root_address, amount)
                self.root_chain.transact({'from': self.address}).deposit(contractaddress, amount, 0)

    def get_balance(self):
        return self.child_chain.get_balance(self.address, "latest")["FT"]
    
    def get_utxos(self):
        return self.child_chain.get_utxo(self.address, "latest")

    def create_utxo(self, to_contractaddress, provide_amount):
        utxos = self.get_utxos()
        for blknum, txindex, oindex, contractaddress, amount, tokenid in utxos:
            if contractaddress.lower() == to_contractaddress[2:].lower():
                if amount == provide_amount:
                    return blknum, txindex, oindex, contractaddress, amount, tokenid

        for blknum, txindex, oindex, contractaddress, amount, tokenid in utxos:
            if contractaddress.lower() == to_contractaddress[2:].lower():
                if amount > provide_amount:
                    tx = Transaction(blknum, txindex, oindex,
                                    0, 0, 0,
                                    utils.normalize_address(self.address), utils.normalize_address(contractaddress), provide_amount, 0,
                                    utils.normalize_address(self.address), utils.normalize_address(contractaddress), amount - provide_amount, 0)
                    tx.sign1(utils.normalize_key(plasma_config["AUTHORITY_KEY"]))
                    tx.sign2(utils.normalize_key(plasma_config["AUTHORITY_KEY"]))
                    self.child_chain.apply_transaction(rlp.encode(tx, Transaction).hex())
                    break
        else:
            raise ValueError("no available utxo")
        utxos = self.get_utxos()
        for blknum, txindex, oindex, contractaddress, amount, tokenid in utxos:
            if contractaddress.lower() == to_contractaddress[2:].lower():
                if amount == provide_amount:
                    return blknum, txindex, oindex, contractaddress, amount, tokenid
        raise Exception("Something went wrong")

    def get_exchange_rate(self, from_contractaddress, to_contractaddress, amount):
        rate = EXCHANGE_RATE.get((from_contractaddress, to_contractaddress), None)
        return rate
    
    def create_partially_signed_transaction(self, from_contractaddress, to_contractaddress, amount):
        exchange_rate = self.get_exchange_rate(from_contractaddress, to_contractaddress, amount)
        if exchange_rate is None:
            return None
        provide_amount = amount * exchange_rate
        blknum1, txindex1, oindex1, contractaddress2, amount2, tokenid2 = self.create_utxo(to_contractaddress, provide_amount)
        
        ps_tx = Transaction(blknum1, txindex1, oindex1, 0, 0, 0,
                            utils.normalize_address(self.address), b'\x00' * 20 if from_contractaddress == "0x0" else from_contractaddress, amount, 0,
                            b'\x00' * 20, contractaddress2, amount2, tokenid2)
        ps_tx.sign1(utils.normalize_key(plasma_config["AUTHORITY_KEY"]))
        return ps_tx.to_json()