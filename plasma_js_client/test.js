import moment from 'moment';
import Client,{normalizeAddress} from "./client";
import erc721_abi from "../contract_data/ERC721Token.abi.json"

const rootChainAddress = "0xD9FA1cbB70b74f3Ef259CE0eb48029F02eE0FcD1";
const nftContract = "0x952CE607bD9ab82e920510b2375cbaD234d28c8F";

let options = {
    debug: true
};

if (process.env.ENV == "LOCAL") {
    options = {
        ...options,
        gethRpc: "http://localhost:8545",
        fastXRpc: "http://localhost:8546/jsonrpc",
        rootChainAddress: "0xa3b2a1804203b75b494028966c0f62e677447a39",
        defaultAccount: "0xfd02EcEE62797e75D86BCff1642EB0844afB28c7",
    }
} else {
    options = {
        ...options,
        gethRpc: "http://localhost:8545",
        fastXRpc: "http://dev2.msan.cn:8546/jsonrpc",
        rootChainAddress: "0xD9FA1cbB70b74f3Ef259CE0eb48029F02eE0FcD1",
        defaultAccount: "0xfc32e7c7c55391ebb4f91187c91418bf96860ca9",
    }
}

const fastx = new Client(options);

const ownerAddress = options.defaultAccount;
const receiverAddress = process.env.ENV == "LOCAL"? "0x4B3eC6c9dC67079E82152d6D55d8dd96a8e6AA26": "0xd103C64735B324161518F17CeF15D1E27e0b9F3E";

const logBalance = async (address) => {
    let res = (await fastx.getBalance(address)).data.result;
    console.log("\naddress: "+ (address || fastx.defaultAccount) );
    console.log("balance: ", res);
}


const getUTXOs = async (address) => {
    return (await fastx.getUTXO(address)).data.result;
};

const getPsTx = async () => {
    return (await fastx.getAllPsTransactions()).data.result;
}

const sleep = async (millisecond) => {
    await new Promise(resolve => setTimeout(resolve, millisecond));
}

const testTx = async () => {
    console.log("---------- testing transaction ----------");
    await fastx.deposit("0x0", 0, 100);
    await logBalance();

    await fastx.sendEth(receiverAddress, 150);

    await logBalance();
    await logBalance(receiverAddress);
};


const testPsTx = async () => {
    console.log("---------- testing partially signed transaction ----------");
    console.log("1. ps tranctions", await getPsTx());

    await fastx.sellToken("0x0", 0, 1);

    await logBalance();

    const psTransactions = await getPsTx();
    console.log("2. ps tranctions", psTransactions);
    
    const psTransaction = psTransactions[0];
    console.log(psTransaction);
    if (psTransaction) {
        await fastx.sendPsTransactionFill(psTransaction, 0, 0, 0, receiverAddress);
        console.log("3. ps tranctions", await getPsTx());
    
        await logBalance();
        await logBalance(receiverAddress);
    }

};

const depositNFT = async () => {

    let nft_contract = new fastx.web3.eth.Contract( erc721_abi, nftContract);
    const totalSupply = await nft_contract.methods.totalSupply().call();
    const tokenid = parseInt(totalSupply) + 10;
    console.log('tokenid: ', tokenid);

    console.log('Creating new token: '+tokenid);

    // Create a new token
    await nft_contract.methods.mint(ownerAddress, tokenid)
        .send({from: ownerAddress, gas: 2873385})
        .on('transactionHash', console.log);

    // Approve the token to be able to transfer to the FastX contract
    console.log('Approving transfering token # ', tokenid);
    await nft_contract.methods.approve(rootChainAddress, tokenid)
        .send({from: ownerAddress})
        .on('transactionHash', console.log);
    console.log( 'New owner address: ', await nft_contract.methods.ownerOf(tokenid).call() );

    // deposit to the FastX chain
    await fastx.deposit(nftContract, tokenid, 0);
    return {
        category: nftContract, 
        tokenId: tokenid
    };
};

const postNftAd = async(contract, tokenid, end, price, options={}) => {
    let from = options.from || fastx.defaultAccount;
    let categoryContract = normalizeAddress(contract).toString('hex');
    console.log('from: '+from + ', contract: '+categoryContract+', tokenid: '+tokenid);

    let utxos = (await fastx.getUTXO(from)).data.result;

    let utxo;
    for(let i in utxos){
        utxo = utxos[utxos.length - i - 1];
        const [_blknum, _txindex, _oindex, _contract, _balance, _tokenid] = utxo;
        if ( categoryContract == _contract && tokenid == _tokenid ) {
            console.log(_blknum, _txindex, _oindex, _contract, _balance, _tokenid);

            return fastx.sendPsTransaction(
                _blknum, _txindex, _oindex, 
                from, '0'.repeat(40), price, 0, // sell for the price in eth
                _contract, 0, _tokenid, // sell the token
                0, end
            );
        }
    }
}

const fillNftAd = async() => {

}

const getUTXO = async (search={}, options={}) => {
    let from = options.from || fastx.defaultAccount;
    if (search['category'])
        search['category'] = normalizeAddress(search['category']).toString('hex');

    let utxos = (await fastx.getUTXO(from)).data.result;
    let utxo, utxoObj={};
    for(let i in utxos){
        utxo = utxos[utxos.length - i - 1];
        const [_blknum, _txindex, _oindex, _contract, _balance, _tokenid] = utxo;
        utxoObj['category'] = _contract;
        utxoObj['tokenId'] = _tokenid;
        utxoObj['amount'] = _balance;

        let found = false;
        Object.keys(search).every( (key, i) => {
            // console.log(key);
            // console.log(search[key]);
            // console.log(utxoObj[key]);
            if (search[key] == utxoObj[key])
                return found = true;
            else
                return found = false;
        });
        if ( found ) {
            // console.log(_blknum, _txindex, _oindex, _contract, _balance, _tokenid);
            return utxo;
        }                
    }
}

const postAd = async() => {
    const nft_ad = await depositNFT();
    // const nft_ad = {category: nftContract, tokenId: 20};
    await logBalance();

    const end = moment().add(1, 'days').unix();
    const price = 1;

    console.log( 'Category: '+nft_ad.category+', Token Id: '+nft_ad.tokenId+', end: '+end+', price: '+price);

    await postNftAd(nft_ad.category, nft_ad.tokenId, end, price);
}

const bidAd = async () => {
    await logBalance();
    await logBalance(receiverAddress);

    let psTransactions = (await fastx.getAllPsTransactions()).data.result;

    console.log('\nPs Txns:\n');
    console.log(psTransactions);

    let fillTx = psTransactions[0];

    if (fillTx) {
        console.log('\nFilling tx ...\n');
        console.log(fillTx);
        
        let utxo = await getUTXO({
                category: fillTx.contractaddress1, 
                tokenId: fillTx.tokenid1, 
                amount: fillTx.amount1
            }, { from: receiverAddress });
        console.log('\nUTXO',utxo);
        const [_blknum, _txindex, _oindex, _contract, _balance, _tokenid] = utxo;
        await fastx.sendPsTransactionFill(fillTx, _blknum, _txindex, _oindex, receiverAddress);
        
        console.log('\nPs Txns:\n');
        console.log((await fastx.getAllPsTransactions()).data.result);

        await logBalance();
        await logBalance(receiverAddress);
    }
}

const main = async () => {

    try {
        // await testTx();
        // await testPsTx();

        // await postAd();
        await bidAd();

    } catch(e) {
        console.log(e);
        process.exit();
    }

    process.exit();
};

main();