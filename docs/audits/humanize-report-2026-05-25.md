# Humanize Audit Report - 2026-05-25

## Summary

Full audit of developer jargon across all user-facing surfaces. 361 findings across 5 scan categories.

| Severity          | Count | Description                               |
| ----------------- | ----- | ----------------------------------------- |
| P0 (Confusing)    | 155   | User has no idea what this means          |
| P1 (Intimidating) | 130   | User understands but feels like wrong app |
| P2 (Rough)        | 67    | Understandable but unprofessional         |
| P3 (Stiff)        | 50    | Technically correct but cold/robotic      |

## Hotspot Files (Fix These First)

| File                                           | Findings | Impact                                                      |
| ---------------------------------------------- | -------- | ----------------------------------------------------------- |
| `lib/loading/loading-registry.ts`              | ~50      | Controls ALL loading messages app-wide                      |
| `components/navigation/nav-config.tsx`         | ~40      | Defines entire chef sidebar                                 |
| `app/(chef)/settings/integrations/page.tsx`    | ~15      | Worst single page: "control plane", "inbound alias routing" |
| `components/settings/ai-provider-settings.tsx` | ~15      | "WebGPU", "Ollama URL", "inference stats"                   |
| `components/settings/webhook-settings.tsx`     | ~12      | "endpoint", "signing secret", "HMAC-SHA256"                 |
| `lib/email/templates/daily-report.tsx`         | 5        | "closure streak", "MTD", raw event_type formatting          |
| `components/navigation/admin-nav-config.ts`    | 8        | "Data Engine Health", "Silent Failures", "Feature Flags"    |

## Category Breakdown

### 1. Toast/Error/Feedback Messages (138 findings)

**P0 highlights:**

- "Data regression detected" with "rows lost across tables"
- "Price sync pipeline stale"
- "Failed to resolve ingredient availability"
- "Failed to initialize service tracker"
- "Failed to issue ledger adjustment"
- "Transition failed", "Batch update failed", "Regeneration failed"
- "Feed token regenerated", "New token generated"
- "Webhook endpoint created. Copy the signing secret now"
- All API key, webhook, and Zapier toast messages
- "Syncing pending actions", "actions failed to sync"

**Worst pattern:** "Failed to toggle X" appears 12+ times. "Toggle" is developer vocabulary.

### 2. Loading/Empty States (99 findings)

**P0 highlights:**

- "Computing analytics...", "Reconciling ledger entries..."
- "Aggregating transactions...", "Calculating P&L..."
- "Evaluating conversion signals..."
- "Processing transition...", "Updating ledger..."
- "Classifying Stars, Plowhorses, Puzzles, Dogs..."
- "No records to create", "No records match this filter"

**Single biggest fix:** `lib/loading/loading-registry.ts` has ~50 developer-oriented loading messages. Fix once, propagate everywhere.

### 3. Settings/Forms/Labels (95 findings)

**P0 highlights (settings pages that read like developer debug panels):**

- Integrations page: "control plane", "inbound alias routing", "email ingress", "mailbox ownership", raw `google_mailboxes` table names
- AI Settings: "WebGPU", "Chrome AI", "Device tier", "WebLLM", "Ollama URL", "Inference Stats", "Total tokens", "Avg latency"
- Local AI Connectors: "Proxy auth token", "port 11434", "secured proxy"
- Remy Control: "P95 Duration", "Runtime Control", "Approval Policy Matrix", monospace taskType values
- Webhook/API: "Endpoint URL", "HMAC-SHA256", "Scopes", "Signing secret", scope names in monospace
- Twilio BYO: "Account SID", "Auth Token", "E.164", "inbound webhook URL"
- Audit Trail: "Immutable record of all event transitions, quote state changes, and financial ledger entries"

### 4. Navigation/Page Titles (117 findings)

**P0 highlights:**

- "Reconciliation" (appears 3 times in sidebar)
- "Transaction Ledger", "Transaction Log", "Sustainability Ledger"
- "Observability", "POS Observability"
- "Taxonomy & Categories"
- "Capability Inventory"
- "Data Engine Health", "PIE Compliance", "Silent Failures"
- "System Diagnosis", "System Integrity"
- "Feature Flags"
- "Data Reconciliation", "Gap Analysis"

**P1 highlights:**

- "Intelligence Hub", "Intelligence Feed", "Client Risk Radar"
- "Conversion Funnel", "Pipeline Forecast"
- "Procurement Hub", "Commerce Hub"
- "Menu Engineering", "Touchpoint Rules"
- "Mission Control", "Platform Intelligence"

### 5. Email Templates (29 findings)

**Overall quality: HIGH.** Most client emails are warm and natural. Problems concentrate in:

- Daily report: "closure streak", "open closure tasks", "MTD Revenue", raw event_type formatting
- Client visit alert: "High-intent signal" (P0)
- Booking confirmation: "saved it for coverage follow-up" (P0)
- Notification triggers: "Staff roster updated", "Stock levels updated", raw par/on-hand data dumps
- Footer boilerplate: "manage notification preferences" repeated across templates

## Fix Priority

1. **loading-registry.ts** - One file, 50 fixes, maximum reach
2. **nav-config.tsx** - Defines what every chef sees in the sidebar
3. **Settings P0 pages** - integrations, AI, webhooks, Remy control
4. **Toast messages** - P0 errors that appear during active chef work
5. **Email daily report** - Chef sees this every morning
6. **Empty states** - First impression for new features
7. **Breadcrumbs and admin nav** - Lower traffic but still visible
