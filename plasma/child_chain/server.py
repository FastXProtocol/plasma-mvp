from werkzeug.wrappers import Request, Response
from werkzeug.serving import run_simple
from jsonrpc import JSONRPCResponseManager, dispatcher
from plasma.child_chain.child_chain import ChildChain
from plasma.child_chain.partially_signed_transaction_pool import PartiallySignedTransactionPool
from plasma.child_chain.block_auto_submitter import BlockAutoSubmitter
from plasma.config import plasma_config
from plasma.root_chain.deployer import Deployer

root_chain = Deployer().get_contract_at_address("RootChain", plasma_config['ROOT_CHAIN_CONTRACT_ADDRESS'], concise=False)
partially_signed_transaction_pool = PartiallySignedTransactionPool()
child_chain = ChildChain(plasma_config['AUTHORITY'], root_chain, partially_signed_transaction_pool=partially_signed_transaction_pool)
BlockAutoSubmitter(child_chain, plasma_config['BLOCK_AUTO_SUMBITTER_INTERVAL']).start_timer()


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
    dispatcher["apply_ps_transaction"] = lambda ps_transaction: partially_signed_transaction_pool.apply_ps_transaction(ps_transaction)
    dispatcher["get_all_ps_transactions"] = lambda: partially_signed_transaction_pool.get_all_ps_transactions()
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
    ssl_context = None
    if plasma_config["CHILD_CHAIN_SSL_CRT_PATH"] and plasma_config["CHILD_CHAIN_SSL_KEY_PATH"]:
        ssl_context = (plasma_config["CHILD_CHAIN_SSL_CRT_PATH"], plasma_config["CHILD_CHAIN_SSL_KEY_PATH"])
    run_simple(plasma_config["CHILD_CHAIN_HOST"], int(plasma_config["CHILD_CHAIN_PORT"]), application, ssl_context=ssl_context)
