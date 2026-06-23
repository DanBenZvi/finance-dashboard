import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildPrompt(body: Record<string, unknown>, lang: "en" | "he"): string {
  const portfolio = body.portfolio as Array<{ ticker: string; securityName: string; aumUsd: number; shareOfPortfolio: number; changeFromBuyPrice: number; dailyChangePercent: number }> ?? [];
  const analytics = body.analytics as Record<string, number | string | null | { ticker: string; return: number } | Array<{ ticker: string; share: number }>> ?? {};
  const indicators = body.indicators as Record<string, number | string> ?? {};
  const totalAum = typeof analytics.currentAUM === "number" ? analytics.currentAUM : 0;

  const holdingsText = portfolio
    .sort((a, b) => b.aumUsd - a.aumUsd)
    .map(h => {
      const weight = totalAum > 0 ? ((h.aumUsd / totalAum) * 100).toFixed(1) : "?";
      const chg = h.changeFromBuyPrice != null ? `${h.changeFromBuyPrice >= 0 ? "+" : ""}${h.changeFromBuyPrice.toFixed(1)}% מהכניסה` : "";
      const daily = h.dailyChangePercent != null ? `, ${h.dailyChangePercent >= 0 ? "+" : ""}${h.dailyChangePercent.toFixed(2)}% היום` : "";
      if (lang === "he") return `  • ${h.ticker} (${h.securityName}): $${h.aumUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })} (${weight}% מהתיק) — ${chg}${daily}`;
      return `  • ${h.ticker} (${h.securityName}): $${h.aumUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })} (${weight}% of portfolio) — ${h.changeFromBuyPrice >= 0 ? "+" : ""}${h.changeFromBuyPrice.toFixed(1)}% from entry, ${h.dailyChangePercent >= 0 ? "+" : ""}${h.dailyChangePercent.toFixed(2)}% today`;
    })
    .join("\n");

  const best = analytics.bestPerformer as { ticker: string; return: number } | null;
  const worst = analytics.worstPerformer as { ticker: string; return: number } | null;

  const dataBlock = `
AUM: $${(analytics.currentAUM as number ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
השקעה: $${(analytics.totalInvested as number ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
רווח/הפסד לא ממומש: $${(analytics.unrealizedPL as number ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} (${(analytics.totalReturn as number ?? 0).toFixed(2)}%)
מספר אחזקות: ${portfolio.length}
Sharpe Ratio: ${(analytics.sharpeRatio as number ?? 0).toFixed(2)}
ירידה מקסימלית: -${(analytics.maxDrawdown as number ?? 0).toFixed(1)}%
תנודתיות שנתית: ${(analytics.volatility as number ?? 0).toFixed(1)}%
אחוז ימים רווחיים: ${(analytics.winRate as number ?? 0).toFixed(0)}%
ריכוזיות (HHI): ${(analytics.concentrationScore as number ?? 0).toFixed(3)}
ציון בריאות: ${analytics.healthScore}/100 (${analytics.healthLabel})
מניה מובילה: ${best ? `${best.ticker} +${best.return.toFixed(1)}% מהכניסה` : "N/A"}
מניה מפגרת: ${worst ? `${worst.ticker} ${worst.return.toFixed(1)}% מהכניסה` : "N/A"}
ריבית בנק ישראל: ${indicators.israelInterest}%
USD/ILS: ${typeof indicators.usdIls === "number" ? indicators.usdIls.toFixed(3) : indicators.usdIls}

אחזקות:
${holdingsText}`;

  if (lang === "he") {
    return `אתה אנליסט תיקי השקעות מקצועי ישראלי. כתוב ניתוח מעמיק ואישי של תיק ההשקעות הבא בעברית טבעית וזורמת — כפי שאנליסט ישראלי מנוסה היה כותב ללקוח, לא תרגום מאנגלית.
${dataBlock}

כתוב דוח מודיעין תיק חד ומותאם אישית הכולל:

1. **הערכת מצב כוללת** — פרש את ציון הבריאות, ה-Sharpe והירידה המקסימלית בשפה יומיומית. האם התיק במצב טוב?

2. **סיכונים עיקריים** — זהה 2–3 סיכונים מרכזיים הספציפיים לתיק הזה (ריכוזיות, חשיפה לירידות, רגישות מאקרו וכו')

3. **אחזקות בולטות** — התייחס לטובה ולגרועה עם הקשר פעולתי. מה הנתונים מציעים על כל אחת?

4. **הזדמנויות ונקודות עיוורות** — מה כדאי לשקול? הסתכל על איזון מחדש, פערים סקטוריאליים, רוחות גב/נגד מאקרו

5. **קריאה אחת לפעולה** — המלצה ספציפית ופעולתית אחת, ברורה וחדה

6. **צעדים לביצוע עכשיו** — רשום 3 פעולות קונקרטיות שהמשקיע יכול לבצע השבוע, ממוינות לפי עדיפות. כל פעולה: מה לעשות, באיזה נייר ערך, ולמה עכשיו. היה ספציפי — לא "שקול לגוון" אלא "מכור X% מ-[טיקר] ועבור ל-[אפשרות]".

היה ישיר, מבוסס נתונים, תמציתי. ללא מילוי. חשוב כמנהל תיקים שקיבל את ה-P&L הזה לסקירה של 10 דקות. השתמש במספרים.`;
  }

  return `You are a professional portfolio analyst providing a real-time assessment of a personal investment portfolio.

PORTFOLIO SNAPSHOT
──────────────────
Total AUM: $${(analytics.currentAUM as number ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
Total Invested: $${(analytics.totalInvested as number ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}
Unrealized P&L: $${(analytics.unrealizedPL as number ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} (${(analytics.totalReturn as number ?? 0).toFixed(2)}%)
Holdings: ${portfolio.length} positions

RISK METRICS
────────────
Sharpe Ratio: ${(analytics.sharpeRatio as number ?? 0).toFixed(2)}
Max Drawdown: -${(analytics.maxDrawdown as number ?? 0).toFixed(1)}%
Annualised Volatility: ${(analytics.volatility as number ?? 0).toFixed(1)}%
Daily Win Rate: ${(analytics.winRate as number ?? 0).toFixed(0)}%
Concentration (HHI): ${(analytics.concentrationScore as number ?? 0).toFixed(3)}
Portfolio Health Score: ${analytics.healthScore}/100 (${analytics.healthLabel})

BEST PERFORMER: ${best ? `${best.ticker} +${best.return.toFixed(1)}% from entry` : "N/A"}
WORST PERFORMER: ${worst ? `${worst.ticker} ${worst.return.toFixed(1)}% from entry` : "N/A"}

MACRO CONTEXT
─────────────
Israeli Bank Interest Rate: ${indicators.israelInterest}%
USD/ILS: ${typeof indicators.usdIls === "number" ? indicators.usdIls.toFixed(3) : indicators.usdIls}

HOLDINGS BREAKDOWN
──────────────────
${holdingsText}

TASK
────
Provide a sharp, personalised portfolio intelligence report covering:

1. **Overall Health Assessment** — interpret the health score, Sharpe, and drawdown in plain language. Is this portfolio in good shape?

2. **Top Risks** — identify the 2–3 most pressing risks specific to this portfolio's composition and metrics

3. **Standout Positions** — call out the best and worst performers with actionable context

4. **Opportunities & Blind Spots** — rebalancing opportunities, sector gaps, macro tailwinds/headwinds

5. **One Conviction Call** — one specific, sharp recommendation

6. **Actions to Take Now** — list 3 concrete steps the investor can execute this week, ranked by priority. For each: what to do, which ticker, and why now. Be specific — not "consider diversifying" but "sell X% of [ticker] and rotate into [option]".

Be direct, data-driven, and concise. No filler. Think like a portfolio manager who's been handed this P&L for a 10-minute review. Use the numbers.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const lang: "en" | "he" = body.lang === "he" ? "he" : "en";
    const prompt = buildPrompt(body, lang);

    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const stream = client.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 1800,
          thinking: { type: "adaptive" },
          messages: [{ role: "user", content: prompt }],
        });
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            await writer.write(encoder.encode(chunk.delta.text));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const match = msg.match(/"message":"([^"]+)"/);
        await writer.write(encoder.encode(`__ERROR__:${match ? match[1] : msg}`));
      } finally {
        await writer.close().catch(() => {});
      }
    })();

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
