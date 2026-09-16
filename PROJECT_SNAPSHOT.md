# PortfolioIQ Snapshot

## 1. Directory Tree
```text
frontend
frontend/tsconfig.node.json
frontend/index.html
frontend/tailwind.config.js
frontend/tsconfig.app.json
frontend/.oxlintrc.json
frontend/node_modules
frontend/README.md
frontend/public
frontend/public/icons.svg
frontend/public/favicon.svg
frontend/.gitignore
frontend/package-lock.json
frontend/package.json
frontend/components.json
frontend/tsconfig.json
frontend/vite.config.ts
frontend/postcss.config.js
frontend/src
frontend/src/App.tsx
frontend/src/main.tsx
frontend/src/App.css
frontend/src/index.css
frontend/src/components
frontend/src/components/PortfolioManager.tsx
frontend/src/components/ui
frontend/src/components/ui/alert-dialog.tsx
frontend/src/components/ui/card.tsx
frontend/src/components/ui/toaster.tsx
frontend/src/components/ui/sheet.tsx
frontend/src/components/ui/badge.tsx
frontend/src/components/ui/table.tsx
frontend/src/components/ui/button.tsx
frontend/src/components/ui/toast.tsx
frontend/src/components/ui/select.tsx
frontend/src/components/ui/input.tsx
frontend/src/components/ui/skeleton.tsx
frontend/src/components/Dashboard.tsx
frontend/src/components/LandingHero.tsx
frontend/src/components/AddHoldingSheet.tsx
frontend/src/hooks
frontend/src/hooks/use-toast.ts
frontend/src/lib
frontend/src/lib/utils.ts
frontend/src/lib/api.ts
frontend/src/assets
frontend/src/assets/hero.png
frontend/src/assets/vite.svg
frontend/src/assets/react.svg
frontend/src/pages
frontend/src/pages/Landing.tsx
backend
backend/routers
backend/routers/portfolio.py
backend/requirements.txt
backend/models
backend/models/advice.py
backend/models/analysis.py
backend/models/holding.py
backend/main.py
backend/services
backend/services/price_service.py
backend/services/portfolio_store.py
backend/services/advice_service.py
backend/services/analysis_service.py

```

## 2. Backend Files

### backend/main.py
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import portfolio

app = FastAPI(title="PortfolioIQ API")

# Configure CORS for local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(portfolio.router)

@app.get("/")
def root():
    return {"message": "Welcome to PortfolioIQ API"}

```

### backend/routers/portfolio.py
```python
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

```

### backend/models/advice.py
```python
from pydantic import BaseModel
from backend.models.analysis import PortfolioAnalysis

class PortfolioAdvice(BaseModel):
    summary: str
    suggestions: list[str]
    based_on: PortfolioAnalysis

```

### backend/models/analysis.py
```python
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

```

### backend/models/holding.py
```python
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

```

### backend/services/price_service.py
```python
import yfinance as yf
import random
import logging

logger = logging.getLogger(__name__)

MOCK_PRICES = {
    "AAPL": 150.0,
    "MSFT": 300.0,
    "GOOGL": 2800.0,
    "BTC-USD": 45000.0,
    "ETH-USD": 3000.0,
}

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
    try:
        ticker_obj = yf.Ticker(ticker)
        hist = ticker_obj.history(period="6mo")
        if not hist.empty and "Close" in hist:
            closes = hist["Close"].tolist()
            if len(closes) > 0:
                return {
                    "current_price": float(closes[-1]),
                    "history": [float(p) for p in closes],
                    "source": "live"
                }
    except Exception as e:
        logger.warning(f"Failed to fetch live price for {ticker}: {e}")
    
    # Fallback
    base = MOCK_PRICES.get(ticker.upper(), 100.0)
    history = generate_random_walk(base)
    return {
        "current_price": history[-1],
        "history": history,
        "source": "mock"
    }

```

### backend/services/portfolio_store.py
```python
from backend.models.holding import Portfolio

# In-memory store
portfolio_data: Portfolio = []

def get_portfolio() -> Portfolio:
    return portfolio_data

def set_portfolio(new_portfolio: Portfolio):
    global portfolio_data
    portfolio_data = new_portfolio

