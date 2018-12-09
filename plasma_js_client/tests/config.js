import Client from "../client";
import erc721Abi from "../../contract_data/ERC721Token.abi.json";
import erc20Abi from "../../contract_data/ERC20.abi.json";


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
        gethRpc: "http://localhost:8545",
        fastXRpc: "http://fastx-rinkeby.msan.cn/jsonrpc",
        rootChainAddress: "0xffc5DE2513F5F256dB660CDd566D6C54fBa90405",
        defaultAccount: "0xd103C64735B324161518F17CeF15D1E27e0b9F3E",
    }
}

const fastx = new Client(options);

export const ownerAddress = options.defaultAccount;
export const receiverAddress = process.env.ENV == "LOCAL"? "0x4B3eC6c9dC67079E82152d6D55d8dd96a8e6AA26": "0xe4261dfe12b258687c0a274f823b8c96899c7e21";

export const erc20ContractAddress = process.env.ENV == "LOCAL"? "0x395B650707cAA0d300615bBa2901398DFf64CF7c": "0x395B650707cAA0d300615bBa2901398DFf64CF7c";
export const erc721ContractAddress = process.env.ENV == "LOCAL"? "0xd641205E8F36A858c5867945782C917E3F63d1e8": "0x952CE607bD9ab82e920510b2375cbaD234d28c8F";
export const erc20ContractAddress2 = "0x15AB8DFbb99D72423eb618591836689a5E87dC7a";

export const erc20Contract = new fastx.web3.eth.Contract(erc20Abi, erc20ContractAddress);
export const erc721Contract = new fastx.web3.eth.Contract(erc721Abi, erc721ContractAddress);
export const erc20Contract2 = new fastx.web3.eth.Contract(erc20Abi, erc20ContractAddress2);

export const addressFromKey = fastx.web3.eth.accounts.privateKeyToAccount(process.env.AUTHORITY_KEY).address;
if (addressFromKey.toLowerCase() != ownerAddress.toLowerCase()) {
    console.warn('Your priv key does not match with the address. ' + addressFromKey + ' != ' + ownerAddress);
}

export default fastx;