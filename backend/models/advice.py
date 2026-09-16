from pydantic import BaseModel
from backend.models.analysis import PortfolioAnalysis

class PortfolioAdvice(BaseModel):
    summary: str
    suggestions: list[str]
    based_on: PortfolioAnalysis
