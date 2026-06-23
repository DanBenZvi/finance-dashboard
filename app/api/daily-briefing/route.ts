import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildPrompt(
  movers: string,
  newsBlock: string,
  direction: string,
  absChange: string,
  totalDailyChangePct: number,
  totalAum: number,
  lang: "en" | "he"
): string {
  const aumFmt = totalAum.toLocaleString("en-US", { maximumFractionDigits: 0 });
  const pctStr = `${totalDailyChangePct >= 0 ? "+" : ""}${totalDailyChangePct.toFixed(2)}%`;

  if (lang === "he") {
    return `אתה אנליסט השקעות ישראלי המדבר עם לקוח פרטי ישירות. תיק ההשקעות של הלקוח ${direction === "UP" ? "עלה" : "ירד"} ב-$${absChange} (${pctStr}) היום, על AUM של $${aumFmt}.

תנועות מרכזיות היום:
${movers || "אין תנועות משמעותיות"}

כותרות רלוונטיות:
${newsBlock || "אין כותרות זמינות"}

ענה על שלוש שאלות בעברית טבעית וזורמת:
1. **למה התיק ${direction === "UP" ? "עלה" : "ירד"} היום?** — חבר את ניירות הערך הספציפיים לכותרות. היה ישיר. ציין שמות של מניות.
2. **מה לעקוב אחריו?** — משפט אחד קצר על הזרז או הסיכון הקרוב לשלושת הימים הבאים.
3. **מה לעשות עכשיו?** — פעולה אחת ספציפית וקונקרטית שהמשקיע יכול לבצע היום או מחר. לא "שקול לגוון" — אלא פעולה ממשית עם שם טיקר ספציפי.

כללים:
- מקסימום 5 משפטים סה"כ
- כתוב כמו שאנליסט ישראלי מדבר בטבעיות — לא תרגום מאנגלית
- שמות טיקרים ומספרים נשארים באנגלית כמות שהם
- ללא גישות כלליות, ללא החרגות אחריות
- אם הכותרות לא מסבירות את התנועה בצורה ברורה, אמור זאת ישירות`;
  }

  return `You are a concise, plain-spoken portfolio analyst. A private investor's portfolio is ${direction} $${absChange} (${pctStr}) today on $${aumFmt} AUM.

TODAY'S MOVERS
${movers || "No significant movers"}

TODAY'S RELEVANT HEADLINES
${newsBlock || "No headlines available"}

Answer three questions in plain English:
1. **Why is the portfolio ${direction} today?** — Connect the specific movers to the headlines. Be direct. Name the culprits.
2. **What should I watch?** — One short sentence on the near-term catalyst or risk to watch over the next 1–3 days.
3. **What should I do now?** — One specific, concrete action the investor can take today or tomorrow. Not "consider diversifying" — an actual move with a specific ticker.

Rules:
- Maximum 5 sentences total
- No filler, no disclaimers
- Be specific — name tickers and connect them to news when you can
- If headlines don't clearly explain the move, say so honestly and point to broader market context instead`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const portfolio = body.portfolio as Array<{ ticker: string; aumUsd: number; dailyChangeUsd: number; dailyChangePercent: number }> ?? [];
    const headlines = body.headlines as Array<{ title: string; publisher: string; relatedTickers: string[] }> ?? [];
    const totalDailyChangeUsd = body.totalDailyChangeUsd as number ?? 0;
    const totalDailyChangePct = body.totalDailyChangePct as number ?? 0;
    const totalAum = body.totalAum as number ?? 0;
    const lang: "en" | "he" = body.lang === "he" ? "he" : "en";

    const movers = portfolio
      .filter(p => Math.abs(p.dailyChangeUsd) > 10)
      .sort((a, b) => Math.abs(b.dailyChangeUsd) - Math.abs(a.dailyChangeUsd))
      .slice(0, 6)
      .map(p => `${p.ticker}: ${p.dailyChangeUsd >= 0 ? "+" : ""}$${p.dailyChangeUsd.toFixed(0)} (${p.dailyChangePercent >= 0 ? "+" : ""}${p.dailyChangePercent.toFixed(2)}%)`)
      .join("\n");

    const newsBlock = headlines
      .slice(0, 12)
      .map(h => `• ${h.title} [${h.relatedTickers.slice(0, 3).join(", ")}]`)
      .join("\n");

    const direction = totalDailyChangeUsd >= 0 ? "UP" : "DOWN";
    const absChange = Math.abs(totalDailyChangeUsd).toFixed(0);

    const prompt = buildPrompt(movers, newsBlock, direction, absChange, totalDailyChangePct, totalAum, lang);

    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      try {
        const stream = client.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 550,
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
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
