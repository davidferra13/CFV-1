# Phase 8 — Smart Import & Low-Friction Data Entry

## What Changed

Phase 8 adds an AI-powered import system that lets the chef dump unstructured text (client notes, recipe descriptions, text threads, brain dumps) and have it parsed into structured database records. The chef reviews everything before it's saved.

## Why This Matters

ChefFlow's forms are thorough — 35+ fields per client, structured ingredients per recipe. That thoroughness is valuable for operations, but it creates an onboarding wall. A chef with 200+ clients and years of recipes in their head can't sit down and fill out forms for days. Smart Import solves this by meeting the chef where they are: unstructured text in, structured records out.

## Architecture

### Core Engine: `lib/ai/parse.ts`

A generic `parseWithAI<T>()` function that:
1. Takes a system prompt (domain-specific instructions) and user text
2. Sends both to the Anthropic API (Claude Sonnet)
3. Validates the response with Zod (type-safe, catches malformed AI output)
4. Returns strongly-typed structured data

The function is model-agnostic in structure — the system prompt is what specializes it for clients, recipes, etc.

### Specialized Parsers

| File | Purpose |
|------|---------|
| `lib/ai/parse-client.ts` | Single client extraction with confidence scoring |
| `lib/ai/parse-clients-bulk.ts` | Multi-client extraction from one text dump |
| `lib/ai/parse-recipe.ts` | Recipe with ingredients, method, yield, allergens |
| `lib/ai/parse-brain-dump.ts` | Categorizes mixed input into clients, recipes, notes |
| `lib/ai/parse-inquiry.ts` | Inquiry data from messages/emails (for Smart Fill) |

Each parser has a tailored system prompt that understands the domain. Key design decisions:
- **Allergies are flagged prominently** — safety-critical, the AI is instructed to over-flag rather than miss
- **Confidence scoring per field** — "confirmed" (explicitly stated), "inferred" (deduced), "unknown"
- **Money in cents** — consistent with the ledger-first financial model
- **No hallucination** — system prompts explicitly forbid inventing facts

### Server Actions: `lib/ai/import-actions.ts`

Four import functions, all using `requireChef()` + tenant scoping:
- `importClient()` — creates a client record from parsed data
- `importClients()` — batch version, iterates and reports per-record results
- `importRecipe()` — creates recipe + finds/creates ingredients + links via recipe_ingredients
- `importBrainDump()` — routes each extracted item to the appropriate importer

Recipe import is notable: it uses a `findOrCreateIngredient()` helper that checks for existing ingredients by name (case-insensitive) before creating new ones, preventing duplicates.

### UI: Smart Import Hub

`app/(chef)/import/page.tsx` + `components/import/smart-import-hub.tsx`

Three-tab interface:
1. **Brain Dump** — paste anything, AI categorizes and structures it
2. **Import Clients** — optimized for client data (auto-detects single vs bulk)
3. **Import Recipe** — optimized for recipe capture

Flow: Input → Parse → Review → Save

The review phase shows:
- Confidence badges (green/yellow/red)
- Allergy alerts (red, prominent)
- Field-level confidence indicators (checkmark = confirmed, ? = inferred)
- Per-record Save/Discard buttons
- "Save All" for batch operations

### Smart Fill on Inquiry Form

`components/import/smart-fill-modal.tsx` integrated into `components/inquiries/inquiry-form.tsx`

A "Paste from text" link at the top of the inquiry form opens a modal. Chef pastes a text thread or email, AI extracts inquiry details, and the form pre-fills. The chef reviews and submits normally.

### Navigation

"Import" added to chef nav bar (last item, utility section).

## New Dependencies

- `@anthropic-ai/sdk` — Anthropic API client
- `ANTHROPIC_API_KEY` env var (added to `.env.local.example`)

## Files Created

| File | Purpose |
|------|---------|
| `lib/ai/parse.ts` | Core AI parsing engine |
| `lib/ai/parse-client.ts` | Client parser |
| `lib/ai/parse-clients-bulk.ts` | Bulk client parser |
| `lib/ai/parse-recipe.ts` | Recipe parser |
| `lib/ai/parse-brain-dump.ts` | Brain dump categorizer |
| `lib/ai/parse-inquiry.ts` | Inquiry Smart Fill parser |
| `lib/ai/import-actions.ts` | Server actions for saving parsed data |
| `app/(chef)/import/page.tsx` | Smart Import hub page |
| `components/import/smart-import-hub.tsx` | Import hub client component |
| `components/import/smart-fill-modal.tsx` | Reusable Smart Fill modal |

## Files Modified

| File | Change |
|------|--------|
| `components/navigation/chef-nav.tsx` | Added "Import" nav item |
| `components/inquiries/inquiry-form.tsx` | Added Smart Fill button + modal integration |
| `lib/utils/currency.ts` | Added `formatCentsToDisplay()` utility |
| `.env.local.example` | Added `ANTHROPIC_API_KEY` variable |
| `package.json` / `package-lock.json` | Added `@anthropic-ai/sdk` dependency |

## Design Decisions

1. **Graceful degradation**: If `ANTHROPIC_API_KEY` is not set, the import page shows a warning instead of crashing. The feature is additive — the rest of ChefFlow works without it.

2. **Schema-validated AI output**: Every AI response is validated through Zod before use. If the AI returns malformed JSON or missing required fields, the error is caught and surfaced clearly rather than silently corrupting data.

3. **Chef reviews everything**: The AI parses, the chef confirms. Nothing enters the database without explicit human approval. This matches the master doc principle.

4. **Placeholder emails for imported clients**: Since `email` is required on the clients table, imported clients without an email get a placeholder (`name@placeholder.import`). The chef can update this later.

5. **Find-or-create ingredients**: Recipe import doesn't blindly create duplicate ingredients. It checks by name first, creating only when needed.

6. **Confidence as UI, not enforcement**: Confidence levels are visual indicators to help the chef review, not gates that prevent saving. Low-confidence data can still be saved if the chef confirms it.

## Verification

- `npx tsc --noEmit` — 0 errors
- `npm run build` — clean build, all routes compile
- `/import` route renders at 6.4 kB
- `/inquiries/new` route with Smart Fill at 6.14 kB
- All existing routes unaffected

## What's NOT in This Phase

- Voice input (would require speech-to-text integration)
- Image/photo parsing (OCR for handwritten recipes)
- Auto-deduplication against existing clients during import
- Email sending for client import notifications
- Undo/rollback for imported records
