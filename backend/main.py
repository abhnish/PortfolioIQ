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
