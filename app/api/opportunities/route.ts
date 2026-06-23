import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const dynamic = "force-dynamic";

const yahoo = new YahooFinance();

const SECTORS = [
  { ticker: "XLK",  name: "Technology" },
  { ticker: "XLF",  name: "Financials" },
  { ticker: "XLE",  name: "Energy" },
  { ticker: "XLV",  name: "Health Care" },
  { ticker: "XLI",  name: "Industrials" },
  { ticker: "XLC",  name: "Comm. Services" },
  { ticker: "XLY",  name: "Consumer Discr." },
  { ticker: "XLP",  name: "Consumer Staples" },
  { ticker: "XLRE", name: "Real Estate" },
  { ticker: "XLU",  name: "Utilities" },
  { ticker: "XLB",  name: "Materials" },
];

const MACRO = [
  { ticker: "SPY",   name: "S&P 500" },
  { ticker: "QQQ",   name: "Nasdaq 100" },
  { ticker: "GLD",   name: "Gold" },
  { ticker: "TLT",   name: "20Y Treasury" },
  { ticker: "UUP",   name: "USD Index" },
  { ticker: "USO",   name: "Oil (WTI)" },
  { ticker: "^VIX",  name: "VIX (Fear)" },
];

interface QuoteResult {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changeAbs: number;
  volume: number;
  fiftyTwoWeekLow: number;
  fiftyTwoWeekHigh: number;
  isSector: boolean;
}

async function fetchQuote(ticker: string, name: string, isSector: boolean): Promise<QuoteResult | null> {
  try {
    const q = await yahoo.quote(ticker);
    return {
      ticker,
      name,
      price: q.regularMarketPrice ?? 0,
      change: q.regularMarketChangePercent ?? 0,
      changeAbs: q.regularMarketChange ?? 0,
      volume: q.regularMarketVolume ?? 0,
      fiftyTwoWeekLow: (q as Record<string, unknown>).fiftyTwoWeekLow as number ?? 0,
      fiftyTwoWeekHigh: (q as Record<string, unknown>).fiftyTwoWeekHigh as number ?? 0,
      isSector,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const all = [
    ...SECTORS.map(s => fetchQuote(s.ticker, s.name, true)),
    ...MACRO.map(m => fetchQuote(m.ticker, m.name, false)),
  ];

  const settled = await Promise.allSettled(all);
  const quotes = settled
    .filter(r => r.status === "fulfilled" && r.value !== null)
    .map(r => (r as PromiseFulfilledResult<QuoteResult>).value);

  const sectors = quotes
    .filter(q => q.isSector)
    .sort((a, b) => b.change - a.change);

  const macro = quotes.filter(q => !q.isSector);

  // Trending US symbols
  let trending: { symbol: string }[] = [];
  try {
    const t = await (yahoo.trendingSymbols as (lang: string, opts: Record<string, unknown>) => Promise<{ quotes: { symbol: string }[] }>)("US", { count: 8 });
    trending = t.quotes ?? [];
  } catch {
    trending = [];
  }

  return NextResponse.json({ sectors, macro, trending });
}
