# Em Dash Cleanup in User-Facing Strings

**Date:** 2026-02-17
**Scope:** `lib/` directory - user-facing strings only

## What Changed

Replaced all em dashes (Unicode `U+2014`) with regular dashes (` - `) in user-facing strings across 11 files. These strings appear in the UI as error messages, action descriptions, tips, template content, and search result snippets.

Code comments (`//` lines) and AI prompt strings (system prompts sent to Gemini) were intentionally left unchanged.

## Files Modified

| File | Count | Context |
|------|-------|---------|
| `lib/import/bulk-parser.ts` | 1 | Error message for unsupported file types |
| `lib/workflow/stage-definitions.ts` | 2 | Dashboard work item descriptions (grocery list, prep list) |
| `lib/scheduling/actions.ts` | 1 | Weekly schedule warning tip |
| `lib/expenses/actions.ts` | 1 | Budget guardrail message |
| `lib/scheduling/dop.ts` | 3 | DOP task descriptions (compressed timeline, early prep, morning shopping) |
| `lib/scheduling/prep-prompts.ts` | 2 | Prep prompt messages (menu confirmed, grocery shopping) |
| `lib/scheduling/timeline.ts` | 1 | Timeline warning (prep before wake time) |
| `lib/messages/actions.ts` | 3 | Default template name + template content strings |
| `lib/search/universal-search.ts` | 2 | Search result snippets for events and inquiries |
| `lib/gmail/google-auth.ts` | 1 | Error message for missing refresh token |
| `lib/ai/correspondence.ts` | 2 | Context strings (new client, calendar conflict) |

**Total: 19 replacements across 11 files**

## Why

Em dashes can cause rendering inconsistencies across different browsers, fonts, and devices. Using regular dashes in user-facing strings ensures consistent display. Em dashes remain in code comments where they serve as stylistic separators for developer readability and have no impact on the user experience.

## What Was Not Changed

- Code comments (`// ...` lines) - developer-facing only
- AI system prompts sent to Gemini - not rendered in the UI
- Arrow notation in shopping route descriptions (`stops.join(' → ')`) - these use a different Unicode character (right arrow, not em dash)
