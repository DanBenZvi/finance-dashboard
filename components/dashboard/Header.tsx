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
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border pb-6 sm:pb-8">
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="rounded-xl sm:rounded-2xl bg-indigo-600 p-2 sm:p-3 text-white shadow-lg shadow-indigo-500/20">
          <LayoutDashboard className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground">Financial OS</h1>
          <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Real-time Portfolio Intelligence</p>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        {/* Economic Indicators Pill */}
        {indicators && (
          <div className="flex items-center bg-card border border-border rounded-xl sm:rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 gap-4 sm:gap-6 shadow-inner overflow-x-auto no-scrollbar max-w-[calc(100vw-80px)] sm:max-w-none">
            <div className="flex items-center gap-2 shrink-0">
              <Landmark className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-indigo-400" />
              <div className="flex flex-col">
                <span className="text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Bank Interest</span>
                <span className="text-[10px] sm:text-xs font-bold text-foreground">{indicators.israelInterest}%</span>
              </div>
            </div>
            
            <div className="h-5 sm:h-6 w-px bg-border shrink-0" />
            
            <div className="flex items-center gap-2 shrink-0">
              <ArrowRightLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-tighter">USD / ILS</span>
                <span className="text-[10px] sm:text-xs font-bold text-foreground">{indicators.usdIls.toFixed(3)}</span>
              </div>
            </div>

            <div className="h-5 sm:h-6 w-px bg-border shrink-0" />
            
            <div className="flex items-center gap-2 shrink-0">
              <ArrowRightLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-tighter">ILS / USD</span>
                <span className="text-[10px] sm:text-xs font-bold text-foreground">{indicators.ilsUsd.toFixed(4)}</span>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-lg sm:rounded-xl border border-border p-2 sm:p-2.5 hover:bg-muted transition-all duration-200 bg-card shadow-sm shrink-0"
          aria-label="Toggle theme"
        >
          {mounted && (
            theme === "dark" ? (
              <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400" />
            )
          )}
        </button>
      </div>
    </header>
  );
}
