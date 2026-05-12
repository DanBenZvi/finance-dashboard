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
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xl h-fit">
      <div className="mb-2">
        <h3 className="font-bold text-base sm:text-lg text-foreground tracking-tight">Portfolio Allocation</h3>
        <p className="text-[10px] sm:text-xs text-muted-foreground">Distribution by AUM ($)</p>
      </div>
      
      <div className="h-[300px] sm:h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ReChartsPie>
            <RechartsTooltip 
              contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
              itemStyle={{ color: 'var(--foreground)', fontSize: '10px sm:12px', fontWeight: 'bold' }}
              formatter={(value: number, name: string) => [formatCurrency(value), name]}
            />
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
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
              align="center"
              layout="horizontal"
              wrapperStyle={{ paddingTop: '10px sm:20px' }}
              iconType="circle"
              formatter={(value) => <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{value}</span>}
            />
          </ReChartsPie>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
