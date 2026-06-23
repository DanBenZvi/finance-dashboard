"use client";
import React, { useEffect, useState } from "react";
import { Globe, Zap, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { PortfolioItem } from "@/lib/google-sheets";
import { DailyBriefing } from "@/components/dashboard/DailyBriefing";

interface NewsItem {
  uuid: string;
  title: string;
  publisher: string;
  relatedTickers: string[];
}

interface MarketQuote {
  ticker: string;
  name: string;
  price: number;
  change: number;
}

interface Props {
  portfolio: PortfolioItem[];
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted/50", className)} />;
}

export function Intelligence({ portfolio }: Props) {
  const [news, setNews]         = useState<NewsItem[]>([]);
  const [sectors, setSectors]   = useState<MarketQuote[]>([]);
  const [macro, setMacro]       = useState<MarketQuote[]>([]);
  const [trending, setTrending] = useState<string[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [oppsLoading, setOppsLoading] = useState(true);
  const [oppsError, setOppsError]     = useState(false);
  const [refreshKey, setRefreshKey]   = useState(0);

  const tickers = portfolio
    .sort((a, b) => b.aumUsd - a.aumUsd)
    .slice(0, 8)
    .map(p => p.ticker)
    .join(",");

  useEffect(() => {
    setNewsLoading(true);
    fetch(`/api/news?tickers=${encodeURIComponent(tickers)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setNews(d.news ?? []); setNewsLoading(false); })
      .catch(() => setNewsLoading(false));
  }, [tickers, refreshKey]);

  useEffect(() => {
    setOppsLoading(true);
    setOppsError(false);
    fetch("/api/opportunities")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        setSectors(d.sectors ?? []);
        setMacro(d.macro ?? []);
        setTrending((d.trending ?? []).map((t: { symbol: string }) => t.symbol));
        setOppsLoading(false);
      })
      .catch(() => { setOppsError(true); setOppsLoading(false); });
  }, [refreshKey]);

  const topSector   = sectors[0];
  const worstSector = sectors[sectors.length - 1];
  const totalPortfolio = portfolio.reduce((s, p) => s + p.aumUsd, 0);

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="h-6 w-6 text-indigo-400" />
          <div>
            <h2 className="text-xl font-black text-foreground tracking-tighter uppercase">World Intelligence</h2>
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.25em]">Live market context · AI briefing</p>
          </div>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted border border-border rounded-xl px-3 py-2 transition-all"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {/* Daily AI Briefing */}
      <DailyBriefing
        portfolio={portfolio}
        headlines={news}
        newsLoading={newsLoading}
      />

      {/* Macro Pulse */}
      <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl px-6 py-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 mb-3">
          <Zap className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.25em]">Macro Pulse</span>
        </div>
        {oppsLoading ? (
          <div className="flex gap-6">{[...Array(7)].map((_, i) => <Skeleton key={i} className="h-10 w-16 shrink-0" />)}</div>
        ) : (
          <div className="flex items-center gap-6 min-w-max">
            {macro.map(m => (
              <div key={m.ticker} className="flex flex-col items-center shrink-0">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wide">{m.ticker.replace("^", "")}</span>
                <span className="text-sm font-black text-foreground tabular-nums">{m.price.toFixed(2)}</span>
                <span className={cn("text-[10px] font-black tabular-nums", m.change >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {m.change >= 0 ? "+" : ""}{m.change.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sectors + Portfolio side by side */}
      <div className="grid sm:grid-cols-2 gap-6">

        {/* Sector Performance */}
        <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-5 space-y-4">
          <h3 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.25em] flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            US Sector Performance
          </h3>
          {oppsLoading ? (
            <div className="space-y-2">{[...Array(7)].map((_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
          ) : oppsError ? (
            <p className="text-[10px] text-rose-400">Unavailable</p>
          ) : (
            <div className="space-y-2.5">
              {sectors.map(s => (
                <div key={s.ticker} className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-muted-foreground w-24 shrink-0 truncate">{s.name}</span>
                  <div className="flex-1 bg-muted/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", s.change >= 0 ? "bg-emerald-500" : "bg-rose-500")}
                      style={{ width: `${Math.min(Math.abs(s.change) * 8, 100)}%` }}
                    />
                  </div>
                  <span className={cn("text-[9px] font-black w-11 text-right shrink-0 tabular-nums", s.change >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {s.change >= 0 ? "+" : ""}{s.change.toFixed(2)}%
                  </span>
                </div>
              ))}
              {topSector && worstSector && (
                <div className="pt-2 border-t border-border/50 space-y-1">
                  <p className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> {topSector.name} leads
                  </p>
                  <p className="text-[9px] text-rose-400 font-bold flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" /> {worstSector.name} lags
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Portfolio Exposure + Trending */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-500/15 rounded-2xl p-5 space-y-3">
            <h3 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.25em] flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" />
              Your Exposure
            </h3>
            <div className="space-y-2">
              {[...portfolio]
                .sort((a, b) => b.aumUsd - a.aumUsd)
                .slice(0, 7)
                .map(p => {
                  const pct = totalPortfolio > 0 ? (p.aumUsd / totalPortfolio) * 100 : 0;
                  const isUp = p.dailyChangePercent >= 0;
                  return (
                    <div key={p.ticker} className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-foreground w-14 shrink-0">{p.ticker}</span>
                      <div className="flex-1 bg-muted/50 rounded-full h-1.5 overflow-hidden">
                        <div className={cn("h-full rounded-full", isUp ? "bg-indigo-500" : "bg-rose-500/70")} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={cn("text-[9px] font-black w-10 text-right shrink-0 tabular-nums", isUp ? "text-emerald-400" : "text-rose-400")}>
                        {p.dailyChangePercent >= 0 ? "+" : ""}{p.dailyChangePercent.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {!oppsLoading && trending.length > 0 && (
            <div className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-5 space-y-3">
              <h3 className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.25em] flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                Trending Now
              </h3>
              <div className="flex flex-wrap gap-2">
                {trending.map(sym => (
                  <span key={sym} className="text-[10px] font-black bg-muted/50 border border-border hover:border-indigo-500/30 hover:bg-indigo-500/5 text-foreground px-2.5 py-1 rounded-lg transition-all cursor-default">
                    {sym}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
