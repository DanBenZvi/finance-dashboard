# Dan's Finance Dashboard

A premium financial tracking dashboard built with Next.js, TypeScript, and Google Sheets. This application provides a real-time (on-refresh) view of portfolio performance, historical AUM growth, and market monitoring.

## 🚀 Architecture & Data Flow

### 1. Authentication Flow
The application is protected by a simple password-based authentication mechanism.

*   **Middleware (`middleware.ts`)**: Intercepts all incoming requests. It checks for a cookie named `dashboard_auth`. If the cookie is missing or not set to `authenticated`, it redirects the user to the `/login` page.
*   **Login Page (`app/login/page.tsx`)**: A simple client-side form that captures a password.
*   **Auth API (`app/api/auth/route.ts`)**: Receives the password and compares it against the `DASHBOARD_PASSWORD` environment variable. If it matches, it sets a secure, HTTP-only cookie (`dashboard_auth`) that expires in 7 days.

### 2. Data Acquisition (The Backend)
The application uses Google Sheets as its primary database.

*   **Google Sheets Client (`lib/google-sheets.ts`)**:
    *   Uses a Google Service Account (via `googleapis`) to authenticate.
    *   **`getGoogleSheetsClient()`**: Initializes the JWT auth and returns a Google Sheets API instance.
    *   **`getSheetData(range)`**: A robust wrapper around the Google Sheets API that includes transient error retries (3 attempts) to handle network fluctuations.
    *   **`fetchAllData()`**: The main orchestrator. it fetches multiple ranges in parallel using `Promise.all`:
        *   `Portfolio`: Asset list, quantities, and prices.
        *   `MarketWatch`: External assets to monitor.
        *   `Daily History`: Historical AUM and profit data for charting.
        *   `Economic Indicators`: Interest rates and exchange rates (USD/ILS).
    *   **Data Parsing**: Includes logic to clean currency strings, parse percentages, and convert custom date strings into timestamps.

### 3. Server-Side Rendering (SSR)
*   **Main Page (`app/page.tsx`)**: 
    *   A Server Component that executes on the server.
    *   It calls `fetchAllData()` directly.
    *   It passes the fetched data as a prop to the `DashboardShell` (a Client Component).
    *   Uses `export const dynamic = 'force-dynamic'` to ensure data is always fresh and not cached during build time.

### 4. Component Hierarchy (The Frontend)

#### `DashboardShell.tsx`
The top-level client component that manages the application state (active tab) and layout.
*   **Tabs**: Toggles between "Portfolio Overview" and "Market Watch".
*   **Header**: Displays live economic indicators (Interest rates, FX rates).

#### Portfolio View
*   **`PortfolioOverview.tsx`**: 
    *   Calculates aggregate metrics: Total AUM, Daily Profit/Loss ($), and Weighted Daily Change (%).
    *   Renders a detailed table of all holdings with live performance tracking.
*   **`AllocationChart.tsx`**: 
    *   Uses `recharts` to render a Donut Chart showing asset distribution by AUM.
    *   Automatically groups smaller holdings into an "Others" category.
*   **`AumChart.tsx`**: 
    *   Uses `recharts` (AreaChart) to visualize historical AUM growth.
    *   Handles empty states gracefully if no history is found in the sheet.

#### Market Watch View
*   **`MarketWatch.tsx`**:
    *   Analyzes market data to find top 5 gainers and losers.
    *   Displays a comprehensive watchlist of global assets with Daily, Monthly, and YTD performance.

## 🛠 Tech Stack

*   **Framework**: Next.js 14 (App Router)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **Charts**: Recharts
*   **Icons**: Lucide React
*   **API**: Google Sheets API v4
*   **Deployment**: Optimized for Vercel or any Node.js environment.

## ⚙️ Environment Variables

To run this project, you need the following environment variables:

```env
# Google Sheets Configuration
GOOGLE_SHEET_ID=your_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Security
DASHBOARD_PASSWORD=your_secure_password
```

## 📊 Spreadsheet Structure Requirement

The code expects the following sheets and ranges:
1.  **Portfolio**: Data starting at `A2` (Assets) and `A26` (Indicators).
2.  **MarketWatch**: Data starting at `A2`.
3.  **Daily History**: Data starting at `A2` (Columns: Date, AUM, Daily Profit, Total Invested).
