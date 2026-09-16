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
