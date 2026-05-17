import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

export const dynamic = 'force-dynamic';

const yahoo = new YahooFinance();

interface YahooHistoryItem {
  date: string | number | Date;
  close: number;
}

interface YahooQuote {
  longName?: string;
  shortName?: string;
  sector?: string;
  quoteType?: string;
}

interface YahooSummary {
  assetProfile?: {
    sector?: string;
  };
}

/**
 * Tries several ticker variations to find the best match for Yahoo Finance
 */
async function fetchWithFallback(ticker: string, years: number) {
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - years);
  const period2 = new Date();

  const variations = [];
  const upperTicker = ticker.toUpperCase().trim();
  const cleanedTicker = upperTicker.replace(/[\^]/g, '');

  // 1. Specific known working patterns
  if (upperTicker === 'NDX') variations.push('^NDX');
  if (upperTicker === 'STOXX50E') variations.push('^STOXX50E');
  if (upperTicker.includes('1215771') || upperTicker.includes('TELBANK5')) {
    variations.push('YELN-F5.TA'); // Working Banks-5 ETF
  }
  if (upperTicker === 'TA125' || upperTicker === 'TA125.TA') {
    variations.push('^TA125.TA');
  }

  // 2. Original input
  variations.push(upperTicker);

  // 3. If it contains a dash, try removing it
  if (upperTicker.includes('-')) {
    variations.push(upperTicker.replace('-', ''));
  }

  // 4. Israeli Fund/Index Logic
  if (/^\d+$/.test(cleanedTicker)) {
    // It's a number (likely Israeli fund)
    variations.push(`${cleanedTicker}.TA`);
    // Some funds use a different prefix on Yahoo
    if (cleanedTicker === '1145952') variations.push('MTF-F62.TA');
    if (cleanedTicker === '1215771') variations.push('TCH-F13.TA');
  } else if (!upperTicker.endsWith('.TA')) {
    variations.push(`${cleanedTicker}.TA`);
    variations.push(`^${cleanedTicker}.TA`);
    variations.push(`^${cleanedTicker}`);
  } else if (upperTicker.endsWith('.TA')) {
    // Already has .TA, try with ^ prefix
    variations.push(`^${upperTicker}`);
    // Try removing dash if any
    if (upperTicker.includes('-')) {
      variations.push(`^${upperTicker.replace('-', '')}`);
      variations.push(upperTicker.replace('-', ''));
    }
  }

  // 5. Final fallback for TA indices
  if (upperTicker.startsWith('TA-') && upperTicker.endsWith('.TA')) {
    const core = upperTicker.substring(3, upperTicker.length - 3);
    variations.push(`^TA${core}.TA`);
    variations.push(`TA${core}.TA`);
  }

  const uniqueVariations = [...new Set(variations)].filter(Boolean);

  let lastError = null;

  for (const symbol of uniqueVariations) {
    try {
      if (!symbol) continue;
      
      console.log(`[Simulator API] Fetching variation: ${symbol}`);
      
      const [history, quote, summary] = await Promise.all([
        yahoo.historical(symbol, { period1, period2, interval: '1d' }).catch(() => [] as YahooHistoryItem[]),
        yahoo.quote(symbol).catch(() => null),
        yahoo.quoteSummary(symbol, { modules: ['assetProfile'] }).catch(() => null)
      ]) as [YahooHistoryItem[], YahooQuote | null, YahooSummary | null];

      if (history && history.length > 0) {
        console.log(`[Simulator API] Success for ${symbol}`);
        const q = quote as YahooQuote | null;
        const s = summary as YahooSummary | null;
        return {
          ticker: symbol,
          name: q?.longName || q?.shortName || symbol,
          sector: s?.assetProfile?.sector || q?.sector || (q?.quoteType === 'CRYPTOCURRENCY' ? 'Crypto' : 'Other'),
          historicalPrices: history
            .map((item: YahooHistoryItem) => ({
              date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              timestamp: new Date(item.date).getTime(),
              price: item.close,
            }))
            .filter((item: { price: number | null | undefined }) => item.price !== null && item.price !== undefined)
        };
      }
    } catch (e: unknown) {
      const error = e as Error;
      console.warn(`[Simulator API] Failed variation ${symbol}:`, error.message);
      lastError = error;
      // If it's a "fetch failed" error, it might be transient or DNS related
      if (error.message?.includes('fetch failed')) {
        console.log(`[Simulator API] Retrying ${symbol} due to fetch failure...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        // Try one more time for this symbol
        try {
           const [history, quote, summary] = await Promise.all([
            yahoo.historical(symbol, { period1, period2, interval: '1d' }).catch(() => [] as YahooHistoryItem[]),
            yahoo.quote(symbol).catch(() => null),
            yahoo.quoteSummary(symbol, { modules: ['assetProfile'] }).catch(() => null)
          ]) as [YahooHistoryItem[], YahooQuote | null, YahooSummary | null];

          if (history && history.length > 0) {
            const q = quote as YahooQuote | null;
            const s = summary as YahooSummary | null;
            return {
              ticker: symbol,
              name: q?.longName || q?.shortName || symbol,
              sector: s?.assetProfile?.sector || q?.sector || (q?.quoteType === 'CRYPTOCURRENCY' ? 'Crypto' : 'Other'),
              historicalPrices: history
              .map((item: YahooHistoryItem) => ({
                date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                timestamp: new Date(item.date).getTime(),
                price: item.close,
              }))
              .filter((item: { price: number | null | undefined }) => item.price !== null && item.price !== undefined)
            };
          }
        } catch (retryError: unknown) {
          lastError = retryError as Error;
        }
      }
    }
  }
  
  throw lastError || new Error('No data found');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker')?.toUpperCase();
  const years = parseInt(searchParams.get('years') || '5');

  if (!ticker) {
    return NextResponse.json({ error: 'Ticker symbol is required' }, { status: 400 });
  }

  try {
    const data = await fetchWithFallback(ticker, years);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Simulator API Error [${ticker}]:`, message);
    
    const isNotFound = 
      message.includes('Not Found') || 
      message.includes('404') || 
      message.includes('No data found');

    if (isNotFound) {
      return NextResponse.json({ 
        error: `Ticker "${ticker}" not found. Try variations like TEVA.TA or ^TA125.TA. Note: Some local indices might not be supported by Yahoo Finance.` 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      error: `Failed to fetch simulator data: ${message}` 
    }, { status: 500 });
  }
}
