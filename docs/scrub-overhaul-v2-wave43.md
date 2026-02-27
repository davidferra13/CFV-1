# Prospecting Hub — Wave 4.3: Dashboard, Manual Add, Gmail Guard & Funnel Analytics

> Implemented: 2026-02-27
> Rating before: 95/100 | Target: 98+/100

## Summary

Four improvements pushing the prospecting system from "professional-grade" to "complete":

| #   | Feature                     | What It Does                                                                   |
| --- | --------------------------- | ------------------------------------------------------------------------------ |
| 1   | **Dashboard Widget**        | Prospecting stats (active pipeline, conversion rate, follow-ups) on dashboard  |
| 2   | **Manual Add Prospect**     | UI form to add word-of-mouth leads without running an AI scrub                 |
| 3   | **Gmail Connection Guard**  | Shows "Connect Gmail" guidance when Gmail isn't linked, instead of broken Send |
| 4   | **Conversion Funnel Panel** | Visual pipeline funnel with stage counts, percentages, and avg time-in-stage   |

## Files Created

| File                                                 | Purpose                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `components/dashboard/prospecting-widget.tsx`        | Dashboard card showing pipeline activity + conversion rate   |
| `components/prospecting/add-prospect-modal.tsx`      | Manual add form with name, type, category, contact, location |
| `components/prospecting/conversion-funnel-panel.tsx` | Visual funnel bar chart with stage metrics and win rate      |

## Files Modified

| File                                             | Changes                                                                                                              |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `lib/prospecting/pipeline-actions.ts`            | Added 3 new server actions: `getConversionFunnelStats`, `getHotPipelineCount`, `checkGmailConnected`                 |
| `app/(chef)/dashboard/page.tsx`                  | Added prospecting imports, empty defaults, data fetches (prospectStats + hotPipelineCount), ProspectingWidget render |
| `app/(chef)/prospecting/page.tsx`                | Added AddProspectButton to header, ConversionFunnelPanel between stats and filters, fetches funnel data in parallel  |
| `app/(chef)/prospecting/[id]/page.tsx`           | Added `checkGmailConnected()` to parallel data fetch, passes `gmailConnected` to dossier client                      |
| `app/(chef)/prospecting/[id]/dossier-client.tsx` | Added `gmailConnected` to DossierProps interface and passes it to SendEmailPanel                                     |
| `components/prospecting/send-email-panel.tsx`    | Added `gmailConnected` prop; shows "Connect Gmail" guidance link when not connected instead of broken Send button    |

## Architecture Notes

### Dashboard Widget

- Added to the second `Promise.all` block (TypeScript 44-element tuple limit)
- Uses existing `getProspectStats()` from `lib/prospecting/actions.ts`
- New `getHotPipelineCount()` counts prospects in `responded` or `meeting_set` stages
- Widget only renders when `stats.total > 0` (no empty state noise)
- Placed alongside Pipeline Forecast in the business_snapshot section

### Manual Add Form

- `AddProspectButton` renders as a button that expands to an inline form
- Calls existing `addProspectManually()` server action (already existed, just had no UI)
- Validates via the existing `ManualProspectSchema` (Zod)
- Form fields: name (required), type, category, email, phone, contact person, city, state, notes

### Gmail Connection Guard

- Server page checks `google_connections` table for `gmail_connected` flag
- Passed down: page → dossier-client → SendEmailPanel
- When `gmailConnected=false`: shows link to Settings > Integrations instead of Send button
- When `gmailConnected=true`: behaves exactly as before (no change)
- Backwards-compatible: `gmailConnected` defaults to `false` for safety

### Conversion Funnel Panel

- `getConversionFunnelStats()` counts prospects per pipeline stage + calculates avg days in stage
- Avg days computed from `prospect_stage_history` table (transition pairs)
- Ordered funnel: new → researched → contacted → responded → meeting_set → converted → lost
- Shows bar chart with percentages, win rate summary, and avg time-in-stage per step
- Renders between stats cards and filter bar on the main prospecting page
