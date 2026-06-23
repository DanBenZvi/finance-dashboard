# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js 16 + Turbopack) on http://localhost:3000
npm run build    # Production build
npm run start    # Serve production build
npm run lint     # ESLint
```

No test suite exists. Verification is done by running the dev server and hitting routes with curl or a browser.

## Architecture

**Stack:** Next.js 16.2.7 (App Router, Turbopack), TypeScript, Tailwind CSS, Recharts, `googleapis`, `yahoo-finance2`.

**Data sources:**
- **Google Sheets** — primary database. All portfolio holdings, daily history, market watch list, and economic indicators live there. `lib/google-sheets.ts` owns the fetching and parsing logic (`fetchAllData()` is the single entry point, called only in the server component `app/page.tsx`).
- **Yahoo Finance** (`yahoo-finance2`) — used exclusively by the Simulator feature via `app/api/simulator/data/route.ts`.

**Request flow:**
```
Browser → proxy.ts (middleware) → app/page.tsx (Server Component)
                                      └── fetchAllData() → Google Sheets API
                                          └── <DashboardShell data={...} /> (Client Component)
```

The SSR page always fetches fresh data (`export const dynamic = 'force-dynamic'`). There is no caching layer.

**Middleware file:** `proxy.ts` (not `middleware.ts`). Next.js 16 recognises this file as middleware. It exports `proxy` (function name is irrelevant in Next.js 16; file name matters). The `config.matcher` export controls which routes it intercepts.

**Authentication:** Cookie-only (`dashboard_auth=authenticated`, 7-day, HttpOnly). Set by `app/api/auth/route.ts` after comparing the request body `password` against `DASHBOARD_PASSWORD` env var. The middleware lets `/login`, `/api/auth`, and `/api/simulator/**` through unauthenticated.

**Three UI tabs** (managed as client state in `DashboardShell.tsx`):
1. **Portfolio Overview** — `PortfolioOverview` (holdings table + metric cards) + `AllocationChart` (donut) + `PortfolioPerformanceChart` (AUM vs invested) + `AumChart` (history area chart)
2. **Market Watch** — `MarketWatch` (gainers/losers + watchlist from Sheets)
3. **Simulator** — `Simulator` (client-only; builds a backtesting portfolio via `/api/simulator/data` calls; all logic is in-browser)

**Path alias:** `@/*` resolves to the repo root (e.g. `@/lib/google-sheets`, `@/components/dashboard/...`).

**Theming:** CSS variables in `globals.css` for dark/light. Tailwind `darkMode: 'class'` + `next-themes`. Default is dark.

## Google Sheets Layout

`fetchAllData()` pulls these ranges in parallel:
| Range | Content |
|---|---|
| `Portfolio!A2:O100` | Holdings: name, ticker, quantity, AUM ILS, AUM USD, share%, change-from-buy, purchase price, total purchase, share price, daily Δ$ (col N), daily Δ% (col O) |
| `MarketWatch!A2:G` | External watchlist: ticker, name, industry, daily%, monthly%, YTD%, market cap |
| `Daily History!A2:D` | Date, AUM USD, daily profit USD, total invested USD |
| `Portfolio!A26:C35` | Economic indicators (interest rate lookup by label match) |
| `USD_ILS` (named range) | Single cell with USD/ILS rate |

Dates in the sheet use MM/DD/YYYY; `parseCustomDate()` handles this. `parseNumeric()` strips currency symbols, commas, and parenthetical negatives.

## Environment Variables

Required in `.env.local`:
```
GOOGLE_SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=            # PEM key with literal \n newlines
DASHBOARD_PASSWORD=
```

## Known Issues / Gotchas

- **Turbopack workspace root warning** at startup: Next.js finds a `package-lock.json` in a parent iCloud directory and picks the wrong root. Non-breaking but noisy. Fix: add `turbopack: { root: import.meta.dirname }` to `next.config.mjs`.
- **"AI Insight" card in Simulator** (`Simulator.tsx` ~line 730) is hardcoded static text — not derived from portfolio data.
- **Title says `[VERIFIED]`** in `app/layout.tsx` — a stale string from a previous debug commit.
- The `app/api/simulator/data/route.ts` has a ticker fallback chain for Israeli tickers (`.TA` suffix, `^` prefix, numeric fund codes). When adding new ticker types, extend `fetchWithFallback()`.