```

### backend/services/advice_service.py
```python
import os
import json
import logging
import hashlib
from google import genai
from backend.models.analysis import PortfolioAnalysis
from backend.models.advice import PortfolioAdvice

logger = logging.getLogger(__name__)

# Simple in-memory cache keyed by a hash of the analysis result
# to prevent repeated identical API calls and save costs.
_advice_cache: dict[str, PortfolioAdvice] = {}

def get_fallback_advice(analysis: PortfolioAnalysis) -> PortfolioAdvice:
    """Generates a rule-based fallback advice if the LLM API fails or is unavailable."""
    summary = "AI advisory temporarily unavailable — here is a rule-based summary. Your portfolio has been analyzed based on standard metrics."
    suggestions = []
    
    if analysis.top_holding_concentration > 0.40:
        suggestions.append(f"Your top holding makes up {analysis.top_holding_concentration*100:.1f}% of your portfolio. Consider diversifying to reduce single-asset risk.")
    
    if analysis.diversification_score < 30:
        suggestions.append("Your diversification score is low. Adding different asset types or sectors could improve stability.")
        
    if analysis.volatility > 0.25:
        suggestions.append("Your portfolio volatility is relatively high (>25% annualized). Ensure this matches your risk tolerance.")
        
    if not suggestions:
        suggestions.append("Your portfolio metrics look balanced. Continue monitoring your asset allocation.")
        
    return PortfolioAdvice(
        summary=summary,
        suggestions=suggestions,
        based_on=analysis
    )

def _hash_analysis(analysis: PortfolioAnalysis) -> str:
    """Creates a deterministic hash of the analysis to use as a cache key."""
    # Convert to json string
    data_str = analysis.model_dump_json(exclude_none=True)
    return hashlib.md5(data_str.encode("utf-8")).hexdigest()

def generate_advice(analysis: PortfolioAnalysis) -> PortfolioAdvice:
    """
    Calls Gemini API to generate personalized financial advice based on the metrics.
    Includes caching to prevent redundant calls.
    """
    cache_key = _hash_analysis(analysis)
    if cache_key in _advice_cache:
        logger.info("Returning cached AI advice.")
        return _advice_cache[cache_key]

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not found. Using rule-based fallback.")
        return get_fallback_advice(analysis)

    try:
        client = genai.Client(api_key=api_key)
        
        # PROMPT ENGINEERING CHOICES:
        # 1. Persona: "You are a financial advisor" sets the tone and domain expertise.
        # 2. Strict Grounding: "Base your advice ONLY on the portfolio metrics provided below" prevents hallucinations (inventing non-existent holdings or numbers).
        # 3. Output Formatting: Explicitly requesting a JSON structure with "summary" and "suggestions" allows for deterministic parsing into our Pydantic model.
        # 4. Length Constraints: "3-5 sentences" and "1-2 specific... suggestions" ensures the response is concise and easily readable on a dashboard.
        system_prompt = (
            "You are a financial advisor. Base your advice ONLY on the portfolio metrics provided below. "
            "Do not invent numbers or make claims not supported by the data. "
            "Give 3-5 sentences of advice in plain, friendly language, followed by 1-2 specific, actionable suggestions as a bulleted list. "
            "Return the response strictly as JSON with exactly two keys: 'summary' (a string) and 'suggestions' (a list of strings)."
        )
        
        prompt = f"{system_prompt}\n\nPortfolio Metrics:\n{analysis.model_dump_json(indent=2)}"
        
        # We use gemini-2.5-flash as it is fast, cost-effective, and highly capable for summarization tasks.
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
        )
        
        raw_text = response.text.strip()
        
        # Strip markdown formatting if the model wrapped the JSON in code blocks
        if raw_text.startswith("```"):
            lines = raw_text.split('\n')
            if lines[0].startswith("```"):
                lines = lines[1:]
            if len(lines) > 0 and lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_text = "\n".join(lines).strip()
            
        data = json.loads(raw_text)
        
        advice = PortfolioAdvice(
            summary=data.get("summary", "No summary provided."),
            suggestions=data.get("suggestions", []),
            based_on=analysis
        )
        
        # Save to cache
        _advice_cache[cache_key] = advice
        return advice

    except Exception as e:
        logger.error(f"AI generation failed: {e}")
        return get_fallback_advice(analysis)

