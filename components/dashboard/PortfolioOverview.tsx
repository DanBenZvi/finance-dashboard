import React, { useState, useMemo } from "react";
import { PortfolioItem } from "@/lib/google-sheets";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign, PieChart, ArrowUpRight, ArrowDownRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface PortfolioOverviewProps {
  portfolio: PortfolioItem[];
}

type SortField = 'ticker' | 'quantity' | 'aumUsd' | 'dailyChangeUsd' | 'dailyChangePercent';
type SortDirection = 'asc' | 'desc';

export function PortfolioOverview({ portfolio }: PortfolioOverviewProps) {
  const [sortField, setSortField] = useState<SortField>('aumUsd');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedPortfolio = useMemo(() => {
    return [...portfolio].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      return sortDirection === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [portfolio, sortField, sortDirection]);

  // Aggregate data only from the stock list (already filtered by range in fetchAllData)
  const totalAumUsd = portfolio.reduce((sum, item) => sum + item.aumUsd, 0);
  const totalDailyChangeUsd = portfolio.reduce((sum, item) => sum + item.dailyChangeUsd, 0);
  
  // Weighted daily change percentage: (Change / (Current - Change)) * 100
  const totalDailyChangePercent = totalAumUsd > totalDailyChangeUsd 
    ? (totalDailyChangeUsd / (totalAumUsd - totalDailyChangeUsd)) * 100 
    : 0;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-20" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  return (
    <div className="space-y-8">
      {/* Top Level Summary Cards - Premium SaaS Grid */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        <MetricCard
          title="Total Portfolio AUM"
          value={formatCurrency(totalAumUsd)}
          description="Consolidated assets in USD"
          icon={<DollarSign className="h-6 w-6 text-indigo-400" />}
        />
        <MetricCard
          title="Daily Change ($)"
          value={formatCurrency(totalDailyChangeUsd)}
          description="Total profit/loss today"
          icon={totalDailyChangeUsd >= 0 ? <TrendingUp className="h-6 w-6 text-emerald-400" /> : <TrendingDown className="h-6 w-6 text-rose-400" />}
          trend={totalDailyChangeUsd >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          title="Daily Change (%)"
          value={formatPercent(totalDailyChangePercent)}
          description="Relative performance today"
          icon={totalDailyChangePercent >= 0 ? <ArrowUpRight className="h-6 w-6 text-emerald-400" /> : <ArrowDownRight className="h-6 w-6 text-rose-400" />}
          trend={totalDailyChangePercent >= 0 ? 'up' : 'down'}
        />
      </div>

      {/* Assets Data Table - Refined Design */}
      <div className="bg-card/50 border border-border rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
        <div className="px-8 py-6 border-b border-border flex items-center justify-between bg-card/80">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/10 p-2 rounded-lg">
              <PieChart className="h-5 w-5 text-indigo-400" />
            </div>
            <h3 className="font-bold text-xl text-foreground tracking-tight">Portfolio Assets</h3>
          </div>
          <div className="px-4 py-1 rounded-full bg-muted border border-border">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{portfolio.length} Holdings</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/30">
                <th 
                  className="px-8 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] cursor-pointer hover:text-foreground transition-colors group"
                  onClick={() => handleSort('ticker')}
                >
                  <div className="flex items-center">
                    Security <SortIcon field="ticker" />
                  </div>
                </th>
                <th 
                  className="px-8 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right cursor-pointer hover:text-foreground transition-colors group"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center justify-end">
                    Quantity <SortIcon field="quantity" />
                  </div>
                </th>
                <th 
                  className="px-8 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right cursor-pointer hover:text-foreground transition-colors group"
                  onClick={() => handleSort('aumUsd')}
                >
                  <div className="flex items-center justify-end">
                    AUM ($) <SortIcon field="aumUsd" />
                  </div>
                </th>
                <th 
                  className="px-8 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right cursor-pointer hover:text-foreground transition-colors group"
                  onClick={() => handleSort('dailyChangeUsd')}
                >
                  <div className="flex items-center justify-end">
                    Change ($) <SortIcon field="dailyChangeUsd" />
                  </div>
                </th>
                <th 
                  className="px-8 py-4 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] text-right cursor-pointer hover:text-foreground transition-colors group"
                  onClick={() => handleSort('dailyChangePercent')}
                >
                  <div className="flex items-center justify-end">
                    Change (%) <SortIcon field="dailyChangePercent" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedPortfolio.map((item, index) => (
                <tr key={`${item.ticker}-${index}`} className="hover:bg-indigo-500/[0.03] transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex flex-col gap-0.5">
                      <div className="font-black text-base text-foreground group-hover:text-indigo-400 transition-colors tracking-tight">
                        {item.ticker}
                      </div>
                      <div className="text-[11px] font-medium text-muted-foreground truncate max-w-[200px]">
                        {item.securityName}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right font-mono text-sm text-muted-foreground">
                    {item.quantity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-8 py-5 text-right font-bold text-foreground">
                    {formatCurrency(item.aumUsd)}
                  </td>
                  <td className={`px-8 py-5 text-right font-bold ${item.dailyChangeUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {item.dailyChangeUsd >= 0 ? '+' : ''}{formatCurrency(item.dailyChangeUsd)}
                  </td>
                  <td className="px-8 py-5 text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black tracking-tight ${
                      item.dailyChangePercent >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {item.dailyChangePercent >= 0 ? '+' : ''}{formatPercent(item.dailyChangePercent)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, description, icon, trend }: { 
  title: string; 
  value: string; 
  description: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-7 shadow-lg relative overflow-hidden group hover:border-indigo-500/50 transition-all">
      <div className={`absolute top-0 left-0 w-full h-1 ${
        trend === 'up' ? 'bg-emerald-500' : trend === 'down' ? 'bg-rose-500' : 'bg-indigo-500'
      }`} />
      
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em]">{title}</p>
          <div className="flex flex-col">
            <h2 className={`text-3xl font-black tracking-tighter ${
              trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-foreground'
            }`}>
              {value}
            </h2>
          </div>
        </div>
        <div className="bg-muted p-3 rounded-xl border border-border group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
      
      <p className="text-xs font-medium text-muted-foreground">{description}</p>
    </div>
  );
}
