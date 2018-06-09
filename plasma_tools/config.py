import os
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(dotenv_path=os.path.join(BASE_DIR, "..", ".env"))

if os.getenv("ENV") == "LOCAL":
    tools_config = dict(
        ERC721_CONTRACT_ADDRESS="0xd641205E8F36A858c5867945782C917E3F63d1e8",
        ERC20_CONTRACT_ADDRESS="0x395B650707cAA0d300615bBa2901398DFf64CF7c",
    )
else:
    tools_config = dict(
        ERC721_CONTRACT_ADDRESS="0x952CE607bD9ab82e920510b2375cbaD234d28c8F",
        ERC20_CONTRACT_ADDRESS="0x0FB60c08b75167c5242DbEA0226D4a7784de86e6",
    )