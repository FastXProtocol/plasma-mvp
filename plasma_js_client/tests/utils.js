import fastx, {erc721Contract, erc721ContractAddress, ownerAddress} from "./config";
import normalizeAddress from "../utils/normalizeAddress";


export const sleep = async (millisecond) => {
    await new Promise(resolve => setTimeout(resolve, millisecond));
};


export const logBalance = async (address) => {
    let res = (await fastx.getBalance(address)).data.result;
    console.log("\naddress: "+ (address || fastx.defaultAccount) );
    console.log("balance: ", res);
};


export const getUTXOs = async (address) => {
    return (await fastx.getAllUTXO(address)).data.result;
};


export const getPsTx = async () => {
    return (await fastx.getAllPsTransactions()).data.result;
};


export const approveDeposit = async (contractAddress, amount, tokenId) => {
    await logBalance();
    await fastx.approve(contractAddress, amount, tokenId);
    await fastx.deposit(contractAddress, amount, tokenId);
    await sleep(1000);
    await logBalance();
};


export const depositNFT = async () => {
    const totalSupply = await erc721Contract.methods.totalSupply().call();
    const tokenid = parseInt(totalSupply) + 10;

    console.log('Creating new token: '+tokenid);

    // Create a new token
    await erc721Contract.methods.mint(ownerAddress, tokenid)
        .send({from: ownerAddress, gas: 3873385})
        .on('transactionHash', console.log);

    // Approve the token to be able to transfer to the FastX contract
    await approveDeposit(erc721ContractAddress, 0, tokenid);
    return {
        category: erc721ContractAddress, 
        tokenId: tokenid
    };
};


export const postNftAd = async(contract, tokenid, end, price, options={}) => {
    let from = options.from || fastx.defaultAccount;
    let categoryContract = normalizeAddress(contract).toString('hex');
    console.log('\nCreate PS TX from: '+from + ', contract: '+categoryContract+', tokenid: '+tokenid);

    let utxo = await fastx.searchUTXO({
        category: categoryContract, 
        tokenId: tokenid,
    }, { from: from });
    console.log('\nUTXO',utxo);
    if (utxo.length == 0)
        throw Error('\nUTXO not found');

    const [_blknum, _txindex, _oindex, _contract, _balance, _tokenid] = utxo;

    return fastx.sendPsTransaction(
        _blknum, _txindex, _oindex, 
        from, '0'.repeat(40), price, 0, // sell for the price in eth
        _contract, 0, _tokenid, // sell the token
        0, end, null, from
    );
};