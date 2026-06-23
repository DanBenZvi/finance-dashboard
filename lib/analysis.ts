import { HistoryItem, PortfolioItem } from "./google-sheets";

export interface PortfolioAnalytics {
  totalReturn: number;
  totalInvested: number;
  currentAUM: number;
  unrealizedPL: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  avgDailyReturn: number;
  winRate: number;
  bestPerformer: { ticker: string; return: number } | null;
  worstPerformer: { ticker: string; return: number } | null;
  concentrationScore: number;
  healthScore: number;
  healthLabel: "Excellent" | "Good" | "Moderate" | "At Risk";
  healthColor: "emerald" | "green" | "amber" | "rose";
  topHoldings: { ticker: string; share: number }[];
  generatedInsights: string[];
}

export function computeAnalytics(
  history: HistoryItem[],
  portfolio: PortfolioItem[],
  riskFreeRate = 4.5
): PortfolioAnalytics {
  const valid = history.filter(h => h.aumUsd > 0 && h.totalInvestedUsd > 0);

  const last = valid[valid.length - 1];
  const currentAUM     = last?.aumUsd ?? 0;
  const totalInvested  = last?.totalInvestedUsd ?? 0;
  const unrealizedPL   = currentAUM - totalInvested;
  const totalReturn    = totalInvested > 0 ? (unrealizedPL / totalInvested) * 100 : 0;

  // Daily returns
  const daily: number[] = [];
  for (let i = 1; i < valid.length; i++) {
    const prev = valid[i - 1].aumUsd;
    const curr = valid[i].aumUsd;
    if (prev > 0) daily.push(((curr - prev) / prev) * 100);
  }

  const n = daily.length;
  const avgDailyReturn = n > 0 ? daily.reduce((a, b) => a + b, 0) / n : 0;
  const variance = n > 0
    ? daily.reduce((acc, r) => acc + Math.pow(r - avgDailyReturn, 2), 0) / n
    : 0;
  const dailyStd = Math.sqrt(variance);
  const volatility = dailyStd * Math.sqrt(252);
  const annualReturn = avgDailyReturn * 252;
  const sharpeRatio = volatility > 0 ? (annualReturn - riskFreeRate) / volatility : 0;

  // Max drawdown
  let maxDrawdown = 0;
  let peak = -Infinity;
  for (const h of valid) {
    if (h.aumUsd > peak) peak = h.aumUsd;
    const dd = peak > 0 ? ((peak - h.aumUsd) / peak) * 100 : 0;
    if (dd > maxDrawdown) maxDrawdown = dd;
  }

  const winRate = n > 0 ? (daily.filter(r => r > 0).length / n) * 100 : 0;

  // Best / worst by changeFromBuyPrice
  const sorted = [...portfolio].sort((a, b) => b.changeFromBuyPrice - a.changeFromBuyPrice);
  const bestPerformer  = sorted.length > 0 ? { ticker: sorted[0].ticker, return: sorted[0].changeFromBuyPrice } : null;
  const worstPerformer = sorted.length > 0 ? { ticker: sorted[sorted.length - 1].ticker, return: sorted[sorted.length - 1].changeFromBuyPrice } : null;

  // Concentration (HHI)
  const totalAum = portfolio.reduce((s, p) => s + p.aumUsd, 0);
  const concentrationScore = totalAum > 0
    ? portfolio.reduce((acc, p) => acc + Math.pow(p.aumUsd / totalAum, 2), 0)
    : 0;

  const topHoldings = [...portfolio]
    .sort((a, b) => b.aumUsd - a.aumUsd)
    .slice(0, 5)
    .map(p => ({ ticker: p.ticker, share: totalAum > 0 ? (p.aumUsd / totalAum) * 100 : 0 }));

  // Health score (0–100)
  const sharpeScore       = Math.min(40, Math.max(0, (sharpeRatio + 1) * 20));
  const drawdownScore     = Math.max(0, 20 - maxDrawdown * 0.5);
  const winScore          = (winRate / 100) * 20;
  const concentrationPen  = Math.min(20, concentrationScore * 20);
  const healthScore = Math.round(
    Math.min(100, Math.max(0, sharpeScore + drawdownScore + winScore + (20 - concentrationPen)))
  );

  const healthLabel = healthScore >= 75 ? "Excellent" : healthScore >= 55 ? "Good" : healthScore >= 35 ? "Moderate" : "At Risk";
  const healthColor = healthScore >= 75 ? "emerald" : healthScore >= 55 ? "green" : healthScore >= 35 ? "amber" : "rose";

  // Narrative insights derived from actual data
  const insights: string[] = [];

  if (bestPerformer && bestPerformer.return > 20) {
    insights.push(`${bestPerformer.ticker} is your standout position, up ${bestPerformer.return.toFixed(1)}% from entry.`);
  }
  if (worstPerformer && worstPerformer.return < -10) {
    insights.push(`${worstPerformer.ticker} is dragging returns at ${worstPerformer.return.toFixed(1)}%. Consider reviewing your thesis.`);
  }
  if (concentrationScore > 0.3) {
    insights.push(`Portfolio is highly concentrated (HHI ${concentrationScore.toFixed(2)}). Top holding: ${topHoldings[0]?.ticker} at ${topHoldings[0]?.share.toFixed(0)}%.`);
  } else if (concentrationScore < 0.1) {
    insights.push(`Well-diversified portfolio with ${portfolio.length} holdings.`);
  }
  if (sharpeRatio > 1.5) {
    insights.push(`Excellent risk-adjusted return: Sharpe of ${sharpeRatio.toFixed(2)} — well above the 1.0 benchmark.`);
  } else if (sharpeRatio < 0) {
    insights.push(`Negative Sharpe (${sharpeRatio.toFixed(2)}) — portfolio is underperforming the risk-free rate on a risk-adjusted basis.`);
  }
  if (maxDrawdown > 25) {
    insights.push(`Max drawdown of ${maxDrawdown.toFixed(1)}% signals significant historical volatility.`);
  }
  if (winRate > 60) {
    insights.push(`${winRate.toFixed(0)}% daily win rate — the portfolio is profitable more days than not.`);
  }
  if (totalReturn > 0) {
    insights.push(`Total unrealized gain: $${unrealizedPL.toLocaleString('en-US', { maximumFractionDigits: 0 })} (+${totalReturn.toFixed(2)}%) on $${totalInvested.toLocaleString('en-US', { maximumFractionDigits: 0 })} invested.`);
  }

  return {
    totalReturn, totalInvested, currentAUM, unrealizedPL,
    sharpeRatio, maxDrawdown, volatility, avgDailyReturn, winRate,
    bestPerformer, worstPerformer,
    concentrationScore, healthScore, healthLabel, healthColor,
    topHoldings, generatedInsights: insights,
  };
}
