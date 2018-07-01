pragma solidity 0.4.18;

import "RLP.sol";

library PlasmaRLP {

    struct exitingTx {
        address contractAddress;
        uint256 amount;
        uint256 tokenId;
        address exitor;
//         uint256 inputCount;
    }

    /* Public Functions */

    function getUtxoPos(bytes memory challengingTxBytes, uint256 oIndex)
        internal
        constant
        returns (uint256)
    {
        var txList = RLP.toList(RLP.toRlpItem(challengingTxBytes));
        uint256 oIndexShift = oIndex * 3;
        return
            RLP.toUint(txList[0 + oIndexShift]) +
            RLP.toUint(txList[1 + oIndexShift]) +
            RLP.toUint(txList[2 + oIndexShift]);
    }

    function createExitingTx(bytes memory exitingTxBytes, uint256 oindex)
        internal
        constant
        returns (exitingTx)
    {
        var txList = RLP.toList(RLP.toRlpItem(exitingTxBytes));
        return exitingTx({
            contractAddress: RLP.toAddress(txList[7 + 4 * oindex]),
            amount: RLP.toUint(txList[8 + 4 * oindex]),
            tokenId: RLP.toUint(txList[9 + 4 * oindex]),
            exitor: RLP.toAddress(txList[6 + 4 * oindex])
//             inputCount: RLP.toUint(txList[0]) * RLP.toUint(txList[3])
        });
    }
}
