# External Directory - Build Plan

> Every I/O point in ChefFlow accessible both manually (UI) and programmatically (API).
> This is the step-by-step implementation plan. Each task is concrete and ordered by dependency.

---

## Phase 1: API v2 Shared Infrastructure

**Goal:** Build the reusable middleware layer that all v2 endpoints share. No endpoints yet, just plumbing.

### Task 1.1: API v2 response helpers (`lib/api/v2/response.ts`)

Create standardized JSON response wrappers used by every v2 endpoint.

```ts
// Consistent envelope for all v2 responses
interface ApiResponse<T> {
  data: T
  meta?: { count?: number; page?: number; per_page?: number; total?: number }
}

interface ApiError {
  error: { code: string; message: string; details?: unknown }
}

// Helper functions
export function apiSuccess<T>(data: T, meta?: {...}): NextResponse
export function apiError(code: string, message: string, status: number): NextResponse
export function apiValidationError(errors: z.ZodError): NextResponse
export function apiNotFound(resource: string): NextResponse
export function apiUnauthorized(): NextResponse
export function apiRateLimited(reset: number): NextResponse
```

**Why first:** Every endpoint imports these. Build once, use everywhere.

---

### Task 1.2: API v2 middleware (`lib/api/v2/middleware.ts`)

Extract the repeated auth + rate limit + error handling pattern from v1 into a composable wrapper.

```ts
interface ApiContext {
  tenantId: string
  scopes: string[]
  keyId: string
  supabase: SupabaseClient // pre-built, admin, tenant-scoped
}

type ApiHandler = (req: NextRequest, ctx: ApiContext) => Promise<NextResponse>

// Wraps any handler with auth, rate limiting, error catching
export function withApiAuth(
  handler: ApiHandler,
  options?: { requiredScopes?: string[] }
): (req: NextRequest) => Promise<NextResponse>
```

**What it does:**

1. Validates API key from `Authorization: Bearer cf_live_*` header
2. Checks rate limit (100 req/min per tenant)
3. Validates required scopes (e.g., `events:write`, `clients:read`)
4. Catches unhandled errors, returns structured error response
5. Passes `ApiContext` to the handler

**Pattern:**

```ts
// In any v2 route file:
export const GET = withApiAuth(
  async (req, ctx) => {
    // ctx.tenantId, ctx.supabase already available
    const { data } = await ctx.supabase.from('events').select('*').eq('tenant_id', ctx.tenantId)
    return apiSuccess(data)
  },
  { requiredScopes: ['events:read'] }
)
```

**Why:** Eliminates 8 lines of boilerplate per endpoint (auth check, rate limit, error handling). The v1 endpoints repeat this in every file.

---

### Task 1.3: Scope system for API keys (`lib/api/v2/scopes.ts`)

Define the scope vocabulary and checking logic.

```ts
export const API_SCOPES = {
  // Read scopes
  'events:read': 'List and view events',
  'clients:read': 'List and view clients',
  'quotes:read': 'List and view quotes',
  'inquiries:read': 'List and view inquiries',
  'menus:read': 'List and view menus',
  'recipes:read': 'List and view recipes',
  'finance:read': 'View expenses, ledger, financial summaries',
  'documents:read': 'List and view documents',
  'settings:read': 'View preferences and configuration',

  // Write scopes
  'events:write': 'Create and update events',
  'clients:write': 'Create and update clients',
  'quotes:write': 'Create, update, send, and accept quotes',
  'inquiries:write': 'Create and update inquiries',
  'menus:write': 'Create and update menus',
  'finance:write': 'Log expenses, record payments',
  'documents:write': 'Generate documents',
  'settings:write': 'Update preferences and configuration',

  // Admin scopes
  'webhooks:manage': 'Manage outbound webhook subscriptions',
  'api-keys:manage': 'Manage API keys',
} as const

export type ApiScope = keyof typeof API_SCOPES

export function hasScope(ctx: ApiKeyContext, required: ApiScope): boolean
export function hasAnyScope(ctx: ApiKeyContext, required: ApiScope[]): boolean
```

**Migration:** Add `scopes` column to `chef_api_keys` if not already a text array. The existing v1 keys get `['events:read', 'clients:read']` by default (backward compatible).

