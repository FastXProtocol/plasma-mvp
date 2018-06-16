import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(dotenv_path=os.path.join(BASE_DIR, "..", ".env"))

if os.getenv("ENV") == "LOCAL":
    plasma_config = dict(
        ROOT_CHAIN_CONTRACT_ADDRESS="0xa3b2a1804203b75b494028966c0f62e677447a39",
        AUTHORITY=b'\xfd\x02\xec\xeeby~u\xd8k\xcf\xf1d.\xb0\x84J\xfb(\xc7',
        NETWORK="http://localhost:8545",
#         AUTHORITY_KEY=b';\xb3i\xfe\xcd\xc1k\x93\xb9\x95\x14\xd8\xed\x9c.\x87\xc5\x82L\xf4\xa6\xa9\x8d.\x8e\x91\xb7\xdd\x0c\x063\x04',
    )
else:
    plasma_config = dict(
        ROOT_CHAIN_CONTRACT_ADDRESS="0xD9FA1cbB70b74f3Ef259CE0eb48029F02eE0FcD1",
        AUTHORITY=b'\xd1\x03\xc6G5\xb3$\x16\x15\x18\xf1|\xef\x15\xd1\xe2~\x0b\x9f>',
        NETWORK="http://localhost:8545",
    )
plasma_config["COINBASE"] = "0x" + plasma_config["AUTHORITY"].hex()

plasma_config["CHILD_CHAIN_HOST"] = os.getenv("CHILD_CHAIN_HOST") or "0.0.0.0"
plasma_config["CHILD_CHAIN_PORT"] = os.getenv("CHILD_CHAIN_PORT") or "8546"

for env_key in [
    "CHILD_CHAIN_SSL_CRT_PATH",
    "CHILD_CHAIN_SSL_KEY_PATH",
]:
    plasma_config[env_key] = os.getenv(env_key)
