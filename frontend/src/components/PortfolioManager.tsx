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
