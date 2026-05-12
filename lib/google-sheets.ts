import { google } from 'googleapis';

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

export async function getSheetData(range: string, retries = 3): Promise<any[][]> {
  try {
    const sheets = await getGoogleSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range,
    });

    return response.data.values || [];
  } catch (error: any) {
    const isTransientError = 
      error.message?.includes('socket') || 
      error.message?.includes('TLS') || 
      error.message?.includes('ECONNRESET') ||
      error.message?.includes('ETIMEDOUT') ||
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
      console.error(`Error fetching data for range "${range}":`, error?.message || error);
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
 */
function parseNumeric(value: any): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  
  // Clean string of all non-numeric characters except . and -
  const cleaned = value.toString().replace(/[^0-9.-]/g, '');
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
  } catch (e) {
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
  const [portfolioRaw, marketWatchRaw, historyRaw, indicatorsRaw] = await Promise.all([
    getSheetData('Portfolio!A2:O20'),
    getSheetData('MarketWatch!A2:G'),
    getSheetData('Daily History!A2:D'),
    getSheetData('Portfolio!A26:C35'), // Expanded range to include B27 and B28
  ]);

  const portfolio = (portfolioRaw || []).map((row) => ({
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
  })) as PortfolioItem[];

  const mapMarketWatch = (row: any[]) => ({
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
    const row = indicatorsRaw?.find(r => 
      r[0]?.toString().toLowerCase().includes(label.toLowerCase()) ||
      r[1]?.toString().toLowerCase().includes(label.toLowerCase())
    );
    if (row) {
      // Find the index of the column containing the label
      const labelIndex = row.findIndex(c => c?.toString().toLowerCase().includes(label.toLowerCase()));
      // The value should be in the next column
      return parseNumeric(row[labelIndex + 1]);
    }
    return 0;
  };

  const indicators: EconomicIndicators = {
    israelInterest: findValue('Interest'),
    usdIls: findValue('USD/ILS'),
    ilsUsd: findValue('ILS/USD'),
  };

  return {
    portfolio,
    marketWatch: (marketWatchRaw || []).map(mapMarketWatch) as MarketWatchItem[],
    history,
    indicators,
  };
}
