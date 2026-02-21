# ChefFlow V1 — Project Map

> **For agents:** Check this BEFORE exploring the codebase. Most questions about "where is X?" are answered here.

## Stack

Next.js 14 App Router · Supabase (PostgreSQL) · Stripe · Tailwind · Ollama (local AI) · Resend (email) · Playwright (E2E)

## Codebase Size

~1,900 TS/TSX files · 233 SQL migrations · 450+ docs · 85 component folders · 134 lib modules

---

## App Routes (`app/`)

### `(chef)/` — Chef Dashboard (53 subdirectories)

**Core:** dashboard, events, clients, quotes, inquiries, calendar, chat, inbox
**Culinary:** recipes, menus, culinary (ingredients/costing)
**Finance:** finance (revenue/expenses/invoicing), billing, expenses
**Operations:** operations (DOP/equipment/safety), staff, schedule, inventory, production
**Marketing:** marketing, social, testimonials, campaigns, leads
**Client Relations:** reviews, calls, proposals, loyalty, aar (post-event debrief)
**Analytics:** analytics, goals, guest-analytics
**Settings:** settings (profile/integrations/preferences/billing/compliance)
**Other:** network, partners, travel, onboarding, help, import, community, cannabis, waitlist, wellness, contractors, dev

### `(client)/` — Client Portal (10 subdirectories)

my-events, my-quotes, my-inquiries, my-chat, my-profile, my-spending, my-rewards, book-now, survey, my-cannabis

### `(public)/` — Public Pages (12 subdirectories)

availability, chef/[slug], chefs, pricing, contact, partner-signup, share (RSVP), g (short links), privacy, terms, cannabis-invite, unsubscribe

### `auth/` — Authentication

signin, signup, role-selection, forgot-password, reset-password, verify-email, client-signup, partner-signup, callback

### `api/` — API Routes

auth, stripe (webhooks), cron, webhooks (Wix/Gmail), health, calendar, documents, social, push, scheduled, integrations, gmail, e2e, v1, public, ollama-status

### Other Routes

book/[chefSlug], menus/[id], recipes/[id], client/[token], (admin)/admin, (partner)/partner

---

## Components (`components/`) — 614 files, 85 folders

**Largest by file count:**
events (70), ui (32), ai (30), settings (28), clients (28), social (23), finance (22), dashboard (20), analytics (20), chat (19), goals (18), inquiries (16), quotes (16), recipes (15), menus (14), scheduling (12), protection (12), admin (11), activity (11), sharing (10), partners (10), notifications (11), loyalty (10), staff (9), journey (9)

**UI base components (`components/ui/`):** Button, Badge, Card, Input, Modal, Dialog, Select, Textarea, Skeleton, Tabs, Tooltip, etc.

---

## Business Logic (`lib/`) — 667 files, 134 modules

**Largest by file count:**
ai (68), events (31), clients (30), analytics (26), finance (24), documents (19), scheduling (18), activity (12), staff (10), notifications (10), simulation (9), goals (9), stripe (8), professional (8), marketing (8), gmail (8), admin (8), inquiries (7), social (6), protection (6), loyalty (6), calendar (6), automations (6)

**Critical modules:**

- `lib/events/transitions.ts` — 8-state FSM
- `lib/ledger/append.ts` + `compute.ts` — immutable financial ledger
- `lib/ai/parse-ollama.ts` — local AI (private data)
- `lib/ai/ollama-errors.ts` — OllamaOfflineError class
- `lib/auth/` — requireChef(), requireClient(), requireAuth()
- `lib/supabase/` — database client, RLS
- `lib/stripe/` — payment processing
- `lib/email/` — 10+ transactional email templates

---

## Database (`supabase/migrations/`) — 233 files

**Schema layers (foundation):**

- Layer 1 (`20260215000001`): auth, tenants, chefs, clients
- Layer 2 (`20260215000002`): inquiries, messaging
- Layer 3 (`20260215000003`): events, quotes, financials
- Layer 4 (`20260215000004`): menus, recipes, costing

**Timestamp range:** 20260215 → 20260322
**Highest timestamp:** check with `glob supabase/migrations/*.sql` before creating new ones

---

## Documentation (`docs/`) — 450+ files

**Start here:**

- `CLAUDE.md` — project rules (mandatory)
- `docs/AGENT-WORKFLOW.md` — agent playbook
- `docs/AI_POLICY.md` — AI usage rules
- `docs/PROJECT-MAP.md` — this file

**Architecture:**

- `CHEFFLOW_CORE_REFERENCE.md`, `CORE_SYSTEM_ARCHITECTURE_MASTER.md`
- `DATABASE_SCHEMA_DESIGN.md`, `LEDGER_FIRST_FINANCIAL_MODEL.md`
- `SECURITY_AND_ISOLATION_MASTER.md`, `ACCESS_CONTROL_MATRIX.md`

**Every feature has a doc** — search `docs/` for the feature name before building something that might already exist.

---

## Config Files (key ones)

| File                           | Purpose                                             |
| ------------------------------ | --------------------------------------------------- |
| `next.config.js`               | PWA (disabled by default), Sentry, security headers |
| `middleware.ts`                | Auth redirects, role routing, security              |
| `vercel.json`                  | ignoreCommand blocks feature branch deploys         |
| `tailwind.config.ts`           | Custom theme                                        |
| `playwright.config.ts`         | E2E test setup (7 projects)                         |
| `.claude/hooks/build-guard.sh` | Blocks builds during multi-agent mode               |
| `.claude/settings.json`        | Wires build guard hook                              |
| `.auth/agent.json`             | Agent test account credentials                      |

---

## Scripts (`scripts/`) — 30 files

Verification: `verify-supabase.ts`, `verify-routes.ts`, `verify-rls-*.sql`
Seeding: `seed-local-demo.ts`, `seed-e2e-remote.ts`
Agent: `setup-agent-account.ts`

---

## Types

`types/database.ts` — auto-generated from Supabase. Never edit manually. Regenerate with `npm run supabase:types`.
