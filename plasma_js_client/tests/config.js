import Client from "../client";
import erc721Abi from "../../contract_data/ERC721Token.abi.json"


export let options = {
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
        gethRpc: "http://192.168.1.100:8545",
        fastXRpc: "http://dev2.msan.cn:8546/jsonrpc",
        rootChainAddress: "0xC47e711ac6A3D16Db0826c404d8C5d8bDC01d7b1",
        defaultAccount: "0xfc32e7c7c55391ebb4f91187c91418bf96860ca9",
    }
}

const fastx = new Client(options);

export const ownerAddress = options.defaultAccount;
export const receiverAddress = process.env.ENV == "LOCAL"? "0x4B3eC6c9dC67079E82152d6D55d8dd96a8e6AA26": "0xe4261dfe12b258687c0a274f823b8c96899c7e21";

export const erc20ContractAddress = process.env.ENV == "LOCAL"? "0x395B650707cAA0d300615bBa2901398DFf64CF7c": "0x395B650707cAA0d300615bBa2901398DFf64CF7c";
export const erc721ContractAddress = process.env.ENV == "LOCAL"? "0xd641205E8F36A858c5867945782C917E3F63d1e8": "0x952CE607bD9ab82e920510b2375cbaD234d28c8F";

export const erc721Contract = new fastx.web3.eth.Contract(erc721Abi, erc721ContractAddress);

export const addressFromKey = fastx.web3.eth.accounts.privateKeyToAccount(process.env.AUTHORITY_KEY).address;
if (addressFromKey.toLowerCase() != ownerAddress.toLowerCase()) {
    console.warn('Your priv key does not match with the address. ' + addressFromKey + ' != ' + ownerAddress);
}

export default fastx;