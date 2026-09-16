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
