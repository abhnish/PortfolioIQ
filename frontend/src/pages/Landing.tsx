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
