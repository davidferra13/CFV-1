# Em Dash Cleanup in User-Facing Strings

**Date:** 2026-02-17
**Scope:** `lib/` and `components/` directories - user-facing strings only

## What Changed

Replaced all em dashes (Unicode `U+2014`) with regular dashes (`-`) in user-facing strings across two passes: first the `lib/` layer (11 files), then the `components/` layer (9 files). These strings appear in the UI as labels, placeholders, tooltips, helper text, displayed values, alert messages, and template content.

Code comments (`//` lines), AI prompt strings, and regex patterns were intentionally left unchanged.

---

## Pass 1: Library Layer (lib/)

| File                                | Count | Context                                                                   |
| ----------------------------------- | ----- | ------------------------------------------------------------------------- |
| `lib/import/bulk-parser.ts`         | 1     | Error message for unsupported file types                                  |
| `lib/workflow/stage-definitions.ts` | 2     | Dashboard work item descriptions (grocery list, prep list)                |
| `lib/scheduling/actions.ts`         | 1     | Weekly schedule warning tip                                               |
| `lib/expenses/actions.ts`           | 1     | Budget guardrail message                                                  |
| `lib/scheduling/dop.ts`             | 3     | DOP task descriptions (compressed timeline, early prep, morning shopping) |
| `lib/scheduling/prep-prompts.ts`    | 2     | Prep prompt messages (menu confirmed, grocery shopping)                   |
| `lib/scheduling/timeline.ts`        | 1     | Timeline warning (prep before wake time)                                  |
| `lib/messages/actions.ts`           | 3     | Default template name + template content strings                          |
| `lib/search/universal-search.ts`    | 2     | Search result snippets for events and inquiries                           |
| `lib/gmail/google-auth.ts`          | 1     | Error message for missing refresh token                                   |
| `lib/ai/correspondence.ts`          | 2     | Context strings (new client, calendar conflict)                           |

Pass 1 subtotal: 19 replacements across 11 files.

---

## Pass 2: Component Layer (components/)

### 1. `components/aar/aar-form.tsx` (3 edits)

- `label="Menu notes - what did the client love?"`
- `label="Client notes - anything to remember?"`
- `label="Site notes - anything new about the location?"`

### 2. `components/expenses/expense-form.tsx` (2 edits)

- Event option label template: `'Untitled'} - ${format(...)}`
- Line items text: `items - mark each as business or personal`

### 3. `components/messages/template-manager.tsx` (1 edit)

- Placeholder: `"e.g. First response - new inquiry"`

### 4. `components/clients/milestone-manager.tsx` (1 edit)

- Milestone display: `` ` - ${m.notes}` ``

### 5. `components/settings/connected-accounts.tsx` (1 edit)

- Email subject display: `- {entry.subject}`

### 6. `components/scheduling/dop-view.tsx` (1 edit)

- Alert text: `"Compressed timeline - "`

### 7. `components/chat/chat-image-upload.tsx` (1 edit)

- Helper text: `"JPEG, PNG, WebP, HEIC - max 10MB"`

### 8. `components/inquiries/inquiry-form.tsx` (2 edits)

- SmartFillModal title: `"Smart Fill - Paste Text"`
- Select helperText: `"Optional - select if this is a known client"`

### 9. `components/import/smart-import-hub.tsx` (9 edits)

- Brain dump placeholder: `"Paste anything - client info..."`, `"Michel - Belgian"`, `"Diane sauce - sear..."`
- Import clients placeholder: `"Michel - Belgian"`, `"Murr - real name Mary"`
- Import recipe placeholder: `"Diane sauce - sear the steak first"`
- Import document placeholder: `"Cancellation Policy - Events cancelled..."`
- Event option label template: `'Untitled'} - ${e.event_date}`
- FieldRow tooltip title: `"Inferred - please verify"`
- Allergy alert text: `- Please verify before saving.`
- Household member FieldRow value: `` ` - ${m.notes}` ``
- Regular guest FieldRow value: `` ` - ${g.notes}` ``

Pass 2 subtotal: 21 replacements across 9 files.

---

## Pass 3: App Pages (app/)

| File                                              | Count | Context                                                          |
| ------------------------------------------------- | ----- | ---------------------------------------------------------------- |
| `app/layout.tsx`                                  | 2     | Meta description + OG description                                |
| `app/(chef)/financials/financials-client.tsx`     | 3     | Empty cell placeholders in event table                           |
| `app/(chef)/expenses/[id]/page.tsx`               | 2     | Vendor name + event date display                                 |
| `app/(chef)/expenses/page.tsx`                    | 1     | Empty cell placeholder                                           |
| `app/(chef)/quotes/[id]/page.tsx`                 | 5     | Client email, deposit, inquiry status, event date, internal note |
| `app/(chef)/events/[id]/schedule/page.tsx`        | 3     | Serve time, guest count, location city                           |
| `app/(chef)/dashboard/page.tsx`                   | 3     | Command center subtitle, trend messages                          |
| `app/(chef)/recipes/new/create-recipe-client.tsx` | 2     | Placeholder text for recipe input                                |
| `app/auth/signup/page.tsx`                        | 1     | Helper text for optional field                                   |

Pass 3 subtotal: 22 replacements across 9 files.

---

## Grand Total

62 replacements across 29 files.

## Why

Em dashes can cause rendering inconsistencies across different browsers, fonts, and devices. Using regular dashes in user-facing strings ensures consistent display. Em dashes remain in code comments where they serve as stylistic separators for developer readability and have no impact on the user experience.

## What Was Not Changed

- **Code comments** (`// ...` lines) - developer-facing only
- **AI system prompts** sent to Gemini - not rendered in the UI
- **Regex pattern** in `smart-import-hub.tsx`: `/^[\s]*[-\u2014]/m` - the em dash is part of multi-client detection logic and must remain for correct parsing
- **Arrow notation** in shopping route descriptions (`stops.join(' \u2192 ')`) - uses a different Unicode character (right arrow, not em dash)
