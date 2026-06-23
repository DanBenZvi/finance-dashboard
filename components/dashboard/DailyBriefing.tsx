"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Zap, RefreshCw, TrendingUp, TrendingDown, Volume2, Square } from "lucide-react";
import { PortfolioItem } from "@/lib/google-sheets";
import { useSpeech } from "@/lib/useSpeech";

interface Props {
  portfolio: PortfolioItem[];
  headlines: Array<{ title: string; publisher: string; relatedTickers: string[] }>;
  newsLoading?: boolean;
}

export function DailyBriefing({ portfolio, headlines, newsLoading }: Props) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "he">("en");
  const abortRef = useRef<AbortController | null>(null);
  const { state: speechState, speak, stop: stopSpeech } = useSpeech();

  const totalAum            = portfolio.reduce((s, p) => s + p.aumUsd, 0);
  const totalDailyChangeUsd = portfolio.reduce((s, p) => s + p.dailyChangeUsd, 0);
  const totalDailyChangePct =
    totalAum > Math.abs(totalDailyChangeUsd)
      ? (totalDailyChangeUsd / (totalAum - totalDailyChangeUsd)) * 100
      : 0;
  const isUp = totalDailyChangeUsd >= 0;

  const run = useCallback(async (hdls: Props["headlines"], langOverride?: "en" | "he") => {
    if (!hdls.length) return;
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const activeLang = langOverride ?? lang;

    stopSpeech();
    setIsLoading(true);
    setText("");
    setError(null);
    setHasRun(true);

    try {
      const res = await fetch("/api/daily-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolio, headlines: hdls, totalDailyChangeUsd, totalDailyChangePct, totalAum, lang: activeLang }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No body");

      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        if (buf.startsWith("__ERROR__:")) throw new Error(buf.slice("__ERROR__:".length));
        setText(buf);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setIsLoading(false);
    }
  }, [portfolio, totalDailyChangeUsd, totalDailyChangePct, totalAum, stopSpeech]);

  useEffect(() => {
    if (!hasRun && headlines.length > 0) run(headlines);
  }, [headlines.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const isSpeaking = speechState === "speaking";

  return (
    <div className={`relative rounded-2xl border overflow-hidden backdrop-blur-xl shadow-2xl ${
      isUp
        ? "border-emerald-500/25 bg-gradient-to-br from-emerald-950/30 to-card/60"
        : "border-rose-500/25 bg-gradient-to-br from-rose-950/30 to-card/60"
    }`}>
      <div className={`h-px w-full ${isUp ? "bg-gradient-to-r from-transparent via-emerald-400 to-transparent" : "bg-gradient-to-r from-transparent via-rose-400 to-transparent"}`} />

      <div className="px-6 py-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${isUp ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"}`}>
              {isUp ? <TrendingUp className="h-5 w-5 text-emerald-400" /> : <TrendingDown className="h-5 w-5 text-rose-400" />}
            </div>
            <div>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className={`text-2xl font-black tabular-nums ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                  {isUp ? "+" : "−"}${Math.abs(totalDailyChangeUsd).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
                <span className={`text-sm font-bold ${isUp ? "text-emerald-500/80" : "text-rose-500/80"}`}>
                  ({isUp ? "+" : ""}{totalDailyChangePct.toFixed(2)}%) today
                </span>
              </div>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">
                Daily Briefing · Claude Opus
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Language toggle */}
            <div className="flex rounded-lg border border-border overflow-hidden text-[9px] font-black uppercase tracking-widest">
              {(["en", "he"] as const).map(l => (
                <button
                  key={l}
                  onClick={() => {
                    if (l === lang) return;
                    setLang(l);
                    stopSpeech();
                    run(headlines, l);
                  }}
                  className={`px-2.5 py-1.5 transition-all ${lang === l ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
                >
                  {l === "en" ? "EN" : "עב"}
                </button>
              ))}
            </div>
            {/* Refresh */}
            <button
              onClick={() => run(headlines)}
              disabled={isLoading || newsLoading || !headlines.length}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/50 hover:bg-muted border border-border text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all disabled:opacity-40"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "…" : lang === "he" ? "רענן" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Body text */}
        {error && (
          <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">{error}</p>
        )}

        {(newsLoading || (isLoading && !text)) && (
          <div className="flex items-center gap-2 py-1">
            <Zap className="h-4 w-4 text-indigo-400 animate-pulse" />
            <span className="text-sm text-muted-foreground">
              {newsLoading ? "Loading market data…" : "Connecting today's news to your portfolio…"}
            </span>
          </div>
        )}

        {text && (
          <div
            className="text-sm leading-relaxed text-muted-foreground space-y-3"
            dir={lang === "he" ? "rtl" : "ltr"}
            style={lang === "he" ? { fontFamily: "system-ui, Arial, sans-serif" } : {}}
          >
            {text.split(/\n{2,}/).filter(Boolean).map((block, i, arr) => (
              <p key={i}>
                {block.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                  part.startsWith("**") && part.endsWith("**")
                    ? <strong key={j} className="text-foreground font-bold">{part.slice(2, -2)}</strong>
                    : part
                )}
                {isLoading && i === arr.length - 1 && (
                  <span className="inline-block h-4 w-0.5 bg-indigo-400 animate-pulse align-middle ml-0.5" />
                )}
              </p>
            ))}
          </div>
        )}

        {/* ── Listen button — always visible once there's text ── */}
        {text && (
          <div className="pt-2 border-t border-border/40 flex items-center gap-3">
            {isSpeaking ? (
              <>
                {/* Wave bars */}
                <div className="flex items-end gap-0.5 h-5">
                  {[3, 6, 9, 12, 9, 6, 4, 8, 11, 7].map((h, i) => (
                    <span
                      key={i}
                      className="w-0.5 rounded-full bg-indigo-400"
                      style={{ height: `${h}px`, animation: `bounce 0.7s ease-in-out ${i * 0.07}s infinite alternate` }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Speaking…</span>
                <button
                  onClick={stopSpeech}
                  className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-black uppercase tracking-widest transition-all"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  Stop
                </button>
              </>
            ) : (
              <button
                onClick={() => speak(text, lang)}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/25 hover:border-indigo-500/50 text-indigo-400 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-40 group"
              >
                <Volume2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                {lang === "he" ? "האזן לסיכום" : "Listen to Briefing"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
