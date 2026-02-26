# AI Co-Pilot Drawer — Build Notes

## Overview

This document covers the implementation of the AI Co-Pilot floating drawer and four AI feature server actions added to ChefFlow V1.

---

## Files Created

### Server Actions (`lib/ai/`)

#### `lib/ai/copilot-actions.ts`

General-purpose conversational AI assistant for the co-pilot drawer.

- **Export:** `sendCopilotMessage(userMessage, conversationHistory) → Promise<string>`
- **Export type:** `CopilotMessage { role, content, timestamp }`
- Loads chef context (business name, tagline) and the 5 most recent events as system context
- Builds the full conversation history as a `contents` array with alternating `user`/`model` roles — the format required by `@google/genai`'s `models.generateContent`
- System instruction enforces draft-only behavior and reminds the model it cannot take autonomous actions

#### `lib/ai/menu-suggestions.ts`

Generates three distinct themed menu options for a specific event.

- **Export:** `getAIMenuSuggestions(eventId) → Promise<MenuSuggestion[]>`
- **Export type:** `MenuSuggestion { name, courses[], rationale }`
- Fetches event's dietary restrictions, allergies, special requests, guest count, and occasion
- Pulls up to 30 of the chef's recipes (name, category, dietary_tags) for inspiration context
- Uses `responseMimeType: 'application/json'` to get structured JSON directly from Gemini
- Returns exactly 3 menu options (sliced to enforce the limit)

#### `lib/ai/quote-draft.ts`

Generates a structured quote draft from an inquiry's confirmed details.

- **Export:** `generateQuoteDraft(inquiryId) → Promise<QuoteDraftResult>`
- **Export type:** `QuoteDraftResult { title, description, lineItems[], totalCents, notes }`
- Loads inquiry's confirmed occasion, date, guest count, budget, dietary restrictions, and service expectations
- Computes the chef's historical average per-guest rate from the last 10 completed events; falls back to $150/person
- Calculates `totalCents` client-side by summing line items after the AI response, never relying on AI arithmetic
- Uses `responseMimeType: 'application/json'` and temperature 0.5 (lower = more deterministic pricing)

#### `lib/ai/followup-draft.ts`

Drafts a warm, personalized follow-up message for a specific client.

- **Export:** `generateFollowUpDraft(clientId) → Promise<string>`
- Fetches client's full name, dietary restrictions, allergies, and vibe notes
- Fetches the client's most recent event for contextual reference
- System instruction enforces first-person singular, genuine tone — no corporate language
- Returns plain text only (no subject line, no markdown)

---

### UI Component (`components/ai/`)

#### `components/ai/copilot-drawer.tsx`

Floating chat drawer, client component only.

**Trigger:** Fixed `bottom-6 right-6` floating button with `Bot` icon and "AI Assistant" label (hidden on mobile).

**Drawer behavior:**

- Slides in from the right as a `max-w-md` full-height panel
- Clicking the overlay backdrop closes the drawer
- Header uses `bg-brand-600` with white text

**Conversation UI:**

- Empty state shows four starter prompts that call `handleSend` directly when clicked
- Messages render with right-aligned user bubbles (`bg-brand-600 text-white`) and left-aligned assistant bubbles (`bg-stone-100`)
- All message text rendered in `<pre className="whitespace-pre-wrap font-sans">` — never `react-markdown`
- Auto-scrolls to the latest message via `messagesEndRef`

**Input:**

- Auto-grow `<textarea>` with `Enter` to send, `Shift+Enter` for newline
- `Button variant="primary"` with `Send` icon
- Footer disclaimer: "All suggestions require your review before use"

**Error handling:** `toast.error()` from `sonner` for action failures.

---

## Pattern Alignment

All four server actions follow the established `gemini-service.ts` patterns exactly:

| Pattern        | Used                                                                              |
| -------------- | --------------------------------------------------------------------------------- |
| Import         | `import { GoogleGenAI } from '@google/genai'`                                     |
| Client factory | `const getClient = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })` |
| API call       | `ai.models.generateContent({ model, contents, config })`                          |
| Model          | `gemini-2.0-flash`                                                                |
| Response text  | `response.text` (not `result.response.text()`)                                    |
| Auth guard     | `requireChef()`                                                                   |
| DB client      | `createServerClient()`                                                            |
| Tenant scope   | `.eq('tenant_id', user.entityId)` on every query                                  |

---

## Schema Column Verification

All Supabase select queries were verified against `types/database.ts` before finalizing. Columns originally in the spec that do not exist in the live schema were replaced:

| Spec column                   | Replaced with                    | Table       |
| ----------------------------- | -------------------------------- | ----------- |
| `cuisine_specialty`           | `tagline`                        | `chefs`     |
| `chef_id` (clients filter)    | `tenant_id`                      | `clients`   |
| `special_preferences`         | `vibe_notes`                     | `clients`   |
| `chef_id` (recipes filter)    | `tenant_id`                      | `recipes`   |
| `cuisine_type`, `course_type` | `category`                       | `recipes`   |
| `dietary_notes`               | `confirmed_dietary_restrictions` | `inquiries` |
| `special_requests`            | `confirmed_service_expectations` | `inquiries` |

---

## AI Policy Compliance

Per `docs/AI_POLICY.md`:

- All outputs are presented as **drafts** — the chef must review before any content becomes canonical
- No ledger writes, no lifecycle transitions, no autonomous actions in any of these server actions
- Litmus test passes: removing AI leaves all core functionality intact

---

## How to Wire the Drawer

The `CopilotDrawer` component is a standalone floating UI. Add it once to any layout that should show the assistant:

```tsx
// Example: app/(chef)/layout.tsx
import { CopilotDrawer } from '@/components/ai/copilot-drawer'

export default function ChefLayout({ children }) {
  return (
    <>
      {children}
      <CopilotDrawer />
    </>
  )
}
```

The individual server actions (`getAIMenuSuggestions`, `generateQuoteDraft`, `generateFollowUpDraft`) are standalone and can be called from any relevant page or component — for example, from an event detail page's "Suggest Menu" button or a client detail page's "Draft Follow-Up" button.
