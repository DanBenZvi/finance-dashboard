"use client";

import React from "react";
import { Moon, Sun, LayoutDashboard, Landmark, ArrowRightLeft } from "lucide-react";
import { useTheme } from "next-themes";
import { EconomicIndicators } from "@/lib/google-sheets";

interface HeaderProps {
  indicators?: EconomicIndicators;
}

export function Header({ indicators }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-8">
      <div className="flex items-center space-x-4">
        <div className="rounded-2xl bg-indigo-600 p-3 text-white shadow-lg shadow-indigo-500/20">
          <LayoutDashboard className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-foreground">Financial OS</h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Real-time Portfolio Intelligence</p>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-4">
        {/* Economic Indicators Pill */}
        {indicators && (
          <div className="flex items-center bg-card border border-border rounded-2xl px-4 py-2 gap-6 shadow-inner">
            <div className="flex items-center gap-2">
              <Landmark className="h-3.5 w-3.5 text-indigo-400" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Bank Interest</span>
                <span className="text-xs font-bold text-foreground">{indicators.israelInterest}%</span>
              </div>
            </div>
            
            <div className="h-6 w-px bg-border" />
            
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">USD / ILS</span>
                <span className="text-xs font-bold text-foreground">{indicators.usdIls.toFixed(3)}</span>
              </div>
            </div>

            <div className="h-6 w-px bg-border" />
            
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">ILS / USD</span>
                <span className="text-xs font-bold text-foreground">{indicators.ilsUsd.toFixed(4)}</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-xl border border-border p-2.5 hover:bg-muted transition-all duration-200 bg-card shadow-sm"
          aria-label="Toggle theme"
        >
          {mounted && (
            theme === "dark" ? (
              <Sun className="h-5 w-5 text-amber-400" />
            ) : (
              <Moon className="h-5 w-5 text-indigo-400" />
            )
          )}
        </button>
      </div>
    </header>
  );
}