---

### Task 1.4: Pagination helper (`lib/api/v2/pagination.ts`)

Standardized cursor or offset pagination for list endpoints.

```ts
interface PaginationParams {
  page: number      // 1-indexed, default 1
  per_page: number  // default 50, max 200
}

export function parsePagination(url: URL): PaginationParams
export function applyPagination(query: any, params: PaginationParams): any
export function paginationMeta(params: PaginationParams, total: number): {...}
```

---

### Task 1.5: Update API key settings page

Update `/settings/api-keys` UI to show scope checkboxes when creating/editing keys. The page already exists; this adds scope selection.

---

### Files created in Phase 1:

```
lib/api/v2/response.ts       - Response helpers
lib/api/v2/middleware.ts      - Auth + rate limit wrapper
lib/api/v2/scopes.ts         - Scope definitions + checking
lib/api/v2/pagination.ts     - Pagination utilities
```

---

## Phase 2: Operator Pricing Config

**Goal:** Move hardcoded pricing constants into per-chef DB settings with a settings page. Existing constants become fallback defaults.

### Task 2.1: Migration - `chef_pricing_config` table

**File:** `supabase/migrations/20260401000087_chef_pricing_config.sql`

```sql
CREATE TABLE IF NOT EXISTS chef_pricing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,

  -- Base rates (cents)
  couples_rate_3_course  INT NOT NULL DEFAULT 20000,
  couples_rate_4_course  INT NOT NULL DEFAULT 25000,
  couples_rate_5_course  INT NOT NULL DEFAULT 30000,
  group_rate_3_course    INT NOT NULL DEFAULT 15500,
  group_rate_4_course    INT NOT NULL DEFAULT 18500,
  group_rate_5_course    INT NOT NULL DEFAULT 21500,

  -- Weekly rates (cents)
  weekly_standard_min    INT NOT NULL DEFAULT 40000,
  weekly_standard_max    INT NOT NULL DEFAULT 50000,
  weekly_commit_min      INT NOT NULL DEFAULT 30000,
  weekly_commit_max      INT NOT NULL DEFAULT 35000,
  cook_and_leave_rate    INT NOT NULL DEFAULT 15000,
  pizza_rate             INT NOT NULL DEFAULT 15000,

  -- Multi-night packages (JSONB for flexibility)
  multi_night_packages   JSONB NOT NULL DEFAULT '{}',

  -- Policies
  deposit_percentage     INT NOT NULL DEFAULT 50,       -- 50 = 50%
  minimum_booking_cents  INT NOT NULL DEFAULT 30000,
  balance_due_hours      INT NOT NULL DEFAULT 24,
  mileage_rate_cents     INT NOT NULL DEFAULT 70,       -- $0.70/mile

  -- Weekend premium
  weekend_premium_pct    INT NOT NULL DEFAULT 10,       -- 10 = 10%
  weekend_premium_on     BOOLEAN NOT NULL DEFAULT false,

  -- Holiday premiums (percentages)
  holiday_tier1_pct      INT NOT NULL DEFAULT 45,
  holiday_tier2_pct      INT NOT NULL DEFAULT 30,
  holiday_tier3_pct      INT NOT NULL DEFAULT 20,
  holiday_proximity_days INT NOT NULL DEFAULT 2,

  -- Guest thresholds
  large_group_min        INT NOT NULL DEFAULT 8,
  large_group_max        INT NOT NULL DEFAULT 14,

  -- Add-on catalog (JSONB for extensibility)
  add_on_catalog         JSONB NOT NULL DEFAULT '[
    {"key":"wine_pairing","label":"Wine Pairing","type":"per_person","cents":3500},
    {"key":"charcuterie_board","label":"Charcuterie Board Setup","type":"flat","cents":15000},
    {"key":"extra_appetizer_course","label":"Additional Appetizer Course","type":"per_person","cents":2500},
    {"key":"birthday_dessert","label":"Custom Birthday Dessert","type":"flat","cents":7500}
  ]',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(chef_id)
);

-- RLS
ALTER TABLE chef_pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs can view own pricing config"
  ON chef_pricing_config FOR SELECT
  USING (chef_id = auth.uid() OR chef_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Chefs can update own pricing config"
  ON chef_pricing_config FOR ALL
  USING (chef_id = auth.uid() OR chef_id IN (
    SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
  ));

-- Auto-update updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON chef_pricing_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### Task 2.2: Server actions for pricing config (`lib/pricing/config-actions.ts`)

```ts
'use server'

