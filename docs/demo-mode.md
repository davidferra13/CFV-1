# Demo Mode System

A dedicated demo environment for showcasing ChefFlow to prospective chef-customers without exposing real business data.

## Quick Start

```bash
# 1. Create demo accounts (one-time)
npm run demo:setup

# 2. Add to .env.local
DEMO_MODE_ENABLED=true

# 3. Load sample data
npm run demo:load

# 4. Visit the control panel
# http://localhost:3100/demo
```

## What It Creates

### Demo Accounts

| Account     | Email                       | Password              | Role   | Portal       |
| ----------- | --------------------------- | --------------------- | ------ | ------------ |
| Demo Chef   | `demo@chefflow.test`        | `DemoChefFlow!2026`   | Chef   | `/dashboard` |
| Demo Client | `demo-client@chefflow.test` | `DemoClientFlow!2026` | Client | `/my-events` |

- **Demo chef** = "Chef Isabella Torres" / "Ember & Sage Kitchen"
- **NOT an admin** — no admin portal visible during demos
- **Pro tier by default** — toggleable to Free via control panel
- Credentials stored in `.auth/demo-chef.json` and `.auth/demo-client.json` (gitignored)

### Demo Data

| Entity         | Count | Notes                                             |
| -------------- | ----- | ------------------------------------------------- |
| Clients        | 10    | Varied dietary needs, allergies, loyalty tiers    |
| Events         | 18    | 2+ in each of the 8 FSM states                    |
| Inquiries      | 6     | new, awaiting_client, quoted, converted, declined |
| Menus          | 5     | With 3-5 courses each                             |
| Recipes        | 12    | With ingredients and costing                      |
| Quotes         | 6     | draft, sent, accepted                             |
| Ledger Entries | 12    | Deposits, payments, tips                          |
| Expenses       | 8     | Groceries, equipment, labor                       |
| Calendar       | 6     | Upcoming availability signals                     |

All dates are relative to today — data always looks current.

### Public Profile

- URL: `/chef/chef-demo-showcase`
- Pre-populated with professional bio, tagline, brand colors
- Availability signals enabled for next 6 weeks

## Commands

| Command              | What It Does                                    |
| -------------------- | ----------------------------------------------- |
| `npm run demo:setup` | Creates demo chef + client accounts in Supabase |
| `npm run demo:load`  | Loads rich sample data into demo tenant         |
| `npm run demo:clear` | Clears all demo data (preserves accounts)       |
| `npm run demo:reset` | Clears + reloads (fresh dates)                  |

## Control Panel (`/demo`)

The control panel at `/demo` provides:

- **Account switching** — One-click login as demo chef or demo client
- **Public profile link** — Opens `/chef/chef-demo-showcase` in new tab
- **Data management** — Load or clear demo data from the browser
- **Tier toggle** — Switch between Pro and Free to demo both experiences

### Environment Gate

The control panel and all `/api/demo/*` endpoints require:

```
DEMO_MODE_ENABLED=true
```

This is **never set in production**. Without it, `/demo` returns 404 and all API routes return 403.

## Demo Workflow

### Before a Demo

```bash
npm run demo:reset   # Fresh data with current dates
```

### During a Demo

1. Open `/demo` control panel
2. Click "Log in as Demo Chef" → shows populated chef dashboard
3. Walk through features: events pipeline, calendar, menus, recipes, financials
4. Click "Log in as Demo Client" → shows client portal
5. Open `/chef/chef-demo-showcase` → shows public profile
6. Toggle "Free Mode" → shows upgrade gates and free tier limitations
7. Click "Clear All Data" → shows the fresh/empty new-chef experience

### Showing Both States

- **Populated**: Run `demo:load` or click "Load Demo Data"
- **Empty (fresh signup)**: Click "Clear All Data" — shows what a brand-new chef sees

## Security

- Demo chef email (`demo@chefflow.test`) is **never** in `ADMIN_EMAILS`
- All API routes gated on `DEMO_MODE_ENABLED=true`
- Demo data lives in its own tenant — RLS isolates it from real data
- Credentials stored in `.auth/` (gitignored)
- Demo switch API uses `signInWithPassword` (not service role key)

## Architecture

### Files

| File                             | Purpose                             |
| -------------------------------- | ----------------------------------- |
| `scripts/setup-demo-accounts.ts` | Creates demo chef + client accounts |
| `scripts/demo-data-load.ts`      | CLI data loader                     |
| `scripts/demo-data-clear.ts`     | CLI data clearer                    |
| `lib/demo/fixtures.ts`           | All demo data constants             |
| `lib/demo/seed-helpers.ts`       | Idempotent ensure\* functions       |
| `app/(demo)/demo/page.tsx`       | Control panel UI                    |
| `app/(demo)/layout.tsx`          | Env-gated layout                    |
| `app/api/demo/switch/route.ts`   | Account switching endpoint          |
| `app/api/demo/tier/route.ts`     | Tier toggle endpoint                |
| `app/api/demo/data/route.ts`     | Data load/clear endpoint            |

### Middleware

- `/demo` added to `skipAuthPaths` (no auth required)
- `/api/demo` added to API bypass list (no auth required)
- Security enforced by `DEMO_MODE_ENABLED` env var check in each route
