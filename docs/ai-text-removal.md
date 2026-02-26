# AI Text Removal — UI Branding Cleanup

**Date:** 2026-02-20

## Why

The word "AI" was appearing in a handful of user-visible UI strings. The decision was made to remove all AI branding from the customer-facing interface. The underlying features remain unchanged — only the labeling was updated.

## What Changed

### `components/clients/allergy-records-panel.tsx`

- Source label: `"AI detected — pending confirmation"` → `"Auto-detected — pending confirmation"`
- Warning message: `"AI-detected allergen"` → `"auto-detected allergen"`

### `components/import/take-a-chef-import.tsx`

- Alert title: `"AI Not Configured"` → `"Parsing Not Configured"`
- Alert body: `"AI parsing requires a Gemini API key..."` → `"Smart parsing requires a Gemini API key..."`

### `app/(chef)/recipes/new/create-recipe-client.tsx`

- Warning message: removed `"Set GEMINI_API_KEY in your environment to enable Smart Import"` — replaced with `"Contact your administrator to enable this feature."`

## What Did Not Change

- `components/chat/chat-insights-panel.tsx` — already said "Smart Suggestions" (no AI)
- `components/analytics/pricing-suggestion-panel.tsx` — says "Suggestion only — final pricing is your decision." (no AI)
- All "Smart Import" labels — kept as-is (no AI wording)
- Internal variable names (`aiConfigured`, `isAIConfigured`) — code-only, never rendered
- JSX comments (`{/* AI Insights */}`) — not rendered to browser
- All `lib/ai/` server-side code — user never sees this

## No Functional Changes

Zero logic was touched. The underlying parsing, detection, and suggestion systems operate identically. This was a text-only change.
