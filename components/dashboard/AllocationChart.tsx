"use client";

import { PortfolioItem } from "@/lib/google-sheets";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { PieChart as ReChartsPie, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";

interface AllocationChartProps {
  portfolio: PortfolioItem[];
}

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', 
  '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#a855f7'
];

export function AllocationChart({ portfolio }: AllocationChartProps) {
  const data = portfolio
    .filter(item => item.aumUsd > 0)
    .map(item => ({
      name: item.ticker,
      value: item.aumUsd
    }))
    .sort((a, b) => b.value - a.value);

  // Group smaller holdings into "Others" if more than 8
  const displayData = data.length > 8 
    ? [...data.slice(0, 7), { name: 'Others', value: data.slice(7).reduce((s, i) => s + i.value, 0) }]
    : data;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xl h-full flex flex-col">
      <div className="mb-4">
        <h3 className="font-bold text-lg text-foreground tracking-tight">Portfolio Allocation</h3>
        <p className="text-xs text-muted-foreground">Distribution by AUM ($)</p>
      </div>
      
      <div className="flex-1 min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ReChartsPie>
            <RechartsTooltip 
              contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
              itemStyle={{ color: 'var(--foreground)', fontSize: '12px', fontWeight: 'bold' }}
              formatter={(value: number) => [formatCurrency(value), 'AUM']}
            />
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {displayData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Legend 
              verticalAlign="bottom" 
              height={36}
              iconType="circle"
              formatter={(value) => <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{value}</span>}
            />
          </ReChartsPie>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
