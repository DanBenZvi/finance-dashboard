"use client";

import React, { useState } from "react";
import { PortfolioOverview } from "@/components/dashboard/PortfolioOverview";
import { AumChart } from "@/components/dashboard/AumChart";
import { MarketWatch } from "@/components/dashboard/MarketWatch";
import { Simulator } from "@/components/dashboard/Simulator";
import { Header } from "@/components/dashboard/Header";
import { AllocationChart } from "@/components/dashboard/AllocationChart";
import { PortfolioItem, MarketWatchItem, HistoryItem, EconomicIndicators } from "@/lib/google-sheets";
import { LayoutDashboard, TrendingUp, Globe, Play } from "lucide-react";

interface DashboardShellProps {
  data: {
    portfolio: PortfolioItem[];
    marketWatch: MarketWatchItem[];
    history: HistoryItem[];
    indicators: EconomicIndicators;
  };
}

export function DashboardShell({ data }: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<"portfolio" | "marketwatch" | "simulator">("portfolio");

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-indigo-500/30">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 md:px-10 space-y-6 sm:space-y-10">
        <Header indicators={data.indicators} />

        {/* Navigation Tabs */}
        <div className="flex items-center justify-center sm:justify-start">
          <nav className="flex p-1 bg-card border border-border rounded-xl shadow-inner backdrop-blur-md text-nowrap overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab("portfolio")}
              className={`flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-200 ${
                activeTab === "portfolio"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Portfolio Overview
            </button>
            <button
              onClick={() => setActiveTab("marketwatch")}
              className={`flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-200 ${
                activeTab === "marketwatch"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Market Watch
            </button>
            <button
              onClick={() => setActiveTab("simulator")}
              className={`flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-200 ${
                activeTab === "simulator"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Simulator
            </button>
          </nav>
        </div>

        <main className="animate-in fade-in duration-500">
          {activeTab === "portfolio" ? (
            <div className="space-y-6 sm:space-y-10">
              {/* Stats & Donut Grid */}
              <div className="grid gap-6 lg:gap-8 lg:grid-cols-4 items-start">
                <div className="lg:col-span-3">
                  <PortfolioOverview portfolio={data.portfolio} />
                </div>
                <div className="lg:col-span-1 lg:sticky lg:top-8 h-fit">
                  <AllocationChart portfolio={data.portfolio} />
                </div>
              </div>

              {/* History Chart */}
              <section className="bg-gradient-to-br from-card to-muted border border-border rounded-2xl p-2 shadow-xl">
                <AumChart history={data.history} />
              </section>
            </div>
          ) : activeTab === "marketwatch" ? (
            <div className="max-w-[1200px] mx-auto space-y-6">
              <div className="flex items-center justify-between px-2 sm:px-4">
                <div className="space-y-0.5 sm:space-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tighter uppercase italic">Market Watch</h2>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Active Global Asset Monitoring</p>
                </div>
                <div className="bg-emerald-500/10 p-2 sm:p-3 rounded-full border border-emerald-500/20">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" />
                </div>
              </div>
              <div className="animate-in slide-in-from-bottom-4 duration-700">
                <MarketWatch items={data.marketWatch} />
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom-4 duration-700">
              <Simulator />
            </div>
          )}
        </main>

        <footer className="pt-6 sm:pt-10 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest italic text-muted-foreground text-center sm:text-left">Secure Service Connection • Live</p>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">v2.5.0 Premium OS</p>
            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">© {new Date().getFullYear()} Financial OS</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
