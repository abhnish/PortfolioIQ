from pydantic import BaseModel

class PortfolioAnalysis(BaseModel):
    total_value: float
    total_invested: float
    total_gain_loss_pct: float
    allocation_by_asset: dict[str, float]
    allocation_by_type: dict[str, float]
    volatility: float
    sharpe_ratio: float
    diversification_score: float
    top_holding_concentration: float
    historical_values: list[float]
    data_source: str
