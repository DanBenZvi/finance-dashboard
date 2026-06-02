import { google } from 'googleapis';

// Suppress specific Node.js deprecation warnings that can clutter the console
// especially in Turbopack environments with newer Node versions.
if (typeof process !== 'undefined' && typeof process.emit === 'function') {
  const originalEmit = process.emit;
  // Use 'any' casting to bypass strict type checks on process.emit during Vercel builds
  (process as any).emit = function (name: any, ...args: any[]) {
    if (name === 'warning' && args[0] && typeof args[0] === 'object' && args[0].code === 'DEP0108') {
      return false;
    }
    return originalEmit.apply(process, arguments as any);
  };
}

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

export async function getGoogleSheetsClient() {
  const auth = new google.auth.JWT(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    undefined,
    process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    SCOPES
  );

  return google.sheets({ version: 'v4', auth });
}

export async function getSheetData(range: string, retries = 3): Promise<string[][]> {
  try {
    const sheets = await getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range,
    });

    return (response.data.values || []) as string[][];
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const errorMessage = error?.message || String(error);
    const isTransientError = 
      errorMessage.includes('socket') || 
      errorMessage.includes('TLS') || 
      errorMessage.includes('ECONNRESET') ||
      errorMessage.includes('ETIMEDOUT') ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNRESET';

    if (isTransientError && retries > 0) {
      const delay = (4 - retries) * 1000;
      console.warn(`Transient network error fetching range "${range}". Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return getSheetData(range, retries - 1);
    }

    if (error?.response?.data?.error?.message?.includes('Unable to parse range')) {
      console.warn(`Warning: Range "${range}" not found.`);
    } else {
      console.error(`Error fetching data for range "${range}":`, errorMessage);
    }
    return [];
  }
}

export interface PortfolioItem {
  securityName: string;
  ticker: string;
  quantity: number;
  aumIls: number;
  aumUsd: number;
  shareOfPortfolio: number;
  changeFromBuyPrice: number;
  purchasePrice: number;
  totalPurchase: number;
  sharePrice: number;
  dailyChangeUsd: number;
  dailyChangePercent: number;
}

export interface MarketWatchItem {
  ticker: string;
  name: string;
  industry: string;
  dailyChangePercent: number;
  monthlyChangePercent: number;
  ytdChangePercent: number;
  marketCap: number;
}

export interface HistoryItem {
  date: string;
  timestamp: number;
  aumUsd: number;
  dailyProfitUsd: number;
  totalInvestedUsd: number;
}

export interface EconomicIndicators {
  israelInterest: number;
  usdIls: number;
  ilsUsd: number;
}

/**
 * Robust numeric parsing that handles currency symbols, commas, and percentage signs.
 * Also handles negative numbers in parentheses (e.g., (1,234.56) -> -1234.56)
 */
function parseNumeric(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  
  const str = String(value).trim();
  const isNegative = str.startsWith('(') && str.endsWith(')');
  
  // Clean string of all non-numeric characters except . and -
  let cleaned = str.replace(/[^0-9.-]/g, '');
  
  // If it was in parentheses, make it negative if not already
  if (isNegative && !cleaned.startsWith('-')) {
    cleaned = '-' + cleaned;
  }
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parses a date string strictly in American format (MM/DD/YYYY).
 */
function parseCustomDate(dateStr: string): number {
  if (!dateStr) return 0;
  const cleaned = dateStr.toString().trim();
  if (!cleaned) return 0;

  try {
    let datePart = cleaned;
    let timePart = '';
    
    if (cleaned.includes(' ')) {
      const parts = cleaned.split(/\s+/);
      datePart = parts[0];
      timePart = parts[1];
    }

    const separator = datePart.includes('/') ? '/' : (datePart.includes('-') ? '-' : '.');
    const parts = datePart.split(separator).map(Number);
    
    if (parts.length !== 3) return 0;

    let day, month, year;

    // Handle MM/DD/YYYY (Standard American)
    if (parts[2] > 100) {
      year = parts[2];
      month = parts[0];
      day = parts[1];
    } else if (parts[0] > 100) {
      // Handle YYYY/MM/DD
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else {
      return 0; 
    }
    
    let hours = 0, minutes = 0, seconds = 0;
    if (timePart) {
      const tParts = timePart.split(':').map(Number);
      hours = tParts[0] || 0;
      minutes = tParts[1] || 0;
      seconds = tParts[2] || 0;
    }

    const date = new Date(year, month - 1, day, hours, minutes, seconds);
    const ts = date.getTime();
    return isNaN(ts) ? 0 : ts;
  } catch {
    return 0;
  }
}

/**
 * Formats date for chart display
 */
function formatForChart(dateStr: string): string {
  const ts = parseCustomDate(dateStr);
  if (ts === 0) return dateStr;
  return new Date(ts).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
}

export async function fetchAllData() {
  try {
    const [portfolioRaw, marketWatchRaw, historyRaw, indicatorsRaw, usdIlsNamedRange] = await Promise.all([
      getSheetData('Portfolio!A2:O100'), // Increased range to handle more holdings
      getSheetData('MarketWatch!A2:G'),
      getSheetData('Daily History!A2:D'),
      getSheetData('Portfolio!A26:C35'),
      getSheetData('USD_ILS'), // Fetch named range for USD/ILS rate
    ]);

    const portfolio = (portfolioRaw || [])
      .filter(row => row[0] || row[1]) // Only process rows with security name or ticker
      .map((row, idx) => {
        try {
          return {
            securityName: row[0] || '',
            ticker: row[1] || '',
            quantity: parseNumeric(row[3]),
            aumIls: parseNumeric(row[5]),
            aumUsd: parseNumeric(row[6]),
            shareOfPortfolio: parseNumeric(row[7]),
            changeFromBuyPrice: parseNumeric(row[8]),
            purchasePrice: parseNumeric(row[9]),
            totalPurchase: parseNumeric(row[10]),
            sharePrice: parseNumeric(row[11]),
            dailyChangeUsd: parseNumeric(row[13]),
            dailyChangePercent: parseNumeric(row[14]),
          };
        } catch (e) {
          console.error(`Error parsing portfolio row ${idx + 2}:`, e);
          return null;
        }
      }).filter(Boolean) as PortfolioItem[];

    const mapMarketWatch = (row: string[]) => ({
      ticker: row[0] || '',
      name: row[1] || '',
      industry: row[2] || '',
      dailyChangePercent: parseNumeric(row[3]),
      monthlyChangePercent: parseNumeric(row[4]),
      ytdChangePercent: parseNumeric(row[5]),
      marketCap: parseNumeric(row[6]),
    });

    const history = (historyRaw || [])
      .map((row) => ({
        date: formatForChart(row[0] || ''),
        timestamp: parseCustomDate(row[0] || ''),
        aumUsd: parseNumeric(row[1]),
        dailyProfitUsd: parseNumeric(row[2]),
        totalInvestedUsd: parseNumeric(row[3]),
      }))
      .filter(item => item.timestamp > 0)
      .sort((a, b) => a.timestamp - b.timestamp) as HistoryItem[];

    // Dynamic lookup for indicators
    const findValue = (label: string) => {
      if (!indicatorsRaw) return 0;
      const row = indicatorsRaw.find(r => 
        r[0]?.toString().toLowerCase().includes(label.toLowerCase()) ||
        r[1]?.toString().toLowerCase().includes(label.toLowerCase())
      );
      if (row) {
        const labelIndex = row.findIndex(c => c?.toString().toLowerCase().includes(label.toLowerCase()));
        return parseNumeric(row[labelIndex + 1]);
      }
      return 0;
    };

    const usdIls = usdIlsNamedRange?.[0]?.[0] ? parseNumeric(usdIlsNamedRange[0][0]) : findValue('USD/ILS');

    const indicators: EconomicIndicators = {
      israelInterest: findValue('Interest'),
      usdIls,
      ilsUsd: usdIls > 0 ? (1 / usdIls) : findValue('ILS/USD'),
    };

    return {
      portfolio,
      marketWatch: (marketWatchRaw || []).map(mapMarketWatch) as MarketWatchItem[],
      history,
      indicators,
    };
  } catch (error) {
    console.error('Fatal error in fetchAllData:', error);
    // Return empty but valid structure to prevent crash
    return {
      portfolio: [],
      marketWatch: [],
      history: [],
      indicators: { israelInterest: 0, usdIls: 0, ilsUsd: 0 }
    };
  }
}