export async function getPricingConfig(): Promise<PricingConfig>
// Returns chef's config, or creates one with defaults if none exists (upsert pattern)

export async function updatePricingConfig(updates: Partial<PricingConfig>): Promise<PricingConfig>
// Validates with Zod, updates only provided fields
// Revalidates any cached pricing data
```

---

### Task 2.3: Refactor `compute.ts` to read from DB config

**Key change:** `computePricing()` gains an optional `config?: PricingConfig` parameter.

- If `config` is provided, use it (API callers pass it in)
- If not, read from DB via `getPricingConfig()` for the current chef
- Existing constant imports become the default values in the DB schema (so behavior is identical for chefs who never touch settings)

This is a **non-breaking change**. The function signature adds an optional parameter; all existing callers work unchanged.

```ts
// Before:
export async function computePricing(input: PricingInput): Promise<PricingBreakdown>

// After:
export async function computePricing(
  input: PricingInput,
  config?: PricingConfig // optional - falls back to DB lookup or defaults
): Promise<PricingBreakdown>
```

Inside the function, replace direct constant references:

```ts
// Before:
const perPersonCents = isCouple ? COUPLES_RATES[courseCount] : GROUP_RATES[courseCount]

// After:
const couplesRates = {
  3: cfg.couples_rate_3_course,
  4: cfg.couples_rate_4_course,
  5: cfg.couples_rate_5_course,
}
const groupRates = {
  3: cfg.group_rate_3_course,
  4: cfg.group_rate_4_course,
  5: cfg.group_rate_5_course,
}
const perPersonCents = isCouple ? couplesRates[courseCount] : groupRates[courseCount]
```

**`generateRateCardString()` also updated** to accept optional config, so Remy's rate card reflects the chef's actual prices.

---

### Task 2.4: Settings page UI (`app/(chef)/settings/pricing/page.tsx`)

New settings page with sections:

1. **Base Rates** - Couples rates (3/4/5 course), Group rates (3/4/5 course)
2. **Weekly/Ongoing** - Standard day range, Commitment day range, Cook & Leave rate, Pizza rate
3. **Multi-Night Packages** - Editable table (package name, price), add/remove rows
4. **Policies** - Deposit %, Minimum booking, Balance due hours, Mileage rate
5. **Premiums** - Weekend premium (toggle + %), Holiday tiers (3 rows with %), Proximity days
6. **Guest Thresholds** - Large group min/max
7. **Add-On Catalog** - Editable table (label, type, price), add/remove custom add-ons

Each section uses the existing `<SettingsSection>` component pattern. Form submits via `updatePricingConfig()` server action. All fields show current values with inline labels showing the system defaults for reference.

---

### Task 2.5: Add nav item for pricing settings

Add entry to nav config under Settings section:

```ts
{ label: 'Pricing', href: '/settings/pricing', icon: DollarSign }
```

---

### Files created/modified in Phase 2:

```
supabase/migrations/20260401000087_chef_pricing_config.sql  - NEW migration
lib/pricing/config-actions.ts   - NEW server actions
lib/pricing/config-types.ts     - NEW types for pricing config
lib/pricing/compute.ts          - MODIFIED to accept config
lib/pricing/constants.ts        - UNCHANGED (still used as defaults)
app/(chef)/settings/pricing/page.tsx    - NEW settings page
components/settings/pricing-form.tsx    - NEW form component
```

---

## Phase 3: REST API v2 Endpoints

**Goal:** Full CRUD API for every major entity. Each endpoint is a thin wrapper around existing server actions, using the Phase 1 middleware.

**Pattern for every endpoint:**

```
app/api/v2/{resource}/route.ts          - GET (list), POST (create)
app/api/v2/{resource}/[id]/route.ts     - GET (detail), PATCH (update), DELETE (soft delete)
app/api/v2/{resource}/[id]/{action}/route.ts  - POST (state transitions, send, etc.)
```

---

### Task 3a: Events API

**Files:**

```
app/api/v2/events/route.ts              - GET list, POST create
app/api/v2/events/[id]/route.ts         - GET detail, PATCH update, DELETE
app/api/v2/events/[id]/transition/route.ts  - POST transition state
```

**GET /api/v2/events** (list)

- Query params: `status`, `client_id`, `date_from`, `date_to`, `page`, `per_page`
- Scope: `events:read`
- Returns: paginated events with client name, status, financials

**POST /api/v2/events** (create)

- Body: matches `CreateEventSchema` from `lib/events/actions.ts`
- Scope: `events:write`
- Calls: existing `createEvent()` server action logic
- Returns: created event

**GET /api/v2/events/:id** (detail)

- Scope: `events:read`
- Returns: full event with client, menu, quotes, ledger summary

**PATCH /api/v2/events/:id** (update)

- Body: partial update matching `UpdateEventSchema`
- Scope: `events:write`
- Calls: existing `updateEvent()` server action logic

**DELETE /api/v2/events/:id** (soft delete)

- Scope: `events:write`
- Sets `deleted_at` timestamp

**POST /api/v2/events/:id/transition** (state change)

- Body: `{ to_status: "proposed" | "accepted" | ... }`
- Scope: `events:write`
- Calls: existing `transitionEvent()` from `lib/events/transitions.ts`
- Validates FSM rules, returns new state

---

### Task 3b: Clients API

**Files:**

```
app/api/v2/clients/route.ts             - GET list, POST create
app/api/v2/clients/[id]/route.ts        - GET detail, PATCH update
```

**GET /api/v2/clients** - paginated list with search (`?q=`), status filter
**POST /api/v2/clients** - create client (name, email, phone, dietary, etc.)
**GET /api/v2/clients/:id** - full profile with events, preferences, activity
**PATCH /api/v2/clients/:id** - partial update

Scopes: `clients:read`, `clients:write`

---

### Task 3c: Quotes API

**Files:**

```
app/api/v2/quotes/route.ts              - GET list, POST create
app/api/v2/quotes/[id]/route.ts         - GET detail, PATCH update
app/api/v2/quotes/[id]/send/route.ts    - POST send to client
app/api/v2/quotes/[id]/accept/route.ts  - POST mark accepted
```

**POST /api/v2/quotes** - create quote with pricing params. Can auto-compute via `computePricing()` if `auto_price: true` is passed.
**POST /api/v2/quotes/:id/send** - triggers email to client
**POST /api/v2/quotes/:id/accept** - marks as accepted, transitions event if linked

Scopes: `quotes:read`, `quotes:write`

---

### Task 3d: Inquiries API

**Files:**

```
app/api/v2/inquiries/route.ts           - GET list, POST create
app/api/v2/inquiries/[id]/route.ts      - GET detail, PATCH update
```

**POST /api/v2/inquiries** - programmatic inquiry creation (for external form integrations beyond the embed widget)
**PATCH /api/v2/inquiries/:id** - update status, assign, add notes

Scopes: `inquiries:read`, `inquiries:write`

---

### Task 3e: Menus + Recipes API

**Files:**

```
app/api/v2/menus/route.ts               - GET list, POST create
app/api/v2/menus/[id]/route.ts          - GET detail, PATCH update
app/api/v2/recipes/route.ts             - GET list (read-only per AI policy)
app/api/v2/recipes/[id]/route.ts        - GET detail (read-only)
```

**Menus:** Full CRUD. Creating a menu links it to an event.
**Recipes:** Read-only via API. Recipe creation is manual-only per CLAUDE.md rules (AI must never generate recipes, and the API should not bypass that boundary).

Scopes: `menus:read`, `menus:write`, `recipes:read`

---

### Task 3f: Finance API

**Files:**

```
app/api/v2/expenses/route.ts            - GET list, POST create
app/api/v2/expenses/[id]/route.ts       - GET detail, PATCH update
app/api/v2/ledger/route.ts              - GET entries (read-only, append via payments)
app/api/v2/payments/route.ts            - POST record payment
app/api/v2/financials/summary/route.ts  - GET financial summary
```

**POST /api/v2/expenses** - log an expense (amount, category, receipt URL, event link)
**GET /api/v2/ledger** - read ledger entries for an event or tenant-wide. Filter by `event_id`, `type`, `date_range`.
**POST /api/v2/payments** - record a manual payment (cash, check, Venmo, etc.). Appends to ledger.
**GET /api/v2/financials/summary** - tenant-wide or per-event financial summary from `event_financial_summary` view.

Scopes: `finance:read`, `finance:write`

---

### Task 3g: Documents, Search, Settings, Queue APIs

**Documents:**

```
app/api/v2/documents/route.ts                  - GET list
app/api/v2/documents/generate/route.ts         - POST generate (invoice, quote PDF, etc.)
```

**Search:**

```
app/api/v2/search/route.ts   - GET ?q=term (calls universalSearch())
```

**Settings:**

```
app/api/v2/settings/preferences/route.ts  - GET/PATCH chef preferences
app/api/v2/settings/pricing/route.ts      - GET/PATCH pricing config (Phase 2 table)
app/api/v2/settings/automations/route.ts  - GET list / POST create automation rule
app/api/v2/settings/automations/[id]/route.ts - PATCH/DELETE automation rule
```

**Queue:**

```
app/api/v2/queue/route.ts  - GET priority queue items
```

Scopes: `documents:read`, `documents:write`, `settings:read`, `settings:write`

---

## Phase 4: Outbound Webhooks

**Goal:** Every mutation in ChefFlow can trigger a webhook to external systems (Zapier, n8n, custom integrations).

### Task 4.1: Migration - webhook subscriptions table

**File:** `supabase/migrations/20260401000088_outbound_webhooks.sql`

```sql
CREATE TABLE IF NOT EXISTS chef_webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,                        -- HMAC signing secret
  events TEXT[] NOT NULL DEFAULT '{}',         -- e.g., {'event.created', 'client.updated'}
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  last_triggered_at TIMESTAMPTZ,
  failure_count INT NOT NULL DEFAULT 0,        -- auto-disable after 10 consecutive failures
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS webhook_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES chef_webhook_subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INT,
  response_body TEXT,
  duration_ms INT,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for cleanup queries
