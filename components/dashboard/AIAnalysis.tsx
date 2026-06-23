"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Brain, RefreshCw, Sparkles, ChevronDown, ChevronUp, Volume2, Square } from "lucide-react";
import { PortfolioItem, HistoryItem, EconomicIndicators } from "@/lib/google-sheets";
import { computeAnalytics } from "@/lib/analysis";
import { useSpeech } from "@/lib/useSpeech";

interface AIAnalysisProps {
  portfolio: PortfolioItem[];
  history: HistoryItem[];
  indicators: EconomicIndicators;
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    if (!line.trim()) {
      nodes.push(<div key={key++} className="h-3" />);
      continue;
    }

    // Bold headers like **Title**
    if (line.startsWith("**") && line.endsWith("**") && line.length > 4) {
      const content = line.slice(2, -2);
      nodes.push(
        <p key={key++} className="font-black text-sm text-foreground tracking-tight mt-4 first:mt-0">
          {content}
        </p>
      );
      continue;
    }

    // Numbered sections like "1. **Title** — rest"
    const numberedMatch = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*\s*[—–-]?\s*(.*)/);
    if (numberedMatch) {
      nodes.push(
        <div key={key++} className="mt-5 first:mt-0">
          <span className="inline-flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-black shrink-0">
              {numberedMatch[1]}
            </span>
            <span className="font-black text-sm text-indigo-300">{numberedMatch[2]}</span>
          </span>
          {numberedMatch[3] && (
            <p className="mt-1 pl-7 text-sm text-muted-foreground leading-relaxed">
              {inlineBold(numberedMatch[3])}
            </p>
          )}
        </div>
      );
      continue;
    }

    // Continuation lines indented under numbered sections
    if (line.startsWith("   ") || line.startsWith("\t")) {
      nodes.push(
        <p key={key++} className="pl-7 text-sm text-muted-foreground leading-relaxed -mt-1">
          {inlineBold(line.trim())}
        </p>
      );
      continue;
    }

    // Horizontal rule
    if (/^─{3,}$/.test(line.trim())) {
      nodes.push(<hr key={key++} className="border-border/40 my-3" />);
      continue;
    }

    // Default paragraph
    nodes.push(
      <p key={key++} className="text-sm text-muted-foreground leading-relaxed">
        {inlineBold(line)}
      </p>
    );
  }
  return nodes;
}

function inlineBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-foreground font-bold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function AIAnalysis({ portfolio, history, indicators }: AIAnalysisProps) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<"en" | "he">("en");
  const abortRef = useRef<AbortController | null>(null);
  const { state: speechState, speak, stop: stopSpeech } = useSpeech();
  const isSpeaking = speechState === "speaking";

  const analytics = React.useMemo(
    () => computeAnalytics(history, portfolio),
    [history, portfolio]
  );

  const runAnalysis = useCallback(async (langOverride?: "en" | "he") => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const activeLang = langOverride ?? lang;

    setIsLoading(true);
    setText("");
    setError(null);
    setHasRun(true);
    setIsCollapsed(false);

    try {
      const res = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolio, analytics, indicators, lang: activeLang }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        if (buffer.startsWith("__ERROR__:")) {
          throw new Error(buffer.slice("__ERROR__:".length));
        }
        setText(buffer);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsLoading(false);
    }
  }, [portfolio, analytics, indicators, lang]);

  // Auto-run once on mount
  useEffect(() => {
    if (!hasRun && portfolio.length > 0) {
      runAnalysis();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-card/60 backdrop-blur-xl border border-indigo-500/20 rounded-2xl shadow-xl overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-gradient-to-r from-indigo-500/5 to-purple-500/5">
        <div className="flex items-center gap-3">
          <div className="relative bg-indigo-600/20 border border-indigo-500/30 p-2 rounded-xl">
            <Brain className="h-5 w-5 text-indigo-400" />
            {isLoading && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="font-black text-sm text-foreground tracking-tight">AI Portfolio Analysis</h3>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
              {isLoading ? "Claude Opus is analysing…" : hasRun ? "Powered by Claude Opus 4.8" : "Ready to analyse"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden text-[9px] font-black uppercase tracking-widest">
            {(["en", "he"] as const).map(l => (
              <button
                key={l}
                onClick={() => {
                  if (l === lang) return;
                  setLang(l);
                  stopSpeech();
                  runAnalysis(l);
                }}
                className={`px-2.5 py-1.5 transition-all ${lang === l ? "bg-indigo-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
              >
                {l === "en" ? "EN" : "עב"}
              </button>
            ))}
          </div>

          {hasRun && (
            <button
              onClick={() => setIsCollapsed(c => !c)}
              className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
            >
              {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={() => runAnalysis()}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-400 text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? (lang === "he" ? "מנתח…" : "Analysing") : hasRun ? (lang === "he" ? "נתח מחדש" : "Re-analyse") : (lang === "he" ? "נתח" : "Analyse")}
          </button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-6 py-5 min-h-[80px]">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              <span className="font-bold">Error:</span> {error}
              {error.includes("ANTHROPIC_API_KEY") || error.includes("API key") ? (
                <span className="ml-1 text-muted-foreground">— add ANTHROPIC_API_KEY to .env.local</span>
              ) : null}
            </div>
          )}

          {!hasRun && !isLoading && !error && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
              <Sparkles className="h-8 w-8 text-indigo-400/40" />
              <p className="text-sm font-medium">Click Analyse to get an AI-powered portfolio assessment</p>
            </div>
          )}

          {isLoading && !text && (
            <div className="flex items-center gap-3 py-4">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">Thinking through your portfolio…</span>
            </div>
          )}

          {text && (
            <div className="space-y-0.5" dir={lang === "he" ? "rtl" : "ltr"}>
              {renderMarkdown(text)}
              {isLoading && (
                <span className="inline-block h-4 w-0.5 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          )}

          {/* Listen button — appears once text is ready */}
          {text && !isCollapsed && (
            <div className="mt-5 pt-4 border-t border-border/40 flex items-center gap-3">
              {isSpeaking ? (
                <>
                  <div className="flex items-end gap-0.5 h-5">
                    {[4, 8, 12, 10, 7, 11, 5, 9, 13, 6].map((h, i) => (
                      <span
                        key={i}
                        className="w-0.5 rounded-full bg-indigo-400"
                        style={{ height: `${h}px`, animation: `bounce 0.75s ease-in-out ${i * 0.07}s infinite alternate` }}
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
                  {lang === "he" ? "האזן לניתוח" : "Listen to Analysis"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
