# ChefFlow - Architecture & Implementation Patterns

> This file is imported by CLAUDE.md via `@docs/CLAUDE-ARCHITECTURE.md`. It contains architecture reminders and implementation patterns.

## IMPLEMENTATION PATTERNS

These are the patterns Claude will get wrong without explicit rules.

### 0. AI Must NEVER Generate Recipes (ABSOLUTE - NO EXCEPTIONS)

**AI (Remy, Ollama, any LLM) must never create, generate, fabricate, hallucinate, draft, suggest, or pull recipes from anywhere.** Not from the internet, not from its training data, not as a suggestion, not as a draft, not with chef approval, not in any tier, not ever.

AI has **zero role** in telling a chef what to cook or how to cook it. Recipes are the chef's creative work and intellectual property.

**The ONLY thing AI can do with recipes:**

- **Search the chef's own recipe book** (`recipe.search`) - read-only lookup of recipes the chef already entered manually. That's it.

**Everything else is banned:**

- Generate or fabricate a recipe from scratch
- Pull or suggest recipes from the internet or training data
- Create recipe instructions, methods, or ingredient lists
- Draft recipe content for chef review
- Add or modify ingredients via AI
- Suggest "what to make" or "what to cook"
- Auto-fill recipe fields from natural language descriptions

`agent.create_recipe`, `agent.update_recipe`, and `agent.add_ingredient` are **permanently restricted** in `lib/ai/agent-actions/restricted-actions.ts`. The input validation layer (`lib/ai/remy-input-validation.ts`) also blocks recipe generation intent before it reaches the LLM.

**Recipes are entered manually on the recipe form. Period.**

### 0b. Formula > AI - Always (HIGHEST PRIORITY PATTERN)

**If deterministic code (math, logic, database queries, conditional checks) can produce the correct result, ALWAYS use it over AI.** AI (Remy/Ollama) is the fallback, never the default.

A formula returns the same correct answer every single time, instantly, for free. AI returns a _probably_ correct answer, slower, using compute resources, and might hallucinate. There is no contest when both can do the job.

| Use deterministic code when...                            | Use AI (Remy) only when...                         |
| --------------------------------------------------------- | -------------------------------------------------- |
| The calculation is math                                   | Unstructured text needs to become structured data  |
| The logic is a simple condition (`if X < Y → alert`)      | A human would need judgment to interpret the input |
| Data is already structured (DB columns, CSV, form inputs) | The input format is unpredictable                  |
| Correctness matters more than convenience                 | Convenience matters and a wrong answer is harmless |
| It needs to work offline, instantly, zero compute cost    | The feature already requires Ollama to be running  |

**This applies retroactively.** If any existing feature uses Remy/Ollama for something a formula could handle, swap it out. AI stays where it genuinely earns its place: understanding natural language, generating draft text, interpreting unstructured input. Everywhere else, math and logic win.

### 0c. Prospecting Is Admin-Only (PERMANENT)

**Prospecting is exclusively an admin feature. It must NEVER appear in a non-admin user's portal - no nav links, no sidebar items, no dashboard widgets, no shortcuts. Ever.**

- **Nav config:** All prospecting nav items in `nav-config.tsx` have `adminOnly: true`. The sidebar (`chef-nav.tsx`) filters these out for non-admin users.
- **Dashboard:** The `ProspectingWidget` on the dashboard is gated behind `isAdmin()`.
- **Pages:** All `/prospecting/*` pages already have `requireAdmin()` - if a non-admin somehow navigates there, they get redirected.
- **If you add any new prospecting-related UI** (link, button, widget, shortcut), it MUST be gated behind `isAdmin` / `adminOnly`. No exceptions.

### 0d. Catalog Empty = Sourcing Fallback (PERMANENT)

**Any surface where an ingredient or catalog item lookup returns zero results MUST include a web sourcing fallback.** A dead end is a Zero Hallucination violation - showing nothing when the ingredient exists in the world is a lie by omission.

