"use client";

import React from "react";
import { Moon, Sun, Landmark, ArrowRightLeft, Cpu } from "lucide-react";
import { useTheme } from "next-themes";
import { EconomicIndicators } from "@/lib/google-sheets";

interface HeaderProps {
  indicators?: EconomicIndicators;
}

export function Header({ indicators }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/50 pb-6 sm:pb-8">
      {/* Brand */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="relative rounded-xl sm:rounded-2xl bg-indigo-600 p-2 sm:p-3 text-white shadow-lg shadow-indigo-500/30 animate-float">
          <Cpu className="h-6 w-6 sm:h-7 sm:w-7" />
          {/* Live pulse ring */}
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 border-2 border-background animate-pulse-glow" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter gradient-text">Financial OS</h1>
          <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-[0.25em]">
            Real-time Portfolio Intelligence
          </p>
        </div>
      </div>

      {/* Right: indicators + theme */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        {indicators && (
          <div className="flex items-center bg-card/70 backdrop-blur-xl border border-border/60 rounded-xl sm:rounded-2xl px-3 py-1.5 sm:px-4 sm:py-2 gap-4 sm:gap-6 shadow-inner overflow-x-auto no-scrollbar max-w-[calc(100vw-80px)] sm:max-w-none glow-indigo">
            <Indicator
              icon={<Landmark className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-indigo-400" />}
              label="Bank Interest"
              value={`${indicators.israelInterest}%`}
            />
            <Divider />
            <Indicator
              icon={<ArrowRightLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-400" />}
              label="USD / ILS"
              value={indicators.usdIls.toFixed(3)}
            />
            <Divider />
            <Indicator
              icon={<ArrowRightLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-400" />}
              label="ILS / USD"
              value={indicators.ilsUsd.toFixed(4)}
            />
          </div>
        )}

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-lg sm:rounded-xl border border-border/60 p-2 sm:p-2.5 hover:bg-muted transition-all duration-200 bg-card/70 backdrop-blur-xl shadow-sm shrink-0"
          aria-label="Toggle theme"
        >
          {mounted && (
            theme === "dark"
              ? <Sun  className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400" />
              : <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400" />
          )}
        </button>
      </div>
    </header>
  );
}

function Indicator({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      {icon}
      <div className="flex flex-col">
        <span className="text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-tighter">{label}</span>
        <span className="text-[10px] sm:text-xs font-bold text-foreground tabular-nums">{value}</span>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-5 sm:h-6 w-px bg-border shrink-0" />;
}
