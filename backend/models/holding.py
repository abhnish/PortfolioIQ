from enum import Enum
from pydantic import BaseModel

class AssetType(str, Enum):
    stock = "stock"
    mutualfund = "mutualfund"
    crypto = "crypto"

class Holding(BaseModel):
    ticker: str
    quantity: float
    buy_price: float
    asset_type: AssetType

Portfolio = list[Holding]