**The rule:** If a search returns empty and the context involves an ingredient name, render `searchIngredientOnline(query)` from `lib/pricing/web-sourcing-actions.ts`. It fires a DuckDuckGo search filtered to trusted specialty retailers, is location-aware (uses chef's `home_city` + `home_state`), caches results 1 hour, and is auth-gated. Free, no API key.

**Surfaces already implemented:**

- `app/(chef)/culinary/price-catalog/catalog-browser.tsx` - catalog browser empty state
- `components/culinary/substitution-lookup.tsx` - substitution search empty state
- `components/culinary/ShoppingListGenerator.tsx` - per-row "Find it" button for unassigned/unpriced items with `toBuy > 0`

**Surfaces still pending:**

- Event costing ingredient matching dead-ends

**How to add it to a new surface:**

```tsx
import { WebSourcingPanel } from '@/components/pricing/web-sourcing-panel'

// In your empty state, when search query exists:
{
  query.trim().length > 1 && <WebSourcingPanel query={query} />
}
```

The canonical shared component is `components/pricing/web-sourcing-panel.tsx`. Use it directly - do not duplicate the DDG logic.

**Graceful degradation:** If DDG returns nothing, show static deep-links to Eataly, Whole Foods, Instacart, Formaggio Kitchen, and Amazon Fresh. Never show a dead end.

---

### 1. Non-Blocking Side Effects

Notifications, emails, activity logs, calendar syncs, and automations are **non-blocking** - if they fail, the main operation still succeeds.

- Always wrap side effects in `try/catch`
- Log failures as warnings, never throw
- The main transaction commits regardless

```ts
// CORRECT
try {
  await sendNotification(...)
} catch (err) {
  console.error('[non-blocking] Notification failed', err)
}

// WRONG  - this would roll back the whole operation on notification failure
await sendNotification(...)
```

### 2. Tenant ID Comes From Session - Never From Request Body

Always derive `tenant_id` from the authenticated session, never trust input from the client.

```ts
// CORRECT
const user = await requireChef()
const tenantId = user.tenantId! // from session

// WRONG  - attacker can forge this
const tenantId = input.tenantId
```

### 2b. tenant_id vs chef_id Naming Convention

Both `tenant_id` and `chef_id` reference `chefs(id)` and serve the same purpose (scoping data to one chef). The naming split is historical:

- **Core tables (Layers 1-4):** Use `tenant_id` (events, clients, quotes, recipes, menus, ledger_entries, ingredients, conversations, documents, etc.)
- **Feature tables (Layer 5+):** Use `chef_id` (gmail_sync_status, chef_todos, staff_members, contracts, equipment_inventory, chef_network tables, availability_waitlist, etc.)
- **New tables going forward:** Use `chef_id` (more descriptive since the tenant IS a chef)

Do NOT rename existing columns. Just use the correct name for whichever table you're querying.

### 3. Financial State Is Derived, Never Stored

Balances, profit, payment status, and food cost % are **computed from ledger entries** via database views - never written directly to a column.

- Use `event_financial_summary` view for per-event financials
- Use `getTenantFinancialSummary()` for overall totals
- If a number looks wrong, fix the ledger entry - never patch a balance column directly

### 4. UI Component Variants

Only use variants that actually exist - wrong variants fail silently or throw.

| Component  | Allowed variants                                 |
| ---------- | ------------------------------------------------ |
| `<Button>` | `primary`, `secondary`, `danger`, `ghost`        |
| `<Badge>`  | `default`, `success`, `warning`, `error`, `info` |

`outline`, `default` (Button), `warning` (Button), `success` (Button) do **not** exist.

### 5. Remy Chat Widget - Drag/Resize Corners Are Sacred

**The Remy concierge widget (`components/public/remy-concierge-widget.tsx`) MUST always have working drag-to-resize on all edges AND all four corners.** This is a permanent, non-negotiable rule.

- **Corner handles**: 16px hit area (`h-4 w-4`), z-index **higher** than edge handles (z-30 vs z-20).
- **Edge handles**: inset from corners (`left-4 right-4` / `top-4 bottom-4`) so they never overlap or block corner grabs.
- **Never** shrink corner hit areas, lower their z-index, or remove them.
- **Never** let edge handles extend into the corner zone.
- If refactoring the widget, preserve this resize architecture exactly.

### 6. Monetization Model (UPDATED April 2026)

**Two-tier model: Free + Paid.** The canonical classification is in `lib/billing/feature-classification.ts`.

- **Free tier:** Complete standalone utility. Solo chef can operate without friction. Manual, capable, no dead ends.
- **Paid tier:** Leverage, automation, scale. Replaces labor, increases accuracy, or scales output.

**Core design rule:** No locked buttons. The free version always executes. Upgrade prompts surface AFTER the free action completes, not before.

**For new features:**

1. **Classify the feature** in `lib/billing/feature-classification.ts` - assign `tier: 'free' | 'paid'`, `category`, and `upgrade_trigger` (if paid).
2. **Assign a module** in `lib/billing/modules.ts` with the correct tier.
3. **If the feature is paid and page-level:** `requirePro('your-feature-slug')` at the top of the page - it now enforces (redirects to `/settings/billing?feature=slug`).
4. **If the feature is paid and sub-section level:** use `<UpgradeGate chefId={...} featureSlug="...">` - it shows an upgrade block/blur in place.
5. **For contextual inline prompts** (after free action completes): use `<UpgradePrompt featureSlug="..." show={...} />` - reads copy from classification map automatically.
6. **Never** add Pro badges, lock icons, or disabled buttons. The free path must always work.

**Feature slugs in requirePro() that are NOT in the classification map** (legacy calls like `'operations'`, `'marketing'`, `'protection'`) degrade safely to auth-only - `isPaidFeature()` returns false for unknown slugs.

**Key files:**

- `lib/billing/feature-classification.ts` - canonical map: tier, category, upgrade_trigger
- `lib/billing/require-pro.ts` - enforces paid features via redirect
- `components/billing/upgrade-gate.tsx` - inline section gating (block/blur/hide modes)
- `components/billing/upgrade-prompt.tsx` - contextual inline prompt (shows after free action)
- `lib/billing/tier.ts` - subscription tier resolution (free/pro from subscription_status)
- `PRO_FEATURES` registry in `lib/billing/pro-features.ts` - legacy reference, superseded by feature-classification.ts

### 7. No Forced Onboarding Gates in Chef Layout (PERMANENT)

**Never add a redirect gate or full-page blocker to `app/(chef)/layout.tsx` that prevents navigation based on onboarding status, archetype selection, or profile completeness.** Onboarding is opt-in, never forced.

- No `redirect('/onboarding')` in the layout. Ever.
- No full-page component returns (like `<ArchetypeSelector />`) that replace the normal page render.
- The onboarding banner on the dashboard is the ONLY nudge. It is dismissible and non-blocking.
- Users must be able to freely navigate the entire app immediately after authentication.
- This rule exists because the forced redirect was added, "fixed," and re-added multiple times. It trapped users (including the developer) on the onboarding page and made the app unusable.

---

## ARCHITECTURE REMINDERS

These are the established patterns. Follow them - don't reinvent.

### Cloud AI Runtime (Production)

**All AI inference routes through a single Ollama-compatible endpoint (Gemma 4).** Cloud in production (`OLLAMA_BASE_URL`), localhost in dev. There is no second AI provider.

- `parseWithOllama` is the central inference gateway: structured prompts in, Zod-validated JSON out, with automatic repair pass.
- `parseWithOllama` throws `OllamaOfflineError` if the runtime is unreachable. No fallback. No silent degradation.
- The `OllamaOfflineError` class lives in `lib/ai/ollama-errors.ts` (no `'use server'`; class exports are not allowed in server action files). Import it from there: `import { OllamaOfflineError } from '@/lib/ai/ollama-errors'`. Callers that catch errors **must** re-throw it: `if (err instanceof OllamaOfflineError) throw err`.
- Heuristic/regex fallbacks (no LLM call) are acceptable.
- If the cloud runtime is down, the product fails clearly. No silent fallback to a local machine in production.

### Single-Provider Architecture (Gemma 4 via Ollama)

**All AI modules route through Ollama.** Gemini was removed as of April 2026. `gemini-service.ts` is deleted. The `AIProvider` type is `'ollama'` only.

| File                                         | Purpose                                           |
| -------------------------------------------- | ------------------------------------------------- |
| `lib/ai/campaign-outreach.ts`                | Campaign concepts + personalized outreach         |
| `lib/ai/parse-recipe.ts`                     | Recipe text extraction (chef IP)                  |
| `lib/ai/parse-receipt.ts`                    | Receipt OCR (canonical, Zod-validated)            |
| `lib/ai/receipt-ocr.ts`                      | Legacy adapter, delegates to parse-receipt.ts     |
| `lib/ai/parse-brain-dump.ts`                 | Brain dump parsing (client names, notes, recipes) |
| `lib/ai/aar-generator.ts`                    | After-action reports (financials, temp logs)      |
| `lib/ai/contingency-ai.ts`                   | Contingency plans (location, allergies)           |
| `lib/ai/grocery-consolidation.ts`            | Grocery list consolidation (dietary, allergies)   |
| `lib/ai/equipment-depreciation-explainer.ts` | Equipment depreciation explanations               |
| `lib/ai/chef-bio.ts`                         | Chef bio generation                               |
| `lib/ai/contract-generator.ts`               | Contract generation (client PII, pricing)         |
| `lib/ai/remy-actions.ts`                     | All Remy conversational AI                        |
| `lib/ai/social-captions.ts`                  | Social media caption drafts                       |
| `lib/ai/parse-recipe-vision.ts`              | Recipe photo OCR                                  |

**Rule:** All new AI files MUST use `parseWithOllama`. No exceptions. No second provider.

---

### General Architecture

- **Server actions** with `'use server'` for all business logic
- **Database:** PostgreSQL via postgres.js (direct TCP, no PostgREST). Compatibility shim in `lib/db/compat.ts` provides PostgreSQL-like `.from().select().eq()` API backed by raw SQL
- **Auth:** Auth.js v5 (credentials + Google OAuth). Session via JWT. Config in `lib/auth/auth-config.ts`
- **Storage:** Local filesystem (`./storage/{bucket}/{path}`). Signed URLs via HMAC-SHA256. API routes serve files at `/api/storage/`
- **Realtime:** Server-Sent Events (SSE) with in-memory EventEmitter bus. `useSSE()` hook for client components. Server actions call `broadcast()` after mutations
- **Role checks** via `requireChef()`, `requireClient()`, `requireAuth()`
- **Tenant scoping** on every database query - no exceptions
- **`user_roles` table** is the single source of truth for role assignment
  - Uses `entity_id` (not `client_id`) and `auth_user_id` (not `user_id`)
- **All monetary amounts in cents** (minor units, integers)
- **Ledger-first financial model** - immutable, append-only, computed balances
- **8-state event FSM:** draft -> proposed -> accepted -> paid -> confirmed -> in_progress -> completed | cancelled
- **`types/database.ts`** is auto-generated - never manually edit it
- **Embeddable widget** - `/embed/*` routes are public (no auth), use inline styles (no Tailwind), and have relaxed CSP (`frame-ancestors *`). The widget script (`public/embed/chefflow-widget.js`) is self-contained vanilla JS. See `docs/embeddable-widget.md`.
- **database SDK** is in devDependencies only (used by scripts and tests, not production code)