CREATE INDEX idx_webhook_delivery_log_created ON webhook_delivery_log(created_at);

-- RLS
ALTER TABLE chef_webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs manage own webhooks"
  ON chef_webhook_subscriptions FOR ALL
  USING (chef_id IN (SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Chefs view own webhook logs"
  ON webhook_delivery_log FOR SELECT
  USING (subscription_id IN (
    SELECT id FROM chef_webhook_subscriptions WHERE chef_id IN (
      SELECT entity_id FROM user_roles WHERE auth_user_id = auth.uid()
    )
  ));
```

---

### Task 4.2: Webhook emitter (`lib/webhooks/emitter.ts`)

```ts
export type WebhookEventType =
  | 'event.created'
  | 'event.updated'
  | 'event.transitioned'
  | 'event.deleted'
  | 'client.created'
  | 'client.updated'
  | 'quote.created'
  | 'quote.sent'
  | 'quote.accepted'
  | 'quote.rejected'
  | 'inquiry.received'
  | 'inquiry.updated'
  | 'payment.received'
  | 'payment.failed'
  | 'expense.logged'
  | 'menu.created'
  | 'menu.updated'
  | 'document.generated'

// Non-blocking. Fire-and-forget. Errors logged, never thrown.
export async function emitWebhook(
  chefId: string,
  eventType: WebhookEventType,
  payload: Record<string, unknown>
): Promise<void>
```

**How it works:**

1. Query `chef_webhook_subscriptions` where `chef_id = chefId AND is_active = true AND events @> ARRAY[eventType]`
2. For each matching subscription, POST to `url` with:
   - Body: `{ event: eventType, data: payload, timestamp: ISO }`
   - Header: `X-ChefFlow-Signature: HMAC-SHA256(body, secret)`
   - Timeout: 10 seconds
3. Log to `webhook_delivery_log`
4. On failure: increment `failure_count`. If `failure_count >= 10`, set `is_active = false`.
5. **All of this is wrapped in try/catch. Never blocks the calling action.**

---

### Task 4.3: Hook emitter into server actions

Add `emitWebhook()` calls as non-blocking side effects in existing server actions:

```ts
// In lib/events/actions.ts > createEvent():
try {
  await emitWebhook(user.tenantId, 'event.created', { event: result })
} catch {}

// In lib/events/transitions.ts > transitionEvent():
try {
  await emitWebhook(tenantId, 'event.transitioned', { event_id, from, to })
} catch {}

// In lib/clients/actions.ts > createClient():
try {
  await emitWebhook(user.tenantId, 'client.created', { client: result })
} catch {}

// ... same pattern for every mutation
```

**Files modified:** ~12 server action files. Each gets a single try/catch line.

---

### Task 4.4: Server actions for webhook management (`lib/webhooks/actions.ts`)

```ts
'use server'

export async function listWebhookSubscriptions(): Promise<WebhookSubscription[]>
export async function createWebhookSubscription(data: CreateWebhookInput): Promise<WebhookSubscription>
export async function updateWebhookSubscription(id: string, data: Partial<...>): Promise<...>
export async function deleteWebhookSubscription(id: string): Promise<void>
export async function testWebhookSubscription(id: string): Promise<{ success: boolean; status: number }>
export async function getWebhookDeliveryLog(subscriptionId: string, limit?: number): Promise<DeliveryLog[]>
```

---

### Task 4.5: Webhook settings page (`app/(chef)/settings/webhooks/page.tsx`)

**If this page already exists**, extend it. If not, create it.

Sections:

1. **Subscriptions list** - URL, event types, active/inactive, failure count, last triggered
2. **Create new** - URL input, secret (auto-generated, copyable), event type checkboxes
3. **Delivery log** - per-subscription, shows last 50 deliveries with status, response, timing
4. **Test button** - sends a test payload to verify the URL works

---

### Task 4.6: API endpoints for webhook management

```
app/api/v2/webhooks/route.ts        - GET list, POST create
app/api/v2/webhooks/[id]/route.ts   - PATCH update, DELETE
app/api/v2/webhooks/[id]/test/route.ts  - POST test delivery
app/api/v2/webhooks/[id]/logs/route.ts  - GET delivery log
```

Scope: `webhooks:manage`

---

### Files created/modified in Phase 4:

```
supabase/migrations/20260401000088_outbound_webhooks.sql  - NEW migration
lib/webhooks/emitter.ts          - NEW webhook emitter
lib/webhooks/actions.ts          - NEW server actions
lib/webhooks/types.ts            - NEW types
app/(chef)/settings/webhooks/    - NEW or MODIFIED settings page
app/api/v2/webhooks/             - NEW API endpoints
lib/events/actions.ts            - MODIFIED (add emitWebhook calls)
lib/clients/actions.ts           - MODIFIED
lib/quotes/actions.ts            - MODIFIED
lib/finance/expense-actions.ts   - MODIFIED
lib/menus/actions.ts             - MODIFIED
(~12 action files total)
```

---

## Phase 5: Keyboard Shortcuts

**Goal:** Direct keyboard shortcuts beyond the command palette for power users.

### Task 5.1: Shortcut provider (`components/keyboard/shortcut-provider.tsx`)

Client component that listens for keyboard events globally. Uses a sequence buffer for chord shortcuts (e.g., N then E within 500ms).

```tsx
'use client'

interface Shortcut {
  keys: string[] // ['n', 'e'] for N then E chord
  action: () => void
  label: string
  category: string
}

export function ShortcutProvider({ children }: { children: ReactNode }) {
  // Registers shortcuts, handles key sequences
  // Ignores when focus is in input/textarea/contenteditable
  // Shows visual feedback (brief toast) when shortcut fires
}
```

---

### Task 5.2: Register shortcuts (`lib/keyboard/shortcuts.ts`)

```ts
export const SHORTCUTS = [
  // Creation shortcuts (N + letter)
  {
    keys: ['n', 'e'],
    action: () => router.push('/events/new'),
    label: 'New Event',
    category: 'Create',
  },
  {
    keys: ['n', 'c'],
    action: () => router.push('/clients/new'),
    label: 'New Client',
    category: 'Create',
  },
  {
    keys: ['n', 'q'],
    action: () => router.push('/quotes/new'),
    label: 'New Quote',
    category: 'Create',
  },
  {
    keys: ['n', 'i'],
    action: () => router.push('/inquiries/new'),
    label: 'New Inquiry',
    category: 'Create',
  },
  {
    keys: ['n', 'r'],
    action: () => router.push('/recipes/new'),
    label: 'New Recipe',
    category: 'Create',
  },
  {
    keys: ['n', 'x'],
    action: () => router.push('/expenses/new'),
    label: 'New Expense',
    category: 'Create',
  },

  // Navigation shortcuts (G + letter)
  {
    keys: ['g', 'd'],
    action: () => router.push('/dashboard'),
    label: 'Dashboard',
    category: 'Go to',
  },
  { keys: ['g', 'e'], action: () => router.push('/events'), label: 'Events', category: 'Go to' },
  { keys: ['g', 'c'], action: () => router.push('/clients'), label: 'Clients', category: 'Go to' },
  {
    keys: ['g', 'i'],
    action: () => router.push('/inquiries'),
    label: 'Inquiries',
    category: 'Go to',
  },
  { keys: ['g', 'r'], action: () => router.push('/recipes'), label: 'Recipes', category: 'Go to' },
  { keys: ['g', 'f'], action: () => router.push('/finance'), label: 'Finance', category: 'Go to' },
  {
    keys: ['g', 's'],
    action: () => router.push('/settings'),
    label: 'Settings',
    category: 'Go to',
  },
  {
    keys: ['g', 'm'],
    action: () => router.push('/culinary/menus'),
    label: 'Menus',
    category: 'Go to',
  },

  // Utility
  { keys: ['?'], action: () => openShortcutHelp(), label: 'Show shortcuts', category: 'Help' },
  { keys: ['Escape'], action: () => closeModals(), label: 'Close modal/drawer', category: 'Help' },
]
```

---

### Task 5.3: Shortcuts help overlay (`components/keyboard/shortcut-help.tsx`)

Modal triggered by `?` key. Groups shortcuts by category, shows key combos with `<kbd>` styling.

---

### Task 5.4: Wire into layout

Add `<ShortcutProvider>` to the chef layout (`app/(chef)/layout.tsx`), wrapping the existing children.

---

### Files created in Phase 5:

```
components/keyboard/shortcut-provider.tsx  - NEW provider
components/keyboard/shortcut-help.tsx      - NEW help overlay
lib/keyboard/shortcuts.ts                  - NEW shortcut definitions
app/(chef)/layout.tsx                      - MODIFIED (wrap with provider)
```

---

## Dependency Graph

```
Phase 1 (infra)
  ├── Phase 2 (pricing config) - independent, can run in parallel with Phase 1
  ├── Phase 3a-g (API endpoints) - depends on Phase 1
  ├── Phase 4 (webhooks) - depends on Phase 3 patterns, but migration is independent
  └── Phase 5 (shortcuts) - fully independent, can run anytime
```

**Parallelizable work:**

- Phase 1 + Phase 2 + Phase 5 can all run in parallel (no dependencies)
- Phase 3a through 3g can run in parallel once Phase 1 is done
- Phase 4.1-4.2 (migration + emitter) can run in parallel with Phase 3
- Phase 4.3 (hooking into actions) should run after Phase 3 is stable

---

## Estimated File Count

| Phase     | New Files       | Modified Files             |
| --------- | --------------- | -------------------------- |
| Phase 1   | 4               | 1                          |
| Phase 2   | 5               | 2                          |
| Phase 3   | ~20 route files | 0 (calls existing actions) |
| Phase 4   | 8               | ~12                        |
| Phase 5   | 3               | 1                          |
| **Total** | **~40**         | **~16**                    |

---

## What This Unlocks

When all phases are complete:

1. **Zapier/n8n users** can trigger any ChefFlow action from external workflows
2. **Operators** control their own rates, premiums, and policies without code deploys
3. **Power users** navigate and create with keyboard shortcuts
4. **External systems** react to ChefFlow events in real-time via webhooks
5. **Every input/output point** has both a UI control and an API endpoint
