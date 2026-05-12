"use client";

import React, { useState, useMemo } from "react";
import { HistoryItem } from "@/lib/google-sheets";
import { formatCurrency } from "@/lib/utils";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { History } from "lucide-react";

interface AumChartProps {
  history: HistoryItem[];
}

type TimeRange = '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL';

export function AumChart({ history }: AumChartProps) {
  const [range, setRange] = useState<TimeRange>('ALL');

  // If no data, show an empty state to avoid a blank section
  if (!history || history.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <History className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold">No History Data</h3>
        <p className="text-sm text-muted-foreground max-w-[280px] mx-auto mt-2">
          Your "Daily History" sheet appears to be empty or formatted incorrectly.
        </p>
      </div>
    );
  }

  const { filteredHistory, rangePerformance } = useMemo(() => {
    let startTime = 0;
    const now = Date.now();

    if (range !== 'ALL') {
      switch (range) {
        case '1W':
          startTime = now - 7 * 24 * 60 * 60 * 1000;
          break;
        case '1M':
          startTime = now - 30 * 24 * 60 * 60 * 1000;
          break;
        case '3M':
          startTime = now - 90 * 24 * 60 * 60 * 1000;
          break;
        case 'YTD':
          startTime = new Date(new Date().getFullYear(), 0, 1).getTime();
          break;
        case '1Y':
          startTime = now - 365 * 24 * 60 * 60 * 1000;
          break;
      }
    }

    const filtered = range === 'ALL' 
      ? [...history].sort((a, b) => a.timestamp - b.timestamp)
      : history
          .filter(item => item.timestamp >= startTime)
          .sort((a, b) => a.timestamp - b.timestamp);

    let performance = 0;
    if (filtered.length >= 2) {
      const startVal = filtered[0].aumUsd;
      const endVal = filtered[filtered.length - 1].aumUsd;
      if (startVal > 0) {
        performance = ((endVal - startVal) / startVal) * 100;
      }
    }

    return { filteredHistory: filtered, rangePerformance: performance };
  }, [history, range]);

  // Calculate ticks for the X-axis based on the filtered data
  const ticks = useMemo(() => {
    if (filteredHistory.length === 0) return [];
    
    const start = filteredHistory[0].timestamp;
    const end = filteredHistory[filteredHistory.length - 1].timestamp;
    
    // Check if we're on mobile to reduce ticks and prevent overlap
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const count = isMobile ? 4 : 6; 
    
    const interval = (end - start) / (count - 1);
    
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(start + i * interval);
    }
    // Ensure the last date is accurate
    result[result.length - 1] = end;
    return result;
  }, [filteredHistory]);

  const ranges: TimeRange[] = ['1W', '1M', '3M', 'YTD', '1Y', 'ALL'];

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm w-full">
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h3 className="text-base sm:text-lg font-bold tracking-tight">Portfolio AUM History ($)</h3>
            </div>
            {filteredHistory.length >= 2 && (
              <div className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-black flex items-center gap-1 ${
                rangePerformance >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}>
                {rangePerformance >= 0 ? '↑' : '↓'}
                {Math.abs(rangePerformance).toFixed(2)}%
                <span className="opacity-60 font-medium ml-0.5 uppercase tracking-tighter text-[9px]">in {range}</span>
              </div>
            )}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Historical growth and capital appreciation</p>
        </div>
        
        <div className="flex p-0.5 sm:p-1 bg-muted/50 rounded-lg border border-border w-fit overflow-x-auto no-scrollbar">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-md text-[9px] sm:text-[10px] font-black transition-all ${
                range === r 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      
      <div className="h-[300px] sm:h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredHistory} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorAum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" strokeOpacity={0.1} />
            <XAxis 
              dataKey="timestamp" 
              type="number"
              domain={['dataMin', 'dataMax']}
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#888', fontSize: 9, fontWeight: 600 }}
              tickFormatter={(ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              ticks={ticks}
              dy={10}
              minTickGap={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#888', fontSize: 9, fontWeight: 600 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              width={40}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'var(--card)', 
                border: '1px solid var(--border)', 
                borderRadius: '12px',
                padding: '12px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
              }}
              itemStyle={{ color: 'var(--foreground)', fontSize: '12px', fontWeight: 'bold' }}
              labelStyle={{ color: 'var(--muted-foreground)', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              labelFormatter={(ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              formatter={(value: number) => [formatCurrency(value), 'TOTAL AUM']}
              cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '5 5' }}
            />
            <Area 
              type="monotone" 
              dataKey="aumUsd" 
              stroke="#3b82f6" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorAum)" 
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
