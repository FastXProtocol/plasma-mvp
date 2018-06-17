import os
from pathlib import Path

from dotenv import load_dotenv
from ethereum import utils


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(dotenv_path=os.path.join(BASE_DIR, "..", ".env"))

if os.getenv("ENV") == "LOCAL":
    plasma_config = dict(
        ROOT_CHAIN_CONTRACT_ADDRESS="0xa3b2a1804203b75b494028966c0f62e677447a39",
        NETWORK="http://localhost:8545",
    )
else:
    plasma_config = dict(
        ROOT_CHAIN_CONTRACT_ADDRESS="0xDE4E92eF1527B06ceb53694a6C1db4B4Aa62BB9d",
        NETWORK="http://dev.msan.cn:8545",
    )

plasma_config["AUTHORITY_KEY"] = os.getenv("AUTHORITY_KEY")
plasma_config["AUTHORITY_KEY"] = utils.normalize_key(plasma_config["AUTHORITY_KEY"])
plasma_config["AUTHORITY"] = utils.privtoaddr(plasma_config["AUTHORITY_KEY"])
plasma_config["COINBASE"] = "0x" + plasma_config["AUTHORITY"].hex()

plasma_config["CHILD_CHAIN_HOST"] = os.getenv("CHILD_CHAIN_HOST") or "0.0.0.0"
plasma_config["CHILD_CHAIN_PORT"] = os.getenv("CHILD_CHAIN_PORT") or "8546"

for env_key in [
    "CHILD_CHAIN_SSL_CRT_PATH",
    "CHILD_CHAIN_SSL_KEY_PATH",
]:
    plasma_config[env_key] = os.getenv(env_key)