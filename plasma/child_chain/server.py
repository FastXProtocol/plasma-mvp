from werkzeug.wrappers import Request, Response
from werkzeug.serving import run_simple
from jsonrpc import JSONRPCResponseManager, dispatcher
from plasma.child_chain.child_chain import ChildChain
from plasma.config import plasma_config
from plasma.root_chain.deployer import Deployer

root_chain = Deployer().get_contract_at_address("RootChain", plasma_config['ROOT_CHAIN_CONTRACT_ADDRESS'], concise=False)
child_chain = ChildChain(plasma_config['AUTHORITY'], root_chain)


@Request.application
def application(request):
    # Dispatcher is dictionary {<method_name>: callable}
    dispatcher["submit_block"] = lambda block: child_chain.submit_block(block)
    dispatcher["apply_transaction"] = lambda transaction: child_chain.apply_transaction(transaction)
    dispatcher["get_transaction"] = lambda blknum, txindex: child_chain.get_transaction(blknum, txindex)
    dispatcher["get_current_block"] = lambda: child_chain.get_current_block()
    dispatcher["get_current_block_num"] = lambda: child_chain.get_current_block_num()
    dispatcher["get_block"] = lambda blknum: child_chain.get_block(blknum)
    dispatcher["get_balance"] = lambda address, block: child_chain.get_balance(address, block)
    dispatcher["get_utxo"] = lambda address, block: child_chain.get_utxo(address, block)
    dispatcher["get_all_transactions"] = lambda: child_chain.get_all_transactions()
    # MetaMask interface
    dispatcher["eth_getBalance"] = lambda address, block: child_chain.get_balance(address, block)
    dispatcher["eth_getBlockByNumber"] = lambda block, deep: child_chain.get_block_by_num(block, deep)
    dispatcher["net_version"] = lambda: child_chain.get_version()
    dispatcher["eth_sendRawTransaction"] = lambda raw_tx: child_chain.eth_raw_transaction(raw_tx)

    response = JSONRPCResponseManager.handle(
        request.data, dispatcher)
    resp = Response(response.json, mimetype="application/json")
    resp.headers["Access-Control-Allow-Origin"] = '*'
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type,Content-Length, Authorization, Accept,X-Requested-With"
    resp.headers["Access-Control-Allow-Methods"] = "PUT,POST,GET,DELETE,OPTIONS"
    return resp


if __name__ == '__main__':
    run_simple('0.0.0.0', 8546, application)