```

### backend/services/analysis_service.py
```python
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

```

## 3. Frontend Files

### frontend/src/pages/Landing.tsx
```tsx
import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Activity, BrainCircuit, LineChart } from 'lucide-react'

export function Landing() {
  const navigate = useNavigate()

  return (
    <div className="relative min-h-screen bg-background text-foreground flex flex-col items-center justify-center overflow-hidden">
      {/* Animated Blobs */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }} 
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10 mix-blend-screen"
      />
      <motion.div 
        animate={{ scale: [1, 1.2, 1], rotate: [0, -90, 0] }} 
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-secondary/20 rounded-full blur-[150px] -z-10 mix-blend-screen"
      />

      <div className="z-10 text-center space-y-6 max-w-3xl px-6 mb-20 mt-10">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl md:text-8xl font-bold tracking-tighter"
        >
          Portfolio<span className="text-primary">IQ</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          className="text-xl md:text-2xl text-muted-foreground font-medium tracking-tight"
        >
          Understand your portfolio. Not just your profit.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-primary/25 hover:scale-105 transition-all" onClick={() => navigate('/dashboard')}>
            Analyze My Portfolio
          </Button>
          <Button variant="ghost" size="lg" className="h-14 px-8 text-lg rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5" onClick={() => navigate('/dashboard?sample=tech')}>
            Try with Sample Data
          </Button>
        </motion.div>
      </div>

      {/* Feature Cards Below Fold */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl px-6 w-full z-10"
      >
        <div className="bg-card/50 backdrop-blur-md border border-white/5 p-6 rounded-2xl flex flex-col items-center text-center gap-3 shadow-xl">
          <Activity className="w-8 h-8 text-destructive" />
          <h3 className="font-semibold text-lg">Risk Analysis</h3>
          <p className="text-sm text-muted-foreground">Monitor volatility, Sharpe ratio, and uncover hidden concentration risks.</p>
        </div>
        <div className="bg-card/50 backdrop-blur-md border border-white/5 p-6 rounded-2xl flex flex-col items-center text-center gap-3 shadow-xl">
          <BrainCircuit className="w-8 h-8 text-secondary" />
          <h3 className="font-semibold text-lg">AI-Powered Advice</h3>
          <p className="text-sm text-muted-foreground">Get actionable, personalized recommendations synthesized by Gemini.</p>
        </div>
        <div className="bg-card/50 backdrop-blur-md border border-white/5 p-6 rounded-2xl flex flex-col items-center text-center gap-3 shadow-xl">
          <LineChart className="w-8 h-8 text-primary" />
          <h3 className="font-semibold text-lg">Live Market Data</h3>
          <p className="text-sm text-muted-foreground">Prices and historical trends sync instantly via YFinance integrations.</p>
        </div>
      </motion.div>
    </div>
  )
}

```

### frontend/src/components/PortfolioManager.tsx
```tsx
import React, { useEffect, useState } from "react"
import { fetchPortfolio, loadSamplePortfolio, resetPortfolio, submitPortfolio, type Holding } from "@/lib/api"
import { AddHoldingSheet } from "./AddHoldingSheet"
import { Dashboard } from "./Dashboard"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { useSearchParams } from "react-router-dom"

