import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

export const dynamic = "force-dynamic";

const yahoo = new YahooFinance();

// Macro tickers always included for global context
const MACRO = ["SPY", "QQQ", "GLD", "TLT", "^VIX", "CL=F"];

interface RawNewsItem {
  uuid: string;
  title: string;
  publisher: string;
  link: string;
  providerPublishTime: Date | number;
  type?: string;
  relatedTickers?: string[];
  thumbnail?: { resolutions: { url: string; width: number; height: number; tag: string }[] };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickers = (searchParams.get("tickers") || "")
    .split(",")
    .map(t => t.trim())
    .filter(Boolean)
    .slice(0, 8);

  const searchTerms = [...new Set([...tickers, ...MACRO])];
  const seen = new Map<string, RawNewsItem>();

  const MODULE_OPTS = { validateResult: false } as const;

  await Promise.allSettled(
    searchTerms.map(async (ticker) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (yahoo as any).search(ticker, { newsCount: 6, enableNavLinks: false, enableCb: false }, MODULE_OPTS);
        for (const item of (result.news ?? []) as RawNewsItem[]) {
          if (item.uuid && !seen.has(item.uuid)) seen.set(item.uuid, item);
        }
      } catch {
        // skip failed tickers silently
      }
    })
  );

  function toMs(t: Date | number | string): number {
    if (t instanceof Date) return t.getTime();
    if (typeof t === "string") return new Date(t).getTime();
    // Unix seconds if small, millis if large
    return t < 1e12 ? t * 1000 : t;
  }

  const news = Array.from(seen.values())
    .sort((a, b) => toMs(b.providerPublishTime) - toMs(a.providerPublishTime))
    .slice(0, 30)
    .map(item => ({
      uuid: item.uuid,
      title: item.title,
      publisher: item.publisher,
      link: item.link,
      publishedMs: toMs(item.providerPublishTime),
      relatedTickers: item.relatedTickers ?? [],
      thumbnailUrl:
        item.thumbnail?.resolutions?.find(r => r.width >= 140)?.url ?? null,
    }));

  return NextResponse.json({ news });
}
