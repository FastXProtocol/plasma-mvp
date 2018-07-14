import fastx, {erc721Contract, ownerAddress} from "./config";


const testCreateNft = async() => {
    const totalSupply = await erc721Contract.methods.totalSupply().call();
    const tokenid = parseInt(totalSupply) + 10;

    console.log('Creating new token: '+tokenid);

    // Create a new token
    await erc721Contract.methods.mint(ownerAddress, tokenid)
        .send({from: ownerAddress, gas: 300000})
        .on('transactionHash', console.log);
};


export default testCreateNft;


if (typeof require != 'undefined' && require.main == module) {
    testCreateNft();
}