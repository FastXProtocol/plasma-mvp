class TxAlreadySpentException(Exception):
    """the transaction is already spent"""


class InvalidTxSignatureException(Exception):
    """the signature of a tx is invalid"""


class InvalidTxOutputsException(Exception):
    """the output of a tx is invalid"""


class InvalidTxInputsException(Exception):
    """the input of a tx is invalid"""


class InvalidBlockSignatureException(Exception):
    """the signature of a block is invalid"""


class TxAmountMismatchException(Exception):
    """tx input total amount is not equal to output total amount"""


class InvalidBlockMerkleException(Exception):
    """merkle tree of a block is invalid"""


class PsTxAlreadyExistsException(Exception):
    """the ps transaction already exists"""


class PsTxExpiredException(Exception):
    """the ps transaction is expired"""