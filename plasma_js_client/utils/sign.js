import Account from "eth-lib/lib/account";


export default (msg) => {
    return new Promise((resolve, reject) => resolve(Account.sign(msg, process.env.AUTHORITY_KEY)));
}