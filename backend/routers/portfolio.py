from fastapi import APIRouter, HTTPException
from backend.models.holding import Portfolio, Holding, AssetType
from backend.models.analysis import PortfolioAnalysis
from backend.models.advice import PortfolioAdvice
from backend.services.portfolio_store import get_portfolio, set_portfolio
from backend.services.analysis_service import analyze_portfolio
from backend.services.advice_service import generate_advice

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

@router.get("", response_model=Portfolio)
def read_portfolio():
    return get_portfolio()

@router.post("", response_model=Portfolio)
def update_portfolio(portfolio: Portfolio):
    if len(portfolio) > 20:
        raise HTTPException(status_code=400, detail="Portfolio size capped at 20 holdings for the demo.")
    set_portfolio(portfolio)
    return get_portfolio()

@router.delete("", response_model=Portfolio)
def clear_portfolio():
    set_portfolio([])
    return get_portfolio()

@router.post("/sample/{preset_type}", response_model=Portfolio)
def load_sample_portfolio(preset_type: str):
    if preset_type == "tech":
        set_portfolio([
            Holding(ticker="AAPL", quantity=100, buy_price=150.0, asset_type=AssetType.stock),
            Holding(ticker="MSFT", quantity=80, buy_price=300.0, asset_type=AssetType.stock),
            Holding(ticker="NVDA", quantity=20, buy_price=100.0, asset_type=AssetType.stock),
        ])
    elif preset_type == "balanced":
        set_portfolio([
            Holding(ticker="VOO", quantity=50, buy_price=400.0, asset_type=AssetType.stock),
            Holding(ticker="BTC-USD", quantity=1.5, buy_price=60000.0, asset_type=AssetType.crypto),
            Holding(ticker="BND", quantity=200, buy_price=70.0, asset_type=AssetType.mutualfund),
            Holding(ticker="GLD", quantity=30, buy_price=180.0, asset_type=AssetType.mutualfund),
        ])
    else:
        raise HTTPException(status_code=404, detail="Unknown sample type")
    return get_portfolio()

@router.get("/analysis", response_model=PortfolioAnalysis)
def get_portfolio_analysis():
    portfolio = get_portfolio()
    return analyze_portfolio(portfolio)

@router.get("/advice", response_model=PortfolioAdvice)
def get_portfolio_advice():
    portfolio = get_portfolio()
    analysis = analyze_portfolio(portfolio)
    return generate_advice(analysis)
