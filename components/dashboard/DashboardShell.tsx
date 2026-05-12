"use client";

import React, { useState } from "react";
import { PortfolioOverview } from "@/components/dashboard/PortfolioOverview";
import { AumChart } from "@/components/dashboard/AumChart";
import { MarketWatch } from "@/components/dashboard/MarketWatch";
import { Header } from "@/components/dashboard/Header";
import { AllocationChart } from "@/components/dashboard/AllocationChart";
import { LayoutDashboard, TrendingUp, Globe } from "lucide-react";

interface DashboardShellProps {
  data: any;
}

export function DashboardShell({ data }: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<"portfolio" | "marketwatch">("portfolio");

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-indigo-500/30">
      <div className="mx-auto max-w-[1600px] px-6 py-8 md:px-10 space-y-10">
        <Header indicators={data.indicators} />

        {/* Navigation Tabs */}
        <div className="flex items-center justify-center sm:justify-start">
          <nav className="flex p-1 bg-card border border-border rounded-xl shadow-inner backdrop-blur-md text-nowrap overflow-x-auto">
            <button
              onClick={() => setActiveTab("portfolio")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-200 ${
                activeTab === "portfolio"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Portfolio Overview
            </button>
            <button
              onClick={() => setActiveTab("marketwatch")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-200 ${
                activeTab === "marketwatch"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Globe className="h-4 w-4" />
              Market Watch
            </button>
          </nav>
        </div>

        <main className="animate-in fade-in duration-500">
          {activeTab === "portfolio" ? (
            <div className="space-y-10">
              {/* Stats & Donut Grid */}
              <div className="grid gap-8 lg:grid-cols-4 items-start">
                <div className="lg:col-span-3">
                  <PortfolioOverview portfolio={data.portfolio} />
                </div>
                <div className="lg:col-span-1 sticky top-8 h-fit">
                  <AllocationChart portfolio={data.portfolio} />
                </div>
              </div>

              {/* History Chart */}
              <section className="bg-gradient-to-br from-card to-muted border border-border rounded-2xl p-2 shadow-xl">
                <AumChart history={data.history} />
              </section>
            </div>
          ) : (
            <div className="max-w-[1200px] mx-auto space-y-6">
              <div className="flex items-center justify-between px-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase italic italic">Market Watch</h2>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Active Global Asset Monitoring</p>
                </div>
                <div className="bg-emerald-500/10 p-3 rounded-full border border-emerald-500/20">
                  <TrendingUp className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
              <div className="animate-in slide-in-from-bottom-4 duration-700">
                <MarketWatch items={data.marketWatch} />
              </div>
            </div>
          )}
        </main>

        <footer className="pt-10 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-6 text-muted-foreground">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <p className="text-[10px] font-black uppercase tracking-widest italic text-muted-foreground">Secure Service Connection • Live</p>
          </div>
          <div className="flex items-center gap-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">v2.5.0 Premium OS</p>
            <p className="text-[10px] font-black uppercase tracking-widest">© {new Date().getFullYear()} Financial OS</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
