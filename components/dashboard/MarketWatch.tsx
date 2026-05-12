import { MarketWatchItem } from "@/lib/google-sheets";
import { formatPercent } from "@/lib/utils";
import { Activity, Globe, TrendingUp, TrendingDown } from "lucide-react";

interface MarketWatchProps {
  items: MarketWatchItem[];
}

export function MarketWatch({ items }: MarketWatchProps) {
  // Calculate top 5 gainers and losers
  const sortedItems = [...items].sort((a, b) => b.dailyChangePercent - a.dailyChangePercent);
  const topGainers = sortedItems.slice(0, 5).filter(i => i.dailyChangePercent > 0);
  const topLosers = [...sortedItems].reverse().slice(0, 5).filter(i => i.dailyChangePercent < 0);

  return (
    <div className="space-y-6">
      {/* Market Movers Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Gainers */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/10 rounded-lg">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <h4 className="text-sm font-black text-foreground uppercase tracking-wider">Top Gainers</h4>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Daily Change</span>
          </div>
          <div className="space-y-3">
            {topGainers.map((item, index) => (
              <div key={`gainer-${item.ticker}-${index}`} className="flex items-center justify-between p-2 rounded-xl hover:bg-emerald-500/[0.03] transition-colors group">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-foreground uppercase italic">{item.ticker}</span>
                  <span className="text-[9px] text-muted-foreground truncate max-w-[120px]">{item.name}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-black text-emerald-400">
                    +{formatPercent(item.dailyChangePercent)}
                  </span>
                  <span className={`text-[9px] font-bold ${item.monthlyChangePercent >= 0 ? 'text-emerald-500/50' : 'text-rose-500/50'}`}>
                    M: {item.monthlyChangePercent >= 0 ? '+' : ''}{formatPercent(item.monthlyChangePercent)}
                  </span>
                </div>
              </div>
            ))}
            {topGainers.length === 0 && <p className="text-[10px] text-muted-foreground italic text-center py-4">No gainers today</p>}
          </div>
        </div>

        {/* Top Losers */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-rose-500/10 rounded-lg">
                <TrendingDown className="h-4 w-4 text-rose-400" />
              </div>
              <h4 className="text-sm font-black text-foreground uppercase tracking-wider">Top Losers</h4>
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Daily Change</span>
          </div>
          <div className="space-y-3">
            {topLosers.map((item, index) => (
              <div key={`loser-${item.ticker}-${index}`} className="flex items-center justify-between p-2 rounded-xl hover:bg-rose-500/[0.03] transition-colors group">
                <div className="flex flex-col">
                  <span className="text-xs font-black text-foreground uppercase italic">{item.ticker}</span>
                  <span className="text-[9px] text-muted-foreground truncate max-w-[120px]">{item.name}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-black text-rose-400">
                    {formatPercent(item.dailyChangePercent)}
                  </span>
                  <span className={`text-[9px] font-bold ${item.monthlyChangePercent >= 0 ? 'text-emerald-500/50' : 'text-rose-500/50'}`}>
                    M: {item.monthlyChangePercent >= 0 ? '+' : ''}{formatPercent(item.monthlyChangePercent)}
                  </span>
                </div>
              </div>
            ))}
            {topLosers.length === 0 && <p className="text-[10px] text-muted-foreground italic text-center py-4">No losers today</p>}
          </div>
        </div>
      </div>

      {/* Main Watchlist Table */}
      <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
        <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-card/80">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/10 p-2 rounded-lg">
              <Activity className="h-5 w-5 text-indigo-400" />
            </div>
            <h3 className="font-bold text-xl text-foreground tracking-tight">Market Assets</h3>
          </div>
          <div className="px-4 py-1 rounded-full bg-muted border border-border">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{items.length} Assets</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-8 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Asset</th>
                <th className="px-8 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Industry</th>
                <th className="px-8 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right">Daily</th>
                <th className="px-8 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right">Monthly</th>
                <th className="px-8 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right">YTD</th>
                <th className="px-8 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right">Market Cap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-muted-foreground italic">
                    No market data available.
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={`${item.ticker}-${index}`} className="hover:bg-indigo-500/[0.03] transition-colors group">
                    <td className="px-8 py-4">
                      <div className="flex flex-col">
                        <span className="font-black text-foreground group-hover:text-indigo-400 transition-colors uppercase italic">{item.ticker}</span>
                        <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[150px]">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-[11px] font-bold text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3 w-3 text-slate-400" />
                        {item.industry || 'Market'}
                      </div>
                    </td>
                    <td className={`px-8 py-4 text-right font-black text-xs ${item.dailyChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.dailyChangePercent >= 0 ? '+' : ''}{formatPercent(item.dailyChangePercent)}
                    </td>
                    <td className={`px-8 py-4 text-right font-black text-xs ${item.monthlyChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.monthlyChangePercent >= 0 ? '+' : ''}{formatPercent(item.monthlyChangePercent)}
                    </td>
                    <td className={`px-8 py-4 text-right font-black text-xs ${item.ytdChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.ytdChangePercent >= 0 ? '+' : ''}{formatPercent(item.ytdChangePercent)}
                    </td>
                    <td className="px-8 py-4 text-right font-mono text-xs text-muted-foreground">
                      ${item.marketCap.toLocaleString()}B
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
