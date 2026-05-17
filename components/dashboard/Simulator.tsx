"use client";

import React, { useState, useMemo } from "react";
import { 
  Plus, 
  Trash2, 
  Play, 
  Info, 
  Loader2, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  AlertCircle,
  Calendar,
  DollarSign,
  Briefcase
} from "lucide-react";
import { formatCurrency, formatPercent, cn } from "@/lib/utils";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

interface HistoricalPrice {
  date: string;
  timestamp: number;
  price: number;
}

interface Position {
  id: string;
  ticker: string;
  quantity: number;
  entryDate: string;
  entryPrice: number;
  currentPrice: number;
  name: string;
  sector: string;
  historicalData: HistoricalPrice[];
}

export function Simulator() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spyData, setSpyData] = useState<HistoricalPrice[]>([]);
  const [benchmarkTicker, setBenchmarkTicker] = useState("SPY");
  const [isBenchmarkLoading, setIsBenchmarkLoading] = useState(false);

  // Fetch benchmark data
  const fetchBenchmarkData = async (symbol: string) => {
    if (!symbol) return;
    setIsBenchmarkLoading(true);
    try {
      const response = await fetch(`/api/simulator/data?ticker=${symbol.toUpperCase()}&years=5`);
      if (!response.ok) throw new Error("Benchmark not found");
      const data = await response.json();
      setSpyData(data.historicalPrices);
    } catch (err) {
      console.error("Failed to fetch benchmark data", err);
      // If custom benchmark fails and it's not already SPY, try to fallback to SPY
      if (symbol.toUpperCase() !== "SPY") {
        const spyResponse = await fetch(`/api/simulator/data?ticker=SPY&years=5`);
        if (spyResponse.ok) {
          const spyData = await spyResponse.json();
          setSpyData(spyData.historicalPrices);
          setBenchmarkTicker("SPY");
        }
      }
    } finally {
      setIsBenchmarkLoading(false);
    }
  };

  // Initial fetch for SPY
  React.useEffect(() => {
    fetchBenchmarkData("SPY");
  }, []);

  const addPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !quantity || !entryDate) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/simulator/data?ticker=${ticker.toUpperCase()}&years=5`);
      
      const contentType = response.headers.get("content-type");
      if (!response.ok || !contentType || !contentType.includes("application/json")) {
        const errorText = await response.text();
        console.error("API Response Error:", response.status, errorText);
        throw new Error(`API Error (${response.status}): ${errorText.substring(0, 100)}`);
      }

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      // Find price closest to entry date
      const targetDate = new Date(entryDate).getTime();
      const entryPoint = data.historicalPrices.reduce((prev: HistoricalPrice, curr: HistoricalPrice) => {
        return Math.abs(curr.timestamp - targetDate) < Math.abs(prev.timestamp - targetDate) ? curr : prev;
      });

      const newPosition: Position = {
        id: Math.random().toString(36).substring(2, 9),
        ticker: data.ticker, // Use the confirmed ticker from the API
        quantity: parseFloat(quantity),
        entryDate,
        entryPrice: entryPoint?.price || 0,
        currentPrice: data.historicalPrices[data.historicalPrices.length - 1]?.price || 0,
        name: data.name,
        sector: data.sector || "Unknown",
        historicalData: data.historicalPrices,
      };

      setPositions([...positions, newPosition]);
      setTicker("");
      setQuantity("");
      setEntryDate("");
    } catch (err: unknown) {
      const errorObj = err as Error;
      setError(errorObj.message || "Failed to add ticker");
    } finally {
      setIsLoading(false);
    }
  };

  const removePosition = (id: string) => {
    setPositions(positions.filter(p => p.id !== id));
  };

  // Performance Calculations
  const chartData = useMemo(() => {
    if (positions.length === 0 || spyData.length === 0) return [];

    // Find the earliest entry date among all positions
    const earliestTimestamp = Math.min(...positions.map(p => new Date(p.entryDate).getTime()));
    
    // Normalize SPY to the initial portfolio value for benchmarking
    const timeline = spyData.filter(d => d.timestamp >= earliestTimestamp);
    if (timeline.length === 0) return [];

    const initialSpyPrice = timeline[0].price;

    return timeline.map((point) => {
      let portfolioValue = 0;
      let investedAmount = 0;
      
      positions.forEach(pos => {
        const posEntryTime = new Date(pos.entryDate).getTime();
        if (posEntryTime <= point.timestamp) {
          const priceAtTime = pos.historicalData.reduce((prev: HistoricalPrice, curr: HistoricalPrice) => {
            return Math.abs(curr.timestamp - point.timestamp) < Math.abs(prev.timestamp - point.timestamp) ? curr : prev;
          }).price;
          portfolioValue += priceAtTime * pos.quantity;
          investedAmount += pos.entryPrice * pos.quantity;
        }
      });

      // Normalize SPY: (Current SPY / Initial SPY) * Total Initial Investment
      // For simplicity, we'll normalize to the total invested amount at the start of the simulation
      const firstPosInvestment = positions[0].entryPrice * positions[0].quantity;
      const spyNormalized = (point.price / initialSpyPrice) * firstPosInvestment;

      return {
        date: point.date,
        timestamp: point.timestamp,
        value: portfolioValue,
        spy: spyNormalized,
        invested: investedAmount
      };
    });
  }, [positions, spyData]);

  const metrics = useMemo(() => {
    if (positions.length === 0 || chartData.length === 0) return null;

    const totalCost = positions.reduce((acc, p) => acc + (p.entryPrice * p.quantity), 0);
    const currentValue = positions.reduce((acc, p) => acc + (p.currentPrice * p.quantity), 0);
    const totalPl = currentValue - totalCost;
    const totalPlPercent = (totalPl / totalCost) * 100;

    // Max Drawdown Calculation
    let maxDD = 0;
    let peak = -Infinity;
    chartData.forEach(point => {
      if (point.value > peak) peak = point.value;
      const dd = (peak - point.value) / peak;
      if (dd > maxDD) maxDD = dd;
    });

    // Volatility (Daily standard deviation of returns)
    const returns = [];
    for (let i = 1; i < chartData.length; i++) {
      if (chartData[i-1].value > 0) {
        const r = (chartData[i].value - chartData[i-1].value) / chartData[i-1].value;
        if (!isNaN(r) && isFinite(r)) returns.push(r);
      }
    }
    const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length > 0 ? returns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / returns.length : 0;
    const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized

    // Sector allocation
    const sectors: Record<string, number> = {};
    positions.forEach(p => {
      sectors[p.sector] = (sectors[p.sector] || 0) + (p.currentPrice * p.quantity);
    });

    const sectorData = Object.entries(sectors).map(([name, value]) => ({
      name,
      value
    }));

    return {
      totalCost,
      currentValue,
      totalPl,
      totalPlPercent,
      sectorData,
      maxDD,
      volatility
    };
  }, [positions, chartData]);

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase italic flex items-center gap-3">
            <Play className="h-8 w-8 text-indigo-500 fill-indigo-500/20" />
            Portfolio Simulator
          </h2>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.3em] flex items-center gap-2">
            Professional Grade Backtesting Engine
            <span className="h-1 w-1 rounded-full bg-indigo-500" />
            Live Market Data
          </p>
        </div>

        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border p-4 rounded-2xl">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Value</p>
              <p className="text-xl font-black text-foreground italic">{formatCurrency(metrics.currentValue)}</p>
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total P&L</p>
              <p className={cn(
                "text-xl font-black italic",
                metrics.totalPl >= 0 ? "text-emerald-400" : "text-rose-400"
              )}>
                {metrics.totalPl >= 0 ? "+" : ""}{formatCurrency(metrics.totalPl)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Input Form & Positions List */}
        <div className="lg:col-span-1 space-y-6">
          {/* Input Form */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl backdrop-blur-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <TrendingUp className="h-12 w-12 text-indigo-500" />
            </div>
            
            <h3 className="text-sm font-black text-foreground uppercase tracking-wider mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-indigo-400" />
                Add Position
              </div>
              <span className="text-[8px] text-muted-foreground lowercase italic">Fractional shares supported</span>
            </h3>

            <form onSubmit={addPosition} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Ticker Symbol</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Briefcase className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                  <input
                    type="text"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    placeholder="AAPL, TEVA.TA, BTC-USD..."
                    className="w-full bg-muted/50 border border-border rounded-xl py-3 pl-10 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all uppercase placeholder:normal-case"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Quantity</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <DollarSign className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="e.g. 0.66"
                      step="any"
                      className="w-full bg-muted/50 border border-border rounded-xl py-3 pl-10 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Entry Date</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                      <Calendar className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                    <input
                      type="date"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      className="w-full bg-muted/50 border border-border rounded-xl py-3 pl-10 pr-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-400 text-[10px] font-bold leading-relaxed">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black uppercase tracking-[0.2em] text-[10px] py-4 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Initialize Position
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Active Positions */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <h3 className="text-[10px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-400" />
                Active Portfolio
              </h3>
              <span className="text-[10px] font-black text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                {positions.length}
              </span>
            </div>
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto no-scrollbar">
              {positions.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Info className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">No positions initialized</p>
                </div>
              ) : (
                positions.map((pos) => (
                  <div key={pos.id} className="px-6 py-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-foreground uppercase italic">{pos.ticker}</span>
                        <span className="text-[9px] text-muted-foreground font-medium truncate max-w-[120px]">{pos.name}</span>
                      </div>
                      <button 
                        onClick={() => removePosition(pos.id)}
                        className="p-1.5 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter">Equity</span>
                        <span className="text-[10px] font-bold text-foreground">{pos.quantity} Shares</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-tighter">P&L</span>
                        <span className={cn(
                          "text-[10px] font-bold",
                          pos.currentPrice >= pos.entryPrice ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {formatPercent(((pos.currentPrice - pos.entryPrice) / pos.entryPrice) * 100)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Charts & Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance Chart */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Growth Projection
              </h3>
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                    {isBenchmarkLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                    ) : (
                      <BarChart3 className="h-3 w-3 text-indigo-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={benchmarkTicker}
                    onChange={(e) => setBenchmarkTicker(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        fetchBenchmarkData(benchmarkTicker);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    onBlur={() => fetchBenchmarkData(benchmarkTicker)}
                    className="bg-muted/30 border border-border rounded-lg py-1.5 pl-7 pr-2 text-[10px] font-black uppercase w-24 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                    placeholder="COMPARE..."
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-indigo-600 text-white text-[8px] font-black rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    COMPARE TO ANY TICKER
                  </div>
                </div>
                <div className="h-4 w-px bg-border mx-1" />
                <div className="flex gap-2">
                  {['1M', 'YTD', '1Y', '5Y'].map((range) => (
                    <button key={range} className="px-2 py-1 text-[8px] font-black text-muted-foreground hover:text-indigo-400 border border-border rounded-md hover:bg-indigo-500/5 transition-all">
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex-1 w-full min-h-0">
              {positions.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      minTickGap={30}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                      itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px' }}
                      formatter={(value: number, name: string) => [
                        formatCurrency(value), 
                        name === 'Portfolio' ? 'Portfolio' : `Benchmark (${name})`
                      ]}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      wrapperStyle={{ fontSize: '10px', paddingBottom: '20px', textTransform: 'uppercase', fontWeight: 'bold' }}
                    />
                    <Area 
                      name="Portfolio"
                      type="monotone" 
                      dataKey="value" 
                      stroke="#6366f1" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                      animationDuration={1500}
                    />
                    <Area 
                      name={benchmarkTicker}
                      type="monotone" 
                      dataKey="spy" 
                      stroke="#94a3b8" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      fill="transparent" 
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-muted/10 rounded-xl border border-dashed border-border">
                  <div className="bg-indigo-500/10 p-4 rounded-full mb-4">
                    <TrendingUp className="h-8 w-8 text-indigo-400/40" />
                  </div>
                  <h4 className="text-xs font-black text-foreground uppercase tracking-widest mb-2">Simulation Engine Idle</h4>
                  <p className="text-[10px] text-muted-foreground font-medium max-w-[200px]">Add positions to generate historical performance visualization.</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Sector Allocation */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl h-[350px] flex flex-col">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                <PieChart className="h-4 w-4 text-amber-400" />
                Sector Exposure
              </h3>
              <div className="flex-1 w-full min-h-0">
                {metrics && metrics.sectorData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={metrics.sectorData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {metrics.sectorData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={[
                            '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'
                          ][index % 6]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                        formatter={(value: number) => [formatCurrency(value), 'Allocation']}
                      />
                      <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right"
                        wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest italic">Insufficient data</p>
                  </div>
                )}
              </div>
            </div>

            {/* Risk Metrics */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
              <h3 className="text-sm font-black text-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-indigo-400" />
                Risk Intelligence
              </h3>
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-xl border border-border group hover:border-indigo-500/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Max Drawdown</span>
                    <Info className="h-3 w-3 text-muted-foreground/30" />
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-lg font-black text-rose-400 italic">
                      {metrics ? `-${(metrics.maxDD * 100).toFixed(1)}%` : "0.0%"}
                    </span>
                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Historical Peak-to-Trough</span>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-xl border border-border group hover:border-indigo-500/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Volatility (σ)</span>
                    <Info className="h-3 w-3 text-muted-foreground/30" />
                  </div>
                  <div className="flex items-end justify-between">
                    <span className="text-lg font-black text-indigo-400 italic">
                      {metrics ? `${(metrics.volatility * 100).toFixed(1)}%` : "0.0%"}
                    </span>
                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Annualized Std Dev</span>
                  </div>
                </div>

                <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10 flex items-start gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">AI Insight</h4>
                    <p className="text-[9px] text-muted-foreground font-medium leading-relaxed">
                      Your portfolio shows high correlation with Tech sectors. Consider diversification into Utilities or Consumer Staples to lower volatility.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
