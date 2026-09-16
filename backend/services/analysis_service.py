import numpy as np
from backend.models.holding import Portfolio
from backend.models.analysis import PortfolioAnalysis
from backend.services.price_service import get_price

def calculate_portfolio_weights(portfolio: Portfolio, current_prices: dict[str, float]) -> dict[str, float]:
    """Calculate the weight of each ticker in the portfolio based on current value."""
    values = {h.ticker: h.quantity * current_prices[h.ticker] for h in portfolio}
    total_val = sum(values.values())
    if total_val == 0:
        return {h.ticker: 0.0 for h in portfolio}
    return {ticker: val / total_val for ticker, val in values.items()}

def calculate_volatility(weights: dict[str, float], price_histories: dict[str, list[float]]) -> float:
    """
    Calculate annualized portfolio volatility from daily returns.
    Assumes 252 trading days in a year.
    """
    tickers = list(weights.keys())
    if not tickers: return 0.0
    
    min_len = min(len(price_histories[t]) for t in tickers)
    if min_len < 2: return 0.0
    
    returns_matrix = []
    for t in tickers:
        prices = price_histories[t][-min_len:]
        # Calculate daily returns (p_t / p_t-1) - 1
        daily_returns = np.diff(prices) / prices[:-1]
        returns_matrix.append(daily_returns)
        
    returns_matrix = np.array(returns_matrix) # shape: (num_assets, days)
    cov_matrix = np.cov(returns_matrix) # shape: (num_assets, num_assets)
    
    w = np.array([weights[t] for t in tickers])
    
    # Portfolio variance = w^T * Cov * w
    if len(tickers) == 1:
        port_variance = cov_matrix.item()
    else:
        port_variance = np.dot(w.T, np.dot(cov_matrix, w))
        
    daily_vol = np.sqrt(port_variance)
    annualized_vol = daily_vol * np.sqrt(252)
    return float(annualized_vol)

def calculate_sharpe_ratio(total_gain_loss_pct: float, volatility: float, risk_free_rate: float = 0.06) -> float:
    """
    Calculate Sharpe Ratio = (Return - RiskFreeRate) / Volatility
    Using 6% risk-free rate as per India T-bill assumption.
    """
    if volatility <= 0.0001:
        return 0.0
    return float((total_gain_loss_pct - risk_free_rate) / volatility)

def calculate_diversification(weights: dict[str, float]) -> float:
    """
    Calculate a 0-100 diversification score using 1 - Herfindahl-Hirschman Index (HHI).
    HHI = sum of squared weights.
    HHI close to 1 means concentrated (score ~0).
    HHI close to 1/N means diversified (score ~100).
    """
    if not weights: return 0.0
    hhi = sum(w**2 for w in weights.values())
    score = (1.0 - hhi) * 100.0
    return max(0.0, min(100.0, float(score)))

def analyze_portfolio(portfolio: Portfolio) -> PortfolioAnalysis:
    if not portfolio:
        return PortfolioAnalysis(
            total_value=0.0, total_invested=0.0, total_gain_loss_pct=0.0,
            allocation_by_asset={}, allocation_by_type={}, volatility=0.0,
            sharpe_ratio=0.0, diversification_score=0.0, top_holding_concentration=0.0,
            data_source="mock"
        )
        
    current_prices = {}
    price_histories = {}
    data_source_set = set()
    
    for h in portfolio:
        p_data = get_price(h.ticker)
        current_prices[h.ticker] = p_data["current_price"]
        price_histories[h.ticker] = p_data["history"]
        data_source_set.add(p_data["source"])
        
    source = "mock" if "mock" in data_source_set else "live"
    
    total_invested = sum(h.quantity * h.buy_price for h in portfolio)
    total_value = sum(h.quantity * current_prices[h.ticker] for h in portfolio)
    
    total_gain_loss_pct = (total_value - total_invested) / total_invested if total_invested > 0 else 0.0
    
    weights = calculate_portfolio_weights(portfolio, current_prices)
    
    # allocations
    allocation_by_asset = weights
    allocation_by_type = {}
    for h in portfolio:
        t = h.asset_type.value
        allocation_by_type[t] = allocation_by_type.get(t, 0.0) + weights[h.ticker]
        
    volatility = calculate_volatility(weights, price_histories)
    sharpe = calculate_sharpe_ratio(total_gain_loss_pct, volatility)
    div_score = calculate_diversification(weights)
    top_concentration = max(weights.values()) if weights else 0.0
    
    # Calculate historical aggregate values for the frontend chart
    historical_values = []
    if portfolio:
        min_len = min(len(price_histories[h.ticker]) for h in portfolio)
        if min_len > 0:
            for i in range(-min_len, 0):
                day_val = sum(h.quantity * price_histories[h.ticker][i] for h in portfolio)
                historical_values.append(day_val)
    
    return PortfolioAnalysis(
        total_value=total_value,
        total_invested=total_invested,
        total_gain_loss_pct=total_gain_loss_pct,
        allocation_by_asset=allocation_by_asset,
        allocation_by_type=allocation_by_type,
        volatility=volatility,
        sharpe_ratio=sharpe,
        diversification_score=div_score,
        top_holding_concentration=top_concentration,
        historical_values=historical_values,
        data_source=source
    )