export function PortfolioManager() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [analysis, setAnalysis] = useState<any>(null)
  const [advice, setAdvice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [dismissedOnboarding, setDismissedOnboarding] = useState(false)

  const loadData = async (toastOnError = true) => {
    try {
      setLoading(true)
      const data = await fetchPortfolio()
      setHoldings(data)
      
      if (data.length > 0) {
        try {
          const res = await fetch("http://localhost:8000/portfolio/advice")
          if (!res.ok) throw new Error("Advice API failed")
          const adviceData = await res.json()
          setAdvice(adviceData)
          setAnalysis(adviceData.based_on)
        } catch (err) {
          console.error(err)
          if (toastOnError) {
            toast({
              title: "Analysis Error",
              description: "Could not load AI analysis. Please try again later.",
              variant: "destructive"
            })
          }
          setAdvice(null)
          setAnalysis(null)
        }
      } else {
        setAnalysis(null)
        setAdvice(null)
      }
    } catch (e: any) {
      console.error(e)
      if (toastOnError) {
        toast({
          title: "Connection Error",
          description: e.message || "Failed to connect to the server.",
          variant: "destructive"
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const sampleParam = searchParams.get("sample")
    if (sampleParam === "tech" || sampleParam === "balanced") {
      // Clear param so it doesn't re-trigger on hard reload
      searchParams.delete("sample")
      setSearchParams(searchParams)
      
      // Auto-load the sample
      handleLoadSample(sampleParam as any)
    } else {
      loadData(false)
    }
  }, [])

  const handleAdd = async (newHolding: Holding) => {
    try {
      const newPortfolio = [...holdings, newHolding]
      await submitPortfolio(newPortfolio)
      await loadData()
      toast({ title: "Holding Added", description: `Successfully added ${newHolding.ticker}` })
    } catch (e: any) {
      toast({ title: "Failed to add holding", description: e.message, variant: "destructive" })
    }
  }

  const handleLoadSample = async (type: "tech" | "balanced") => {
    try {
      setLoading(true)
      await loadSamplePortfolio(type)
      await loadData()
      toast({ title: "Sample Loaded", description: `Loaded the ${type} portfolio.` })
    } catch (e: any) {
      toast({ title: "Failed to load sample", description: e.message, variant: "destructive" })
    }
  }

  const handleReset = async () => {
    try {
      await resetPortfolio()
      await loadData()
      toast({ title: "Portfolio Reset", description: "All holdings have been cleared." })
    } catch (e: any) {
      toast({ title: "Failed to reset", description: e.message, variant: "destructive" })
    }
  }

  const isMockData = analysis?.data_source === "mock"

  return (
    <>
      <header className="w-full border-b border-white/5 bg-background/50 backdrop-blur-md z-10 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">
            Portfolio<span className="text-primary">IQ</span>
          </h1>
          {analysis && (
            <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-card border border-white/5 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isMockData ? 'bg-amber-400' : 'bg-green-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isMockData ? 'bg-amber-500' : 'bg-green-500'}`}></span>
              </span>
              <span className="text-muted-foreground uppercase tracking-wider">
                {isMockData ? "Mock Mode" : "Live Data"}
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="w-full relative min-h-[calc(100vh-80px)] p-6 md:p-12">
        {loading ? (
          <div className="w-full max-w-7xl mx-auto space-y-8 animate-pulse">
            <Skeleton className="h-24 w-64 rounded-xl bg-muted/20" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <Skeleton className="lg:col-span-7 h-[300px] rounded-2xl bg-muted/20" />
              <Skeleton className="lg:col-span-5 h-[300px] rounded-2xl bg-muted/20" />
            </div>
          </div>
        ) : holdings.length > 0 && !analysis ? (
           <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4 text-destructive">
               ⚠️
            </div>
            <h2 className="text-xl font-semibold">Analysis Unavailable</h2>
            <p className="text-muted-foreground max-w-sm mb-4">The analysis engine encountered an error. Please try again.</p>
            <Button onClick={() => loadData()}>Retry Analysis</Button>
            <Button variant="ghost" onClick={handleReset} className="text-destructive mt-2">Force Reset Portfolio</Button>
           </div>
        ) : holdings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
            
            {!dismissedOnboarding && (
              <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4 mb-8 flex items-center gap-4 text-left max-w-2xl relative animate-in slide-in-from-top-4 fade-in duration-500">
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:bg-secondary/20" onClick={() => setDismissedOnboarding(true)}>✕</Button>
                <div className="flex-1 pr-6">
                  <h4 className="font-semibold text-secondary mb-2">Getting Started</h4>
                  <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                    <span className="bg-secondary/20 px-2 py-0.5 rounded text-secondary-foreground font-medium">1</span> Add your holdings
                    <span className="text-muted-foreground/50">→</span>
                    <span className="bg-secondary/20 px-2 py-0.5 rounded text-secondary-foreground font-medium">2</span> See your analysis
                    <span className="text-muted-foreground/50">→</span>
                    <span className="bg-secondary/20 px-2 py-0.5 rounded text-secondary-foreground font-medium">3</span> Get AI advice
                  </p>
                </div>
              </div>
            )}

            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <div className="text-4xl">📈</div>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">No positions yet</h2>
            <p className="text-muted-foreground max-w-sm mb-8">
              Add your first holding or load a sample portfolio to see your AI-powered dashboard come to life.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={() => handleLoadSample("tech")} variant="secondary" className="bg-secondary/20 hover:bg-secondary/30 text-secondary-foreground border border-secondary/30">
                Load Tech Sample
              </Button>
              <Button onClick={() => handleLoadSample("balanced")} variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
                Load Balanced Sample
              </Button>
            </div>
          </div>
        ) : (
          <Dashboard analysis={analysis} holdings={holdings} advice={advice} onReset={handleReset} />
        )}

        <AddHoldingSheet onAdd={handleAdd} />
      </div>
    </>
  )
}

```

### frontend/src/components/Dashboard.tsx
```tsx
import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { BrainCircuit, TrendingUp, TrendingDown, Info, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

const COLORS = ["#2DD4BF", "#A78BFA", "#F87171", "#60A5FA", "#FBBF24"]

function CountUp({ value, isCurrency = false }: { value: number, isCurrency?: boolean }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let start = 0
    const end = value
    if (start === end) return
    const duration = 1000
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setDisplayValue(start + (end - start) * easeOutQuart)
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [value])

  if (isCurrency) {
    return <>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(displayValue)}</>
  }
  return <>{displayValue.toFixed(1)}</>
}

// Circular progress for diversification score
function CircularProgress({ score }: { score: number }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="relative flex items-center justify-center">
      <svg className="transform -rotate-90 w-24 h-24">
        <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/30" />
        <circle
          cx="48" cy="48" r={radius}
          stroke="currentColor" strokeWidth="8" fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="text-primary transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums"><CountUp value={score} /></span>
      </div>
    </div>
  )
}

// Semi-circle risk gauge
function RiskGauge({ volatility }: { volatility: number }) {
  const normalized = Math.min(Math.max(volatility * 100, 0), 40) // cap at 40% vol
  const percent = normalized / 40
  const radius = 50
  const circumference = Math.PI * radius
  const strokeDashoffset = circumference - percent * circumference

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden h-20 w-32 mx-auto">
      <svg className="w-full h-full" viewBox="0 0 120 60">
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="currentColor" strokeWidth="12" className="text-muted/30" strokeLinecap="round" />
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="currentColor" strokeWidth="12" 
          className="text-destructive transition-all duration-1000 ease-out" 
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" 
        />
      </svg>
      <div className="absolute bottom-0 text-center">
        <span className="text-lg font-bold tabular-nums">{(volatility * 100).toFixed(1)}%</span>
        <span className="text-[10px] block text-muted-foreground uppercase tracking-wider">Volatility</span>
      </div>
    </div>
  )
}

export function Dashboard({ analysis, holdings, advice, onReset }: { analysis: any, holdings: any[], advice: any, onReset: () => void }) {
  const [pieMode, setPieMode] = useState<"asset" | "type">("asset")

  // Prep pie data
  const pieDataRaw = pieMode === "asset" ? analysis.allocation_by_asset : analysis.allocation_by_type
  const pieData = Object.keys(pieDataRaw || {}).map(key => ({
    name: key,
    value: pieDataRaw[key] * 100
  }))

  // Prep area chart data
  const chartData = (analysis.historical_values || []).map((val: number, i: number) => ({
    day: `Day ${i+1}`,
    value: val
  }))

  const isPositive = analysis.total_gain_loss_pct >= 0

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Top Bar */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground tracking-widest uppercase mb-1">Total Portfolio Value</h2>
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-foreground tabular-nums">
            <CountUp value={analysis.total_value} isCurrency />
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium ${isPositive ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
            {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            <span className="text-lg tabular-nums">{(analysis.total_gain_loss_pct * 100).toFixed(2)}%</span>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="border-destructive/30 text-destructive hover:bg-destructive/10 rounded-full h-11 w-11 shrink-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Portfolio?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently clear all your current holdings.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN (60%) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Allocation Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-card/40 backdrop-blur-md border-white/5 shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Allocation</CardTitle>
                <div className="flex bg-muted/50 rounded-lg p-1">
                  <button onClick={() => setPieMode("asset")} className={`text-xs px-3 py-1 rounded-md transition-colors ${pieMode === "asset" ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>By Asset</button>
                  <button onClick={() => setPieMode("type")} className={`text-xs px-3 py-1 rounded-md transition-colors ${pieMode === "type" ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>By Type</button>
                </div>
              </CardHeader>
              <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0A0B0D', borderColor: '#27272a', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} formatter={(value: number) => [`${value.toFixed(1)}%`, 'Weight']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Historical Performance */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-card/40 backdrop-blur-md border-white/5 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-medium">6-Month Performance</CardTitle>
              </CardHeader>
              <CardContent className="h-[250px] -ml-4">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" hide />
                      <YAxis domain={['auto', 'auto']} tickFormatter={(v) => `$${v}`} stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0A0B0D', borderColor: '#27272a', borderRadius: '8px' }} labelStyle={{ display: 'none' }} itemStyle={{ color: '#2DD4BF' }} formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']} />
                      <Area type="monotone" dataKey="value" stroke="#2DD4BF" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Not enough historical data</div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* RIGHT COLUMN (40%) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Diversification */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
              <Card className="bg-card/40 backdrop-blur-md border-white/5 h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center h-full gap-4 text-center">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Diversification</h3>
                  <CircularProgress score={analysis.diversification_score} />
                </CardContent>
              </Card>
            </motion.div>

            {/* Risk Gauge */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}>
              <Card className="bg-card/40 backdrop-blur-md border-white/5 h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center h-full gap-4 text-center">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    Risk Profile <Info className="w-3 h-3" />
                  </h3>
                  <RiskGauge volatility={analysis.volatility} />
                  <div className="text-xs text-muted-foreground mt-2">
                    Sharpe: <strong className="text-foreground">{analysis.sharpe_ratio.toFixed(2)}</strong>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Holdings Badges */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-card/40 backdrop-blur-md border-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Holdings Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {holdings.map((h, i) => (
                  <Badge key={i} variant="outline" className="bg-background/50 text-xs px-3 py-1 flex items-center gap-2 border-white/10">
                    <span className="font-semibold text-foreground">{h.ticker}</span>
                    <span className="text-muted-foreground">{h.quantity}</span>
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* AI Advice Bubble */}
          {advice && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
              <div className="relative bg-secondary/10 border border-secondary/30 rounded-2xl p-6 shadow-xl backdrop-blur-md">
                <div className="absolute -top-4 -left-4 bg-secondary text-secondary-foreground p-3 rounded-full shadow-lg">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <h3 className="ml-8 text-lg font-semibold text-secondary mb-3">AI Advisor</h3>
                <p className="text-sm text-foreground/90 leading-relaxed mb-4">{advice.summary}</p>
                {advice.suggestions && advice.suggestions.length > 0 && (
                  <ul className="space-y-2">
                    {advice.suggestions.map((s: str, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

```

### frontend/src/components/LandingHero.tsx
```tsx
import React from "react";

export function LandingHero() {
  return (
    <div className="relative overflow-hidden border-b border-border bg-background py-20 px-6 sm:px-12 lg:px-24">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background opacity-70" />
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground">
          Portfolio<span className="text-primary">IQ</span>
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground font-light max-w-2xl mx-auto">
          The intelligent, modern dashboard for tracking your investments across stocks, crypto, and mutual funds.
        </p>
      </div>
    </div>
  );
}

```

### frontend/src/components/AddHoldingSheet.tsx
```tsx
import React, { useState } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { AssetType, Holding } from "@/lib/api"

export function AddHoldingSheet({ onAdd }: { onAdd: (h: Holding) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [ticker, setTicker] = useState("")
  const [quantity, setQuantity] = useState("")
  const [buyPrice, setBuyPrice] = useState("")
  const [assetType, setAssetType] = useState<AssetType>("stock")
  const [loading, setLoading] = useState(false)
  const [tickerError, setTickerError] = useState("")
  const { toast } = useToast()

  React.useEffect(() => {
    if (ticker.length > 0) {
      if (!/^[A-Z0-9-.]+$/i.test(ticker)) {
        setTickerError("Invalid format (use letters/numbers)")
      } else {
        setTickerError("")
      }
    } else {
      setTickerError("")
    }
  }, [ticker])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticker || !quantity || !buyPrice) return
    if (tickerError) {
      toast({ title: "Invalid Ticker", description: tickerError, variant: "destructive" })
      return
    }

    const qty = parseFloat(quantity)
    const price = parseFloat(buyPrice)
    if (qty <= 0) {
      toast({ title: "Invalid Quantity", description: "Quantity must be greater than 0.", variant: "destructive" })
      return
    }
    if (price < 0) {
      toast({ title: "Invalid Price", description: "Buy price cannot be negative.", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      await onAdd({
        ticker: ticker.toUpperCase(),
        quantity: qty,
        buy_price: price,
        asset_type: assetType,
      })
      setOpen(false)
      setTicker("")
      setQuantity("")
      setBuyPrice("")
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="icon" className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105 z-50">
          <Plus className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="border-border/50 bg-background/95 backdrop-blur-xl sm:max-w-md flex flex-col gap-6">
        <SheetHeader>
          <SheetTitle className="text-2xl font-semibold tracking-tight">Add Position</SheetTitle>
          <SheetDescription>
            Enter the details of your new investment to track it in your portfolio.
          </SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-5 flex-1">
          <div className="space-y-2">
            <label className="text-sm font-medium">Asset Type</label>
            <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
              <SelectTrigger className="bg-card">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock">Stock</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="mutualfund">Mutual Fund</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Ticker Symbol</label>
            <Input
              placeholder="e.g. AAPL"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              className={`uppercase bg-card ${tickerError ? 'border-destructive' : ''}`}
            />
            {tickerError && <p className="text-xs text-destructive">{tickerError}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="bg-card tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Buy Price</label>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                className="bg-card tabular-nums"
              />
            </div>
          </div>
          
          <Button type="submit" disabled={loading} className="w-full h-11 text-base font-medium mt-4">
            {loading ? "Adding..." : "Add to Portfolio"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

```

### frontend/src/components/ui/alert-dialog.tsx
```tsx
import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }),
      "mt-2 sm:mt-0",
      className
    )}
    {...props}
  />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}

```

### frontend/src/components/ui/card.tsx
```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }

```

### frontend/src/components/ui/toaster.tsx
```tsx
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}

```

### frontend/src/components/ui/sheet.tsx
```tsx
import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
      {children}
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}

```

### frontend/src/components/ui/badge.tsx
```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }

```

### frontend/src/components/ui/table.tsx
```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}

```

### frontend/src/components/ui/button.tsx
```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

```

### frontend/src/components/ui/toast.tsx
```tsx
import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-1 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold [&+div]:text-xs", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}

```

### frontend/src/components/ui/select.tsx
```tsx
import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-[--radix-select-content-available-height] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-select-content-transform-origin]",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}

```

### frontend/src/components/ui/input.tsx
```tsx
import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

```

### frontend/src/components/ui/skeleton.tsx
```tsx
import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  )
}

export { Skeleton }

```

### frontend/src/lib/api.ts
```tsx
export type AssetType = "stock" | "crypto" | "mutualfund"

export interface Holding {
  ticker: string
  quantity: number
  buy_price: number
  asset_type: AssetType
}

const API_BASE = "http://localhost:8000"

async function handleResponse(res: Response) {
  if (!res.ok) {
    const errorBody = await res.text().catch(() => null)
    throw new Error(errorBody || `API Error: ${res.statusText}`)
  }
  return res.json()
}

export async function fetchPortfolio(): Promise<Holding[]> {
  const res = await fetch(`${API_BASE}/portfolio`)
  return handleResponse(res)
}

export async function submitPortfolio(portfolio: Holding[]): Promise<Holding[]> {
  const res = await fetch(`${API_BASE}/portfolio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(portfolio)
  })
  return handleResponse(res)
}

export async function loadSamplePortfolio(type: "tech" | "balanced"): Promise<Holding[]> {
  const res = await fetch(`${API_BASE}/portfolio/sample/${type}`, {
    method: "POST"
  })
  return handleResponse(res)
}

export async function resetPortfolio(): Promise<Holding[]> {
  const res = await fetch(`${API_BASE}/portfolio`, {
    method: "DELETE"
  })
  return handleResponse(res)
}

```

### frontend/src/App.tsx
```tsx
import React from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { PortfolioManager } from './components/PortfolioManager'
import { Landing } from './pages/Landing'
import { Toaster } from "@/components/ui/toaster"

function AnimatedRoutes() {
  const location = useLocation()
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Landing />
          </motion.div>
        } />
        <Route path="/dashboard" element={
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="min-h-screen bg-background font-sans selection:bg-primary/30 relative overflow-hidden text-foreground">
              <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none mix-blend-screen" />
              <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[150px] -z-10 pointer-events-none mix-blend-screen" />
              <PortfolioManager />
            </div>
          </motion.div>
        } />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
      <Toaster />
    </BrowserRouter>
  )
}

export default App

```

### frontend/src/main.tsx
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

```

### frontend/tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsla(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

```

### frontend/src/index.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 225 13% 4%; /* #0A0B0D */
    --foreground: 210 40% 98%;
    --card: 226 10% 8%; /* Slightly lighter */
    --card-foreground: 210 40% 98%;
    --popover: 226 10% 8%;
    --popover-foreground: 210 40% 98%;
    /* Teal #2DD4BF Accent for primary */
    --primary: 172 66% 50%;
    --primary-foreground: 222.2 47.4% 11.2%;
    /* Soft violet #A78BFA for secondary/AI */
    --secondary: 255 92% 76%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    /* Red #F87171 for destructive */
    --destructive: 0 93% 71%;
    --destructive-foreground: 222.2 47.4% 11.2%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 172 66% 50%;
    --radius: 1rem; /* rounded-2xl roughly */
  }

  .dark {
    --background: 225 13% 4%; /* #0A0B0D */
    --foreground: 210 40% 98%;
    --card: 226 10% 8%;
    --card-foreground: 210 40% 98%;
    --popover: 226 10% 8%;
    --popover-foreground: 210 40% 98%;
    --primary: 172 66% 50%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 255 92% 76%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 93% 71%;
    --destructive-foreground: 222.2 47.4% 11.2%;
    --border: 0 0% 100% 0.1; /* 1px low opacity white */
    --input: 217.2 32.6% 17.5%;
    --ring: 172 66% 50%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground font-sans tracking-wide;
  }
  .tabular-nums {
    font-variant-numeric: tabular-nums;
  }
}

```

## 4. Config Files

### frontend/package.json
```json
{
  "name": "frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "oxlint",
    "preview": "vite preview"
  },
  "dependencies": {
    "@radix-ui/react-alert-dialog": "^1.1.23",
    "@radix-ui/react-dialog": "^1.1.23",
    "@radix-ui/react-icons": "^1.3.2",
    "@radix-ui/react-select": "^2.3.7",
    "@radix-ui/react-slot": "^1.3.3",
    "@radix-ui/react-toast": "^1.2.23",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "framer-motion": "^13.3.0",
    "lucide-react": "^1.46.0",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "react-router-dom": "^7.18.4",
    "recharts": "^3.10.1",
    "tailwind-merge": "^3.7.0"
  },
  "devDependencies": {
    "@types/node": "^24.13.5",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.7",
    "@vitejs/plugin-react": "^6.1.1",
    "autoprefixer": "^10.6.1",
    "oxlint": "^1.81.0",
    "postcss": "^8.5.28",
    "tailwindcss": "^3.4.19",
    "tailwindcss-animate": "^1.0.7",
    "typescript": "~6.0.2",
    "vite": "^8.3.0"
  }
}

```

### backend/requirements.txt
```text
fastapi
uvicorn[standard]
pydantic
yfinance
pandas
numpy
google-genai

```

## 5. Environment Files

No `.env.example` file found in the project root.

## 6. Known Issues / TODOs

- **Mock Data Sync**: The historical chart assumes mock prices perfectly align with live data. More robust date-alignment should be added for mixing live and mock data.
- **Database Persistence**: Currently using an in-memory dictionary store for the demo. A persistent DB (e.g., PostgreSQL or SQLite) is required for production.
- **Authentication**: No user auth system exists. Portfolios are currently global across the session.
- **Deployment**: Need Dockerfiles and a CI/CD pipeline setup for staging/production environments.
- **Unit Tests**: Test coverage is currently absent for the financial mathematical formulas and API endpoints.
