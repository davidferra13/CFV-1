# Build: AI Rebrand — Neutral Language

## What Changed

All chef-facing AI branding has been replaced with neutral, functional language. The underlying technology is unchanged — only the visible labels, titles, badges, and footer disclaimers were edited.

## Why

Chefs don't need to know the implementation detail of _how_ suggestions are generated. Seeing "AI" everywhere can create friction, skepticism, or distrust. The features are valuable regardless of the label. This change helps chefs experience these tools as smart workflow features, not AI experiments.

## Legal Standing

- No functional change — all AI output still requires explicit chef approval before becoming canonical (AI Policy unchanged)
- US law has no B2B AI disclosure requirement for internal tooling suggestions
- The Terms of Service should note "automated suggestions" (no specific vendor disclosure required)
- The chef remains the actor for every decision — this satisfies any applicable transparency standard

## Files Changed

### Navigation & Dashboard

- `components/navigation/chef-nav.tsx` — removed `OllamaStatusBadge` import and render
- `app/(chef)/dashboard/page.tsx` — removed `OllamaStatusBadge` import and render

### Copilot Drawer

- `components/ai/copilot-drawer.tsx` — "AI Assistant" → "Assistant" (button label, drawer header, aria-labels)

### All 25 AI Panel Components (`components/ai/*.tsx`)

Across every panel:

- Removed `<Badge variant="info">AI</Badge>` and `<Badge variant="info">AI Estimate</Badge>` from panel headers
- Renamed titles containing "AI":
  - "AI Business Insights" → "Business Insights"
  - "AI Staff Briefing" → "Staff Briefing Draft"
  - "AI Recipe Scaling" → "Recipe Scaling"
  - "AI Contingency Plans" → "Contingency Plans"
  - "Carry-Forward AI Match" → "Carry-Forward Match"
- Updated footer disclaimer prefixes: `AI draft` → `Auto draft`, `AI insight` → `Auto insight`, `AI analysis` → `Auto analysis`, `AI guidance` → `Auto guidance`, `AI matching` → `Auto matching`
- Removed `· Routed through local Ollama` from footers (internal implementation detail)
- Removed `· AI insight only` phrases from footers
- Updated descriptions: "AI-drafted..." → "Staff briefing...", "AI generates..." → "Generates...", "AI analysis of your revenue..." → "Analysis of your revenue..."
- `expense-categorize-suggest.tsx`: "AI categorizing..." → "Auto-categorizing..."
- `recipe-scaling-panel.tsx`: "Scale with AI" button → "Auto-Scale"

### Receipt Pages

- `app/(chef)/events/[id]/receipts/page.tsx` — "Extract with AI" → "Auto-Extract"
- `app/(chef)/receipts/page.tsx` — "Extract with AI" → "Auto-Extract"

### Settings

- `app/(chef)/settings/health/page.tsx` — "AI drafts unavailable" → "auto drafts unavailable"

### Server Error Messages

- `lib/ai/ollama-errors.ts` — `OLLAMA_OFFLINE_MESSAGE` changed from "Ollama is required for this feature. Start Ollama (http://localhost:11434)..." to "This feature is temporarily unavailable. Please try again in a moment." — prevents internal infrastructure details from surfacing in chef UI

## What Was NOT Changed

| Item                                                                             | Reason                                                     |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Component file names (`copilot-drawer.tsx`, `staff-briefing-ai-panel.tsx`, etc.) | Internal — not visible to chefs                            |
| Import paths and TypeScript type names                                           | Internal code only                                         |
| `<Sparkles />` icon on generation buttons                                        | Neutral visual, widely used outside AI contexts            |
| `ollama-status-badge.tsx` component                                              | Kept intact for developer/debugging use                    |
| `/api/ollama-status` route                                                       | Kept for developer use                                     |
| All AI routing logic, privacy rules, Ollama/Gemini behavior                      | Functional — no change                                     |
| AI Policy (`docs/AI_POLICY.md`)                                                  | Unchanged — chef approval still required for all AI output |
| `app/(chef)/dev/simulate/` pages                                                 | Developer tool, not regular chef UI                        |
