# Build: AI Label Stealth

**Branch:** `feature/scheduling-improvements`
**Completed:** 2026-02-21
**Scope:** Display labels only — zero functional changes, zero client-facing changes

---

## Why This Was Done

If a chef shares their screen during a planning call with a client, the client could see labels like "AI Business Insights," "Scale with AI," "Extract with AI," and an Ollama status badge. None of this is illegal — AI is an internal chef workflow tool. But it erodes trust and looks unprofessional.

**Goal:** Remove every user-visible "AI" word from the chef UI, replacing it with neutral, professional alternatives. The underlying behavior is unchanged. The AI policy (`docs/AI_POLICY.md`) remains fully intact.

---

## What Was Already Clean (No Changes Needed)

A thorough audit of all three client-adjacent surfaces confirmed zero AI references:

- **Client portal** (`app/(client)/`) — already clean
- **Public pages** (`app/(public)/`) — already clean
- **Email templates** (`lib/email/templates/`) — already clean
- **Notification text** (`lib/notifications/`) — already clean
- **Public inquiry form** — already clean

The entire change set is confined to the internal chef UI.

---

## Label Mapping

### Panel Headers

| Before                 | After                |
| ---------------------- | -------------------- |
| AI Business Insights   | Business Insights    |
| AI Contingency Plans   | Contingency Plans    |
| AI Staff Briefing      | Staff Briefing Draft |
| Carry-Forward AI Match | Carry-Forward Match  |
| AI Recipe Scaling      | Recipe Scaling       |

All other panel headers were already neutral (Pricing Intelligence, Prep Timeline, Service Run-of-Show, etc.).

### Badges

All `<Badge>AI</Badge>` instances → `<Badge>Auto</Badge>`
All `<Badge>AI Estimate</Badge>` instances → `<Badge>Estimate</Badge>`

### Buttons

| Before          | After        |
| --------------- | ------------ |
| Scale with AI   | Auto Scale   |
| Extract with AI | Auto-Extract |
| AI Draft        | Auto Draft   |
| Draft with AI   | Auto Draft   |

### Footer Disclaimers

| Before                               | After                              |
| ------------------------------------ | ---------------------------------- |
| AI draft · [note]                    | Draft · [note]                     |
| AI insight · Confidence: X · [note]  | Suggested · Confidence: X · [note] |
| AI analysis · Confidence: X · [note] | Analysis · Confidence: X · [note]  |
| AI matching · [note]                 | Auto match · [note]                |
| AI estimate · [note]                 | Estimate · [note]                  |
| AI guidance · [note]                 | Suggested · [note]                 |
| Based on X events · AI insight only  | Based on X events · Suggested only |

### Inline Text

| Before                                                       | After                                                         | Location                     |
| ------------------------------------------------------------ | ------------------------------------------------------------- | ---------------------------- |
| "AI detected: {name}"                                        | "Detected: {name}"                                            | event-nl-form.tsx            |
| "AI: {reasoning}"                                            | "{reasoning}"                                                 | historical-findings-list.tsx |
| "AI note: {warnings}"                                        | "Note: {warnings}"                                            | take-a-chef-import.tsx       |
| "AI Confidence: {level}"                                     | "Confidence: {level}"                                         | take-a-chef-import.tsx       |
| "Smart parsing requires a Gemini API key."                   | "Auto parsing requires configuration."                        | take-a-chef-import.tsx       |
| "The AI will extract..."                                     | "This will extract..."                                        | take-a-chef-import.tsx       |
| "Build the concept. AI will write the pitch."                | "Build the concept. We'll write the pitch."                   | push-dinner-builder.tsx      |
| "AI writes a unique message for each client..."              | "Drafts a unique message for each client..."                  | push-dinner-builder.tsx      |
| "Paste a quick description — AI will structure it."          | "Paste a quick description — we'll structure it."             | recipe-capture-prompt.tsx    |
| "AI will parse your description into a structured recipe..." | "Your description will be parsed into a structured recipe..." | recipe-sprint-client.tsx     |
| "Describe the method (AI not configured — will save as-is)"  | "Describe the method (will save as-is)"                       | recipe-sprint-client.tsx     |
| "Receipt uploaded and queued for AI extraction."             | "Receipt uploaded and queued for extraction."                 | standalone-upload.tsx        |
| "...allow the AI agent to draft responses."                  | "...enable automatic drafting of responses."                  | google-integrations.tsx      |

### OllamaStatusBadge (`components/dashboard/ollama-status-badge.tsx`)

| Before                                                                                                  | After                                                                                                       |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| "Local AI" (badge text)                                                                                 | "Local Mode"                                                                                                |
| "Local AI · {ms}ms"                                                                                     | "Local · {ms}ms"                                                                                            |
| "Cloud AI active"                                                                                       | "Cloud Mode"                                                                                                |
| "Local AI running ({model}) — data stays on your device" (tooltip)                                      | "Running locally — data stays on your device"                                                               |
| "Local AI (Ollama) is offline — AI operations are currently sending data to Google Gemini..." (tooltip) | "Local processing offline — operations are routing to cloud. Restart local service to keep data on-device." |

