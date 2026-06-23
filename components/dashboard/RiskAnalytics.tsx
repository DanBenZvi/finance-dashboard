"use client";
import React, { useMemo } from "react";
import { Shield, TrendingUp, TrendingDown, AlertTriangle, Activity, Target, Lightbulb, BarChart2 } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { computeAnalytics } from "@/lib/analysis";
import { HistoryItem, PortfolioItem, EconomicIndicators } from "@/lib/google-sheets";

interface Props {
  history: HistoryItem[];
  portfolio: PortfolioItem[];
  indicators: EconomicIndicators;
}

function HealthGauge({ score, label, color }: { score: number; label: string; color: string }) {
  const R = 36;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - score / 100);
  const glowColor = color === "emerald" ? "#10b981" : color === "green" ? "#22c55e" : color === "amber" ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={R} fill="none" stroke="currentColor" className="text-muted" strokeWidth="5" />
          <circle
            cx="40" cy="40" r={R}
            fill="none"
            stroke={glowColor}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)",
              filter: `drop-shadow(0 0 6px ${glowColor}90)`,
            }}
          />
        </svg>
        <div className="text-center z-10">
          <p className="text-2xl font-black" style={{ color: glowColor, textShadow: `0 0 12px ${glowColor}60` }}>
            {score}
          </p>
          <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">/100</p>
        </div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: glowColor }}>{label}</p>
    </div>
  );
}

function StatCard({
  label, value, sub, color, icon,
}: {
  label: string; value: string; sub: string;
  color: "emerald" | "amber" | "rose" | "indigo";
  icon: React.ReactNode;
}) {
  const palette = {
    emerald: { text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    amber:   { text: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20"   },
    rose:    { text: "text-rose-400",     bg: "bg-rose-500/10",     border: "border-rose-500/20"     },
    indigo:  { text: "text-indigo-400",  bg: "bg-indigo-500/10",  border: "border-indigo-500/20"  },
  }[color];

  return (
    <div className={cn("rounded-xl p-4 border space-y-2", palette.bg, palette.border)}>
      <div className={cn("inline-flex p-1.5 rounded-lg bg-background/40", palette.text)}>{icon}</div>
      <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
      <p className={cn("text-xl font-black italic", palette.text)}>{value}</p>
      <p className="text-[9px] text-muted-foreground font-medium leading-tight">{sub}</p>
    </div>
  );
}

export function RiskAnalytics({ history, portfolio, indicators }: Props) {
  const a = useMemo(
    () => computeAnalytics(history, portfolio, indicators.israelInterest || 4.5),
    [history, portfolio, indicators.israelInterest]
  );

  const sharpeColor = a.sharpeRatio >= 1.5 ? "emerald" : a.sharpeRatio >= 0 ? "amber" : "rose";
  const ddColor     = a.maxDrawdown < 10 ? "emerald" : a.maxDrawdown < 25 ? "amber" : "rose";
  const volColor    = a.volatility  < 15 ? "emerald" : a.volatility  < 30 ? "amber" : "rose";
  const winColor    = a.winRate     >= 55 ? "emerald" : a.winRate     >= 45 ? "amber" : "rose";

  return (
    <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl shadow-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
          <Shield className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Portfolio Analytics</h3>
          <p className="text-[9px] text-muted-foreground uppercase tracking-[0.2em]">Risk-Adjusted Performance</p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Health gauge */}
        <div className="col-span-2 md:col-span-1 flex items-center justify-center bg-muted/20 rounded-xl border border-border p-4">
          <HealthGauge score={a.healthScore} label={a.healthLabel} color={a.healthColor} />
        </div>

        <StatCard
          label="Total Return"
          value={`${a.totalReturn >= 0 ? "+" : ""}${a.totalReturn.toFixed(2)}%`}
          sub={`${formatCurrency(a.unrealizedPL)} unrealized P&L`}
          color={a.totalReturn >= 0 ? "emerald" : "rose"}
          icon={a.totalReturn >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        />

        <StatCard
          label="Sharpe Ratio"
          value={a.sharpeRatio.toFixed(2)}
          sub="Risk-adjusted return vs rate"
          color={sharpeColor as "emerald" | "amber" | "rose"}
          icon={<Target className="h-4 w-4" />}
        />

        <StatCard
          label="Max Drawdown"
          value={`-${a.maxDrawdown.toFixed(1)}%`}
          sub="Worst peak-to-trough"
          color={ddColor as "emerald" | "amber" | "rose"}
          icon={<AlertTriangle className="h-4 w-4" />}
        />

        <StatCard
          label="Volatility"
          value={`${a.volatility.toFixed(1)}%`}
          sub="Annualized std deviation"
          color={volColor as "emerald" | "amber" | "rose"}
          icon={<Activity className="h-4 w-4" />}
        />

        <StatCard
          label="Win Rate"
          value={`${a.winRate.toFixed(0)}%`}
          sub={`${history.length} trading days tracked`}
          color={winColor as "emerald" | "amber" | "rose"}
          icon={<BarChart2 className="h-4 w-4" />}
        />
      </div>

      {/* Best / Worst + Insights */}
      <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-border">
        {/* Performers */}
        <div className="space-y-2">
          {a.bestPerformer && (
            <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
              <TrendingUp className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Best Performer</p>
                <p className="text-sm font-black text-foreground">{a.bestPerformer.ticker}</p>
                <p className="text-[10px] font-bold text-emerald-400">
                  {a.bestPerformer.return >= 0 ? "+" : ""}{a.bestPerformer.return.toFixed(2)}%
                </p>
              </div>
            </div>
          )}
          {a.worstPerformer && a.worstPerformer.ticker !== a.bestPerformer?.ticker && (
            <div className="flex items-center gap-3 bg-rose-500/5 border border-rose-500/10 rounded-xl p-3">
              <TrendingDown className="h-5 w-5 text-rose-400 shrink-0" />
              <div>
                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Worst Performer</p>
                <p className="text-sm font-black text-foreground">{a.worstPerformer.ticker}</p>
                <p className="text-[10px] font-bold text-rose-400">
                  {a.worstPerformer.return.toFixed(2)}%
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Insights */}
        {a.generatedInsights.length > 0 && (
          <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="h-4 w-4 text-indigo-400" />
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Portfolio Insights</p>
            </div>
            <ul className="space-y-1.5">
              {a.generatedInsights.slice(0, 3).map((insight, i) => (
                <li key={i} className="text-[10px] text-muted-foreground font-medium leading-relaxed flex gap-2">
                  <span className="text-indigo-400 shrink-0 mt-0.5">›</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
