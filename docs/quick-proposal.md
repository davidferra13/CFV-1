# Quick Proposal / One-Click Quote from Event

## Overview

Chefs can generate a professional proposal/quote directly from an existing event's data. The system pre-fills all available information (client, date, menu, dietary, pricing) so the chef can review, adjust, and create a quote in one click.

## How It Works

1. Chef views an event detail page and clicks "Quick Proposal"
2. System pulls event data (client info, date, occasion, guest count, menu, dietary restrictions, pricing)
3. A slide-over panel shows a full proposal preview with all fields editable
4. Chef adjusts pricing, adds terms, sets deposit requirements
5. Chef clicks "Create Quote" to generate an actual quote record linked to the event

## Files

| File | Purpose |
|------|---------|
| `lib/quotes/quick-proposal-actions.ts` | Server actions: fetch event data, create quote from proposal |
| `components/quotes/proposal-preview.tsx` | Editable proposal preview with pricing, terms, and create button |
| `components/events/quick-proposal-button.tsx` | Button + slide-over panel for event detail pages |
| `components/quotes/default-terms-form.tsx` | Settings form for default proposal terms |

## Server Actions

- `generateProposalFromEvent(eventId)` - Pulls event, client, chef, and menu data into a structured proposal object
- `getProposalPreview(eventId)` - Alias for generateProposalFromEvent (same data)
- `createQuoteFromProposal(eventId, overrides?)` - Creates a quote record from event data with optional overrides for pricing, deposit, terms
- `getDefaultTerms()` - Placeholder for future DB-backed terms (currently returns null)
- `saveDefaultTerms(terms)` - Placeholder for future DB-backed terms

## Proposal Data Flow

```
Event (DB) --> generateProposalFromEvent() --> ProposalData object
                                                    |
                                              ProposalPreview (editable UI)
                                                    |
                                              createQuoteFromProposal()
                                                    |
                                              Quote record (DB)
```

## Default Terms

Terms are stored in `localStorage` under the key `chefflow-default-proposal-terms`. This keeps things simple without requiring a DB migration. When a chef creates a proposal, saved terms are pre-filled. They can be edited per-proposal before creating the quote.

The `DefaultTermsForm` component can be placed on a settings page to let chefs configure their default terms with a starter template.

## Safeguards

- Event must belong to the chef's tenant (enforced server-side)
- Cannot create a duplicate quote for an event that already has one
- Total price must be positive to create a quote
- Quote is created in `draft` status (standard quote pipeline)
- Activity logging is non-blocking (wrapped in try/catch)
- All money values in cents (standard pattern)

## Integration Points

- The `QuickProposalButton` should be placed on the event detail page
- It accepts `hasExistingQuote` prop to disable the button when a quote already exists
- After quote creation, the user is navigated to the new quote's detail page
- The quote links back to the event via `event_id`

## Future Enhancements

- DB-backed default terms (per-chef settings table)
- PDF export of proposals
- Email proposal directly to client
- Proposal templates (different terms for different occasion types)
