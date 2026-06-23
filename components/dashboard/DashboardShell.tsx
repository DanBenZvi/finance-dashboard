"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { PortfolioOverview } from "@/components/dashboard/PortfolioOverview";
import { AumChart } from "@/components/dashboard/AumChart";
import { PortfolioPerformanceChart } from "@/components/dashboard/PortfolioPerformanceChart";
import { MarketWatch } from "@/components/dashboard/MarketWatch";
import { Simulator } from "@/components/dashboard/Simulator";
import { Header } from "@/components/dashboard/Header";
import { AllocationChart } from "@/components/dashboard/AllocationChart";
import { RiskAnalytics } from "@/components/dashboard/RiskAnalytics";
import { Intelligence } from "@/components/dashboard/Intelligence";
import { AIAnalysis } from "@/components/dashboard/AIAnalysis";
import { PortfolioItem, MarketWatchItem, HistoryItem, EconomicIndicators } from "@/lib/google-sheets";
import { LayoutDashboard, TrendingUp, Globe, Play } from "lucide-react";

// Lazy-load Three.js background — avoids SSR issues and keeps initial bundle lean
const ParticleBackground = dynamic(
  () => import("@/components/canvas/ParticleBackground").then(m => ({ default: m.ParticleBackground })),
  { ssr: false }
);

interface DashboardShellProps {
  data: {
    portfolio: PortfolioItem[];
    marketWatch: MarketWatchItem[];
    history: HistoryItem[];
    indicators: EconomicIndicators;
  };
}

type Tab = "portfolio" | "marketwatch" | "simulator" | "intelligence";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "portfolio",     label: "Portfolio",     icon: <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> },
  { id: "marketwatch",   label: "Market Watch",  icon: <TrendingUp       className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> },
  { id: "intelligence",  label: "Intelligence",  icon: <Globe            className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> },
  { id: "simulator",     label: "Simulator",     icon: <Play             className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> },
];

export function DashboardShell({ data }: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<Tab>("portfolio");

  const performanceData = useMemo(() => {
    return (data.history || []).map(item => ({
      date: new Date(item.timestamp).toISOString().split("T")[0],
      totalAum: item.aumUsd,
      investedCapital: item.totalInvestedUsd,
    }));
  }, [data.history]);

  return (
    <>
      {/* WebGL background — rendered outside main layout so it covers the full viewport */}
      <ParticleBackground />

      <div className="min-h-screen bg-background/90 text-foreground selection:bg-indigo-500/30 aurora">
        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 md:px-10 space-y-6 sm:space-y-10">
          <Header indicators={data.indicators} />

          {/* Navigation */}
          <div className="flex items-center justify-center sm:justify-start">
            <nav className="flex p-1 bg-card/70 backdrop-blur-xl border border-border rounded-xl shadow-inner text-nowrap overflow-x-auto no-scrollbar">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <main className="animate-in fade-in duration-500">
            {activeTab === "portfolio" && (
              <div className="space-y-6 sm:space-y-10">
                {/* Stats + Donut */}
                <div className="grid gap-6 lg:gap-8 lg:grid-cols-4 items-start">
                  <div className="lg:col-span-3">
                    <PortfolioOverview portfolio={data.portfolio} />
                  </div>
                  <div className="lg:col-span-1 lg:sticky lg:top-8 h-fit">
                    <AllocationChart portfolio={data.portfolio} />
                  </div>
                </div>

                {/* Risk Analytics */}
                <section className="animate-in slide-in-from-bottom-4 duration-700">
                  <RiskAnalytics
                    history={data.history}
                    portfolio={data.portfolio}
                    indicators={data.indicators}
                  />
                </section>

                {/* AI Analysis */}
                <section className="animate-in slide-in-from-bottom-4 duration-700">
                  <AIAnalysis
                    portfolio={data.portfolio}
                    history={data.history}
                    indicators={data.indicators}
                  />
                </section>

                {/* Performance Chart */}
                <section className="animate-in slide-in-from-bottom-4 duration-1000">
                  <PortfolioPerformanceChart data={performanceData} />
                </section>

                {/* AUM History */}
                <section className="bg-gradient-to-br from-card/80 to-muted/40 backdrop-blur-xl border border-border rounded-2xl p-2 shadow-xl">
                  <AumChart history={data.history} />
                </section>
              </div>
            )}

            {activeTab === "marketwatch" && (
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
            )}

            {activeTab === "intelligence" && (
              <div className="animate-in slide-in-from-bottom-4 duration-700">
                <Intelligence portfolio={data.portfolio} />
              </div>
            )}

            {activeTab === "simulator" && (
              <div className="animate-in slide-in-from-bottom-4 duration-700">
                <Simulator />
              </div>
            )}
          </main>

          <footer className="pt-6 sm:pt-10 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest italic text-muted-foreground text-center sm:text-left">
                Secure Service Connection • Live
              </p>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">v3.0.0 Premium OS</p>
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">© {new Date().getFullYear()} Financial OS</p>
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
