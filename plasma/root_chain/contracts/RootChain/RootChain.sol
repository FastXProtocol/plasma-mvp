pragma solidity 0.4.18;

import 'SafeMath.sol';
import 'Math.sol';
import 'PlasmaRLP.sol';
import 'Merkle.sol';
import 'Validate.sol';
import 'PriorityQueue.sol';
import 'ERC20.sol';
import 'ERC721Basic.sol';


/**
 * @title RootChain
 * @dev This contract secures a utxo payments plasma child chain to ethereum
 */

contract RootChain {
    using SafeMath for uint256;
    using Merkle for bytes32;
    using PlasmaRLP for bytes;

    /*
     * Events
     */
    event Deposit(address depositor, address contractAddress, uint256 amount, uint256 tokenId, uint256 depositBlock);
    event ExitStarted(address exitor, uint256 utxoPos, address contractAddress, uint256 amount, uint256 tokenId);

    /*
     *  Storage
     */
    mapping(uint256 => childBlock) public childChain;
    mapping(uint256 => exit) public exits;
    PriorityQueue exitsQueue;
    address public authority;
    /* Block numbering scheme below is needed to prevent Ethereum reorg from invalidating blocks submitted
       by operator. Two mechanisms must be in place to prevent chain from crashing:
       1) don't mine tx that spent fresh deposits; if they are reorged from existence, block is invalid
       2) disappearance of submit block does not affect operator's block numbering; hence tx submitted by
       users that address that block stay valid.
    */
    uint256 public currentChildBlock; /* ends with 000 */
    uint256 public currentDepositBlock; /* takes values in range 1..999 */
    uint256 public childBlockInterval;
    uint256 public currentFeeExit;

    struct exit {
        address owner;
        address contractAddress;
        uint256 amount;
        uint256 tokenId;
    }

    struct childBlock {
        bytes32 root;
        uint256 created_at;
    }

    /*
     *  Modifiers
     */
    modifier isAuthority() {
        require(msg.sender == authority);
        _;
    }

    /*
     * Public Functions
     */

    function RootChain()
        public
    {
        authority = msg.sender;
        childBlockInterval = 1000;
        currentChildBlock = childBlockInterval;
        currentDepositBlock = 1;
        currentFeeExit = 1;
        exitsQueue = new PriorityQueue();
    }

    // @dev Allows Plasma chain operator to submit block root
    // @param root The root of a child chain block
    function submitBlock(bytes32 root, uint256 expireTimestamp)
        public
        isAuthority
    {
        require(expireTimestamp == 0 || block.timestamp < expireTimestamp);
        childChain[currentChildBlock] = childBlock({
            root: root,
            created_at: block.timestamp
        });
        currentChildBlock = currentChildBlock.add(childBlockInterval);
        currentDepositBlock = 1;
    }
    
    function getRoot(address contractAddress, uint256 amount, uint256 tokenId)
        private
        returns(bytes32 root)
    {
        if(contractAddress == address(0)){
            require(amount == msg.value);
            require(tokenId == 0);
//             root = keccak256(msg.sender, contractAddress, msg.value, 0);
        }else if(amount == 0){
            require(contractAddress != 0);
            require(tokenId != 0);
            ERC721Basic erc721Contract = ERC721Basic(contractAddress);
            require(erc721Contract.ownerOf(tokenId) != address(this));
            erc721Contract.transferFrom(msg.sender, address(this), tokenId);
            require(erc721Contract.ownerOf(tokenId) == address(this));
//             root = keccak256(msg.sender, contractAddress, 0, tokenId);
        }else{
            require(contractAddress != 0);
            require(tokenId == 0);
            ERC20 erc20Contract = ERC20(contractAddress);
            uint256 originAmount = erc20Contract.balanceOf(address(this));
            erc20Contract.transferFrom(msg.sender, address(this), amount);
            require(erc20Contract.balanceOf(address(this)) - originAmount == amount);
//             root = keccak256(msg.sender, contractAddress, amount, 0);
        }
        root = keccak256(msg.sender, contractAddress, amount, tokenId);
    }

    // @dev Allows anyone to deposit funds into the Plasma chain
    // @param txBytes The format of the transaction that'll become the deposit
    function deposit(address contractAddress, uint256 amount, uint256 tokenId)
        public
        payable
    {
        require(currentDepositBlock < childBlockInterval);
        bytes32 root = getRoot(contractAddress, amount, tokenId);
        uint256 depositBlock = getDepositBlock();
        childChain[depositBlock] = childBlock({
            root: root,
            created_at: block.timestamp
        });
        currentDepositBlock = currentDepositBlock.add(1);
        Deposit(msg.sender, contractAddress, amount, tokenId, depositBlock);
    }

    function startDepositExit(uint256 depositPos, address contractAddress, uint256 amount, uint256 tokenId)
        public
    {
        uint256 blknum = depositPos / 1000000000;
        // Makes sure that deposit position is actually a deposit
        require(blknum % childBlockInterval != 0);
        bytes32 root = childChain[blknum].root;
        bytes32 depositHash = keccak256(msg.sender, contractAddress, amount, tokenId);
        require(root == depositHash);
        addExitToQueue(depositPos, msg.sender, contractAddress, amount, tokenId, childChain[blknum].created_at);
    }

//     function startFeeExit(uint256 amount)
//         public
//         isAuthority
//         returns (uint256)
//     {
//         addExitToQueue(currentFeeExit, msg.sender, amount, block.timestamp + 1);
//         currentFeeExit = currentFeeExit.add(1);
//     }

    // @dev Starts to exit a specified utxo
    // @param utxoPos The position of the exiting utxo in the format of blknum * 1000000000 + index * 10000 + oindex
    // @param txBytes The transaction being exited in RLP bytes format
    // @param proof Proof of the exiting transactions inclusion for the block specified by utxoPos
    // @param sigs Both transaction signatures and confirmations signatures used to verify that the exiting transaction has been confirmed
    function startExit(uint256 utxoPos, bytes txBytes, bytes proof, bytes sigs)
        public
    {
        uint256 blknum = utxoPos / 1000000000;
        require(blknum % childBlockInterval == 0);
        uint256 txindex = (utxoPos % 1000000000) / 10000;
        uint256 oindex = utxoPos - blknum * 1000000000 - txindex * 10000;
        var exitingTx = txBytes.createExitingTx(oindex);
        
        require(msg.sender == exitingTx.exitor);
        bytes32 root = childChain[blknum].root; 
//         bytes32 merkleHash = keccak256(keccak256(txBytes), ByteUtils.slice(sigs, 0, 130));
        bytes32 merkleHash = keccak256(keccak256(txBytes), sigs);
//         require(Validate.checkSigs(keccak256(txBytes), root, exitingTx.inputCount, sigs));
        require(merkleHash.checkMembership(txindex, root, proof));
        addExitToQueue(utxoPos, exitingTx.exitor, exitingTx.contractAddress, exitingTx.amount, exitingTx.tokenId, childChain[blknum].created_at);
    }

    // Priority is a given utxos position in the exit priority queue
    function addExitToQueue(uint256 utxoPos, address exitor, address contractAddress, uint256 amount, uint256 tokenId, uint256 created_at)
        private
    {
        uint256 blknum = utxoPos / 1000000000;
        uint256 exitable_at = Math.max(created_at + 2 weeks, block.timestamp + 1 weeks);
//         uint256 exitable_at = Math.max(created_at, block.timestamp); // only for debug
        uint256 priority = exitable_at << 128 | utxoPos;
        require(amount > 0 || tokenId > 0);
        require(exits[utxoPos].contractAddress == address(0) && exits[utxoPos].amount == 0 && exits[utxoPos].tokenId == 0);
        exitsQueue.insert(priority);
        exits[utxoPos] = exit({
            owner: exitor,
            contractAddress: contractAddress,
            amount: amount,
            tokenId: tokenId
        });
        ExitStarted(msg.sender, utxoPos, contractAddress, amount, tokenId);
    }

    /**
     * @dev Allows anyone to challenge an exiting transaction by submitting proof of a double spend on the child chain.
     * @param _cUtxoPos The position of the challenging utxo.
     * @param _eUtxoIndex The output position of the exiting utxo.
     * @param _txBytes The challenging transaction in bytes RLP form.
     * @param _proof Proof of inclusion for the transaction used to challenge.
     * @param _sigs Signatures for the transaction used to challenge.
     */
    function challengeExit(
        uint256 _cUtxoPos,
        uint256 _eUtxoIndex,
        bytes _txBytes,
        bytes _proof,
        bytes _sigs
    )
        public
    {
        uint256 eUtxoPos = _txBytes.getUtxoPos(_eUtxoIndex);
        uint256 txindex = (_cUtxoPos % 1000000000) / 10000;
        bytes32 root = childChain[_cUtxoPos / 1000000000].root;
        var txHash = keccak256(_txBytes);
        var confirmationHash = keccak256(txHash, root);
        var merkleHash = keccak256(txHash, _sigs);
        address owner = exits[eUtxoPos].owner;

        // Validate the spending transaction.
//         require(owner == ECRecovery.recover(confirmationHash, _confirmationSig));
        require(merkleHash.checkMembership(txindex, root, _proof));

        // Delete the owner but keep the amount to prevent another exit.
        delete exits[eUtxoPos].owner;
    }

    // @dev Loops through the priority queue of exits, settling the ones whose challenge
    // @dev challenge period has ended
    function finalizeExits()
        public
    {
        uint256 utxoPos;
        uint256 exitable_at;
        (utxoPos, exitable_at) = getNextExit();
        exit memory currentExit = exits[utxoPos];
        while (exitable_at < block.timestamp && exitsQueue.currentSize() > 0) {
            currentExit = exits[utxoPos];
            
            if(currentExit.contractAddress == address(0)){
                currentExit.owner.transfer(currentExit.amount);
            }else if(currentExit.amount == 0){
                ERC721Basic erc721Contract = ERC721Basic(currentExit.contractAddress);
                erc721Contract.transferFrom(address(this), currentExit.owner, currentExit.tokenId);
            }else{
                ERC20 erc20Contract = ERC20(currentExit.contractAddress);
                erc20Contract.transfer(currentExit.owner, currentExit.amount);
            }
            
            exitsQueue.delMin();
            delete exits[utxoPos].owner;

            if (exitsQueue.currentSize() > 0) {
                (utxoPos, exitable_at) = getNextExit();
            } else {
                return;
            }
        }
    }

    /* 
     *  Constant functions
     */
    function getChildChain(uint256 blockNumber)
        public
        view
        returns (bytes32, uint256)
    {
        return (childChain[blockNumber].root, childChain[blockNumber].created_at);
    }

    function getDepositBlock()
        public
        view
        returns (uint256)
    {
        return currentChildBlock.sub(childBlockInterval).add(currentDepositBlock);
    }

    function getExit(uint256 utxoPos)
        public
        view
        returns (address, uint256)
    {
        return (exits[utxoPos].owner, exits[utxoPos].amount);
    }

    function getNextExit()
        public
        view
        returns (uint256, uint256)
    {
        uint256 priority = exitsQueue.getMin();
        uint256 utxoPos = uint256(uint128(priority));
        uint256 exitable_at = priority >> 128;
        return (utxoPos, exitable_at);
    }
}
