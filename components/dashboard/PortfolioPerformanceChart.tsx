"use client";

import React, { useState, useMemo, useEffect } from "react";
import { HistoryItem } from "@/lib/google-sheets";
import { formatCurrency } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, AlertCircle } from "lucide-react";

interface PerformanceData {
  date: string;
  totalAum: number;
  investedCapital: number;
}

interface PortfolioPerformanceChartProps {
  data: PerformanceData[];
}

type Timeframe = "1 DAY" | "1 WEEK" | "1M" | "3M" | "1Y" | "ALL";

export function PortfolioPerformanceChart({ data }: PortfolioPerformanceChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1M");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { filteredData, periodChange, chartData } = useMemo(() => {
    if (!data || data.length === 0) {
      return { filteredData: [], periodChange: 0, chartData: [] };
    }

    // Process dates into timestamps for accurate filtering and sorting
    const processed = data.map(item => ({
      ...item,
      timestamp: new Date(item.date).getTime()
    })).sort((a, b) => a.timestamp - b.timestamp);

    const now = Date.now();
    let startTime = 0;

    if (timeframe === "1 DAY") {
      const lastTwo = processed.slice(-2);
      const start = lastTwo[0];
      const end = lastTwo[lastTwo.length - 1];
      
      let change = 0;
      if (start && end && start.totalAum > 0) {
        change = ((end.totalAum - end.investedCapital + start.investedCapital) - start.totalAum) / start.totalAum;
      }
      
      return { filteredData: lastTwo, periodChange: change * 100, chartData: lastTwo };
    }

    switch (timeframe) {
      case "1 WEEK": startTime = now - 7 * 24 * 60 * 60 * 1000; break;
      case "1M": startTime = now - 30 * 24 * 60 * 60 * 1000; break;
      case "3M": startTime = now - 90 * 24 * 60 * 60 * 1000; break;
      case "1Y": startTime = now - 365 * 24 * 60 * 60 * 1000; break;
      case "ALL": startTime = 0; break;
    }

    const filtered = timeframe === "ALL" 
      ? processed 
      : processed.filter(item => item.timestamp >= startTime);

    let change = 0;
    if (filtered.length >= 2) {
      const start = filtered[0];
      const end = filtered[filtered.length - 1];
      if (start.totalAum > 0) {
        change = ((end.totalAum - end.investedCapital + start.investedCapital) - start.totalAum) / start.totalAum;
      }
    }

    return { filteredData: filtered, periodChange: change * 100, chartData: filtered };
  }, [data, timeframe]);

  if (!data || data.length === 0) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
        <div className="space-y-3">
          <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-bold">No Performance Data</h3>
          <p className="text-sm text-muted-foreground">Historical data is required to render this chart.</p>
        </div>
      </div>
    );
  }

  const timeframes: Timeframe[] = ["1 DAY", "1 WEEK", "1M", "3M", "1Y", "ALL"];

  return (
    <div className="w-full space-y-4 rounded-2xl border border-border bg-card p-4 shadow-xl sm:p-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-black uppercase tracking-tight italic">Portfolio Performance</h3>
          </div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">AUM vs. Invested Capital</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* KPI Change Metric */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Period Change:</span>
            <span className={`text-sm font-black tabular-nums ${
              periodChange >= 0 ? "text-emerald-500" : "text-rose-500"
            }`}>
              {periodChange >= 0 ? "+" : ""}{periodChange.toFixed(2)}%
            </span>
          </div>

          {/* Selector */}
          <div className="flex gap-1 rounded-lg bg-muted p-1 border border-border">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`rounded px-2 py-1 text-[10px] font-black uppercase tracking-tighter transition-all ${
                  timeframe === tf
                    ? "bg-indigo-600 text-white shadow-md"
                    : "text-muted-foreground hover:bg-background hover:text-foreground"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-[350px] w-full sm:h-[400px]">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
                opacity={0.5}
              />
              <XAxis
                dataKey="timestamp"
                type="number"
                domain={["dataMin", "dataMax"]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontWeight: 700 }}
                tickFormatter={(ts) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                dy={10}
                minTickGap={30}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontWeight: 700 }}
                tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "12px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }}
                itemStyle={{ fontSize: "12px", fontWeight: "bold" }}
                labelStyle={{
                  color: "var(--muted-foreground)",
                  fontSize: "10px",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
                labelFormatter={(ts) => new Date(ts).toLocaleDateString("en-US", { 
                  month: "long", 
                  day: "numeric", 
                  year: "numeric" 
                })}
                cursor={{ stroke: "var(--primary)", strokeWidth: 1, strokeDasharray: "5 5" }}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                wrapperStyle={{ 
                  paddingBottom: "20px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em"
                }}
              />
              <Line
                name="Total AUM"
                type="monotone"
                dataKey="totalAum"
                stroke="#6366f1"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1500}
              />
              <Line
                name="Invested Capital"
                type="monotone"
                dataKey="investedCapital"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  );
}
