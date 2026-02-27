# Mission Control — Project Expenses Panel

## Overview

The Expenses panel in Mission Control tracks every cost that has gone into building ChefFlow — AI agent costs, hardware, cloud services, APIs, domains, and software subscriptions. It provides a single dashboard view of all project expenses with the ability to add new entries.

## How It Works

### Data File

- **Location:** `docs/project-expenses.json`
- **Format:** JSON with `categories` (7 expense types) and `entries` (individual expenses)
- **Each entry has:** `id`, `category`, `name`, `totalSpent`, `monthlyRate`, `date`, `notes`
- **The file is the source of truth** — editable by hand or via the Mission Control UI

### API Endpoints (server.mjs)

| Method | Path            | Description                                                         |
| ------ | --------------- | ------------------------------------------------------------------- |
| GET    | `/api/expenses` | Returns the full expenses JSON                                      |
| POST   | `/api/expenses` | Adds a new expense entry (auto-generates ID, updates `lastUpdated`) |

### UI (index.html)

- **Nav:** "Costs" item with money bag icon in sidebar
- **Keyboard shortcut:** Backtick (`` ` ``) jumps to the panel
- **Summary cards:** Total Invested, Monthly Burn, Hardware, Agent Costs
- **Category breakdown:** Grouped by category with per-item details and free/paid indicators
- **Add form:** Name, Category, Total Spent, Monthly Rate, Notes — saves to JSON file

### JavaScript Functions

| Function               | Purpose                                                        |
| ---------------------- | -------------------------------------------------------------- |
| `loadExpenses()`       | Fetches `/api/expenses` and calls `renderExpenses()`           |
| `renderExpenses(data)` | Computes totals, renders summary cards + category breakdown    |
| `addExpense()`         | Reads form fields, POSTs to `/api/expenses`, refreshes display |

## Categories

| Key              | Label                       | Icon      |
| ---------------- | --------------------------- | --------- |
| `ai-agents`      | AI Agent Costs              | Robot     |
| `hardware`       | Hardware                    | Computer  |
| `cloud-services` | Cloud Services & Hosting    | Cloud     |
| `domain`         | Domain & Registration       | Globe     |
| `apis`           | APIs & Third-Party Services | Plug      |
| `software`       | Software & Subscriptions    | Package   |
| `other`          | Other                       | Clipboard |

## Pre-Populated Entries (33 items)

The data file ships with 33 entries covering:

- **AI:** Claude Code (~$50 total)
- **Hardware:** PC components (~$1,370 shared), Pi 5 + accessories (~$116 dedicated)
- **Cloud:** Vercel, Supabase, Cloudflare, GitHub, Resend, Sentry, PostHog, Upstash, OneSignal, Cloudinary (all free tier)
- **Domain:** cheflowhq.com (~$6.50/year via Cloudflare Registrar)
- **APIs:** Spoonacular, Kroger, USDA, Geocodio, API Ninjas, Unsplash, Pexels, Mapbox, Gemini, Open-Meteo/Nager.Date/Frankfurter/IP-API (all free tier)
- **Software:** Ollama, NordVPN (personal), Next.js stack (all free/open source)

## Updating Expenses

### Via Mission Control UI

1. Open Mission Control (`http://localhost:41937`)
2. Press `` ` `` or click "Costs" in the sidebar
3. Scroll to "Add New Expense" form
4. Fill in fields and click "Add Expense"

### Via JSON file

Edit `docs/project-expenses.json` directly. Follow the existing entry format.

## Files Changed

| File                          | Change                                                             |
| ----------------------------- | ------------------------------------------------------------------ |
| `docs/project-expenses.json`  | **New** — master expense data                                      |
| `scripts/launcher/index.html` | Added nav item, keyboard shortcut, panel HTML, JS functions        |
| `scripts/launcher/server.mjs` | Added `/api/expenses` GET/POST endpoints, added `writeFile` import |
