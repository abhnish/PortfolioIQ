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
                <div className="text-xs text-muted-foreground/70 mt-1">
                  Largest position: {(analysis.top_holding_concentration * 100).toFixed(1)}%
                </div>
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
                    {advice.suggestions.map((s: string, i: number) => (
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
