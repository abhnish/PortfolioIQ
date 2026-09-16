from backend.models.holding import Portfolio

# In-memory store
portfolio_data: Portfolio = []

def get_portfolio() -> Portfolio:
    return portfolio_data

def set_portfolio(new_portfolio: Portfolio):
    global portfolio_data
    portfolio_data = new_portfolio
