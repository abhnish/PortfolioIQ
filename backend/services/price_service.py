import yfinance as yf
import random
import logging
import time

logger = logging.getLogger(__name__)

MOCK_PRICES = {
    "AAPL": 150.0,
    "MSFT": 300.0,
    "GOOGL": 2800.0,
    "BTC-USD": 45000.0,
    "ETH-USD": 3000.0,
}

MOCK_HISTORY_CACHE: dict[str, list[float]] = {}
LIVE_HISTORY_CACHE: dict[str, tuple[float, dict]] = {}
LIVE_CACHE_TTL_SEC = 300  # 5 minutes

def generate_random_walk(base_price: float, days: int = 126, vol: float = 0.02) -> list[float]:
    """Generates a synthetic random walk of prices."""
    history = []
    current = base_price
    for _ in range(days):
        current = current * (1 + random.gauss(0, vol))
        history.append(current)
    return history

def get_price(ticker: str) -> dict:
    """
    Tries to fetch 6 months of daily close prices from yfinance.
    Falls back to a mock price and synthetic random walk if it fails.
    """
    ticker = ticker.upper()
    now = time.time()
    
    # Check Live Cache
    if ticker in LIVE_HISTORY_CACHE:
        cache_time, cached_result = LIVE_HISTORY_CACHE[ticker]
        if now - cache_time < LIVE_CACHE_TTL_SEC:
            return cached_result

    # Try fetching live
    try:
        import math
        ticker_obj = yf.Ticker(ticker)
        hist = ticker_obj.history(period="6mo")
        if not hist.empty and "Close" in hist:
            closes = [float(p) for p in hist["Close"].tolist() if not (math.isnan(p) or math.isinf(p))]
            if len(closes) > 2:
                result = {
                    "current_price": closes[-1],
                    "history": closes,
                    "source": "live"
                }
                LIVE_HISTORY_CACHE[ticker] = (now, result)
                return result
    except Exception as e:
        logger.warning(f"Failed to fetch live price for {ticker}: {e}")
    
    # Fallback to Mock Data
    if ticker in MOCK_HISTORY_CACHE:
        history = MOCK_HISTORY_CACHE[ticker]
    else:
        base = MOCK_PRICES.get(ticker, 100.0)
        history = generate_random_walk(base)
        MOCK_HISTORY_CACHE[ticker] = history
        
    return {
        "current_price": history[-1],
        "history": history,
        "source": "mock"
    }
