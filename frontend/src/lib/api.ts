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