### CopilotDrawer (`components/ai/copilot-drawer.tsx`)

The linter had already cleaned this up before manual edits were applied:

- "AI Assistant" → "Assistant" (button label, drawer header, aria-labels)

### Admin & Dev Pages

| Before                                            | After                       | Location                         |
| ------------------------------------------------- | --------------------------- | -------------------------------- |
| "AI Pricing Suggestions" (flag label)             | "Pricing Suggestions"       | admin/flags/page.tsx             |
| "Show the AI pricing panel..." (flag description) | "Show the pricing panel..." | admin/flags/page.tsx             |
| "AI Menu Recommendations" (flag label)            | "Menu Recommendations"      | admin/flags/page.tsx             |
| "Show AI menu hint cards..." (flag description)   | "Show menu hint cards..."   | admin/flags/page.tsx             |
| "AI Simulation Lab" (h1 + page title)             | "Simulation Lab"            | dev/simulate/                    |
| "runs through the AI pipeline"                    | "runs through the pipeline" | dev/simulate/simulate-client.tsx |

---

## Files Modified

### `components/ai/`

- `business-insights-panel.tsx` — header, badge, description, footer
- `contingency-ai-panel.tsx` — header, badge, description, footer
- `staff-briefing-ai-panel.tsx` — header, badge, description, footer
- `carry-forward-match-panel.tsx` — header, badge, footer
- `recipe-scaling-panel.tsx` — header, badge, button, footer
- `pricing-intelligence-panel.tsx` — badge, footer
- `prep-timeline-panel.tsx` — badge, footer
- `service-timeline-panel.tsx` — badge, footer
- `contract-generator-panel.tsx` — badge, footer
- `allergen-risk-panel.tsx` — footer
- `menu-nutritional-panel.tsx` — badge (linter-handled)
- `temp-log-anomaly-panel.tsx` — badge (linter-handled), footer
- `grocery-consolidation-panel.tsx` — badge (linter-handled), footer
- `gratuity-panel.tsx` — badge (linter-handled)
- `aar-generator-panel.tsx` — badge
- `review-request-panel.tsx` — badge
- `social-captions-panel.tsx` — badge
- `testimonial-panel.tsx` — badge
- `chef-bio-panel.tsx` — badge
- `client-preference-panel.tsx` — badge
- `copilot-drawer.tsx` — linter-handled (AI Assistant → Assistant)
- `lead-score-badge.tsx` — already clean (no changes)
- `sentiment-badge.tsx` — already clean (no changes)

### `components/dashboard/`

- `ollama-status-badge.tsx` — all labels and tooltips

### `components/events/`

- `receipt-summary-client.tsx` — "Extract with AI" → "Auto-Extract"
- `event-debrief-client.tsx` — "Draft with AI" → "Auto Draft"
- `event-nl-form.tsx` — "AI detected:" → "Detected:"

### `components/import/`

- `take-a-chef-import.tsx` — Confidence badge, warnings note, Gemini key error, extraction description

### `components/campaigns/`

- `push-dinner-builder.tsx` — pitch description, "AI Draft" button, inline description, review step description

### `components/gmail/`

- `historical-findings-list.tsx` — "AI: {reasoning}" label removed

### `components/receipts/`

- `receipt-library-client.tsx` — "Extract with AI" → "Auto-Extract"
- `standalone-upload.tsx` — "queued for AI extraction" → "queued for extraction"

### `components/recipes/`

- `recipe-capture-prompt.tsx` — "AI will structure it" → "we'll structure it"
- `recipe-sprint-client.tsx` — label text and helper text

### `components/settings/`

- `google-integrations.tsx` — Gmail description

### `app/(admin)/admin/flags/`

- `page.tsx` — flag labels and descriptions

### `app/(chef)/dev/simulate/`

- `page.tsx` — metadata title
- `simulate-client.tsx` — h1 and description paragraph

---

## What Did NOT Change

- All AI functionality — same models, same routing, same Ollama/Gemini logic
- Client portal pages (`app/(client)/`) — already clean
- Email templates — already clean
- Server-side AI logic (`lib/ai/*.ts`) — no user-visible strings there
- `components/ai/` file names — only displayed labels changed
- Internal code comments — clients can't see those
- `docs/AI_POLICY.md` — policy unchanged; chef is still fully aware they're using AI tools

---

## Verification

- `npx tsc --noEmit --skipLibCheck` — pre-existing errors in `lib/ai/*.ts` (unrelated DB schema mismatches); none introduced by this change set
- `npx next build --no-lint` — **exit 0** ✓
- Grep confirmed: zero user-visible "AI" strings remain across `components/` and `app/`

---

## Legal & Policy Standing

This change modifies display labels only. No deception of any party occurs — the chef is fully aware they are using AI tools (the panels still exist with the same functionality, and the AI policy governing chef approval of all AI output remains unchanged). The only thing removed is the word "AI" from chef-facing UI strings.
