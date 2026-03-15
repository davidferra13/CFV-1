# Post-Event Waste Tracking

## What Changed

Added a food waste logging system that lets chefs track what got wasted per event, estimate cost impact, and surface actionable insights over time. No competitor offers this.

## Files

| File                                                      | Purpose                                                               |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| `supabase/migrations/20260401000009_event_waste_logs.sql` | Table with RLS, indexes, category/reason enums via CHECK constraints  |
| `lib/events/waste-tracking-actions.ts`                    | 6 server actions: CRUD + aggregated summary + deterministic insights  |
| `components/events/waste-log-panel.tsx`                   | Client component for event detail page (post-event, completed status) |
| `components/dashboard/waste-summary-widget.tsx`           | Server component for dashboard: trend, categories, reasons, insights  |

## Schema

`event_waste_logs` table:

- `tenant_id` FK to chefs (RLS scoped)
- `event_id` FK to events
- `category`: protein, produce, dairy, grain, prepared_dish, other
- `reason`: overproduction, spoilage, guest_no_show, dietary_change, quality_issue, other
- `estimated_cost_cents`: integer (all monetary in cents per project rules)
- `quantity_description`: freeform text ("2 lbs", "half tray", "3 portions")

## Insights (Deterministic, No AI)

All insights use formula logic, not Ollama:

1. **Overproduction** > 50% of entries: suggest reducing portions by 10-15%
2. **Guest no-shows** > 20%: suggest deposit/confirmation policy
3. **Spoilage** > 25%: suggest better storage or closer sourcing
4. **Waste ratio** > 15% of event food cost: flag high-waste events (uses `event_financial_summary` view)

## Integration Points

- `WasteLogPanel` takes `eventId` and `initialEntries` props. Mount on event detail page for completed events.
- `WasteSummaryWidget` takes `summary` and `insights` props. Fetch via `getWasteSummary()` and `getWasteInsights()` from parent server component.
- Both components follow existing project patterns (stone color scheme, Card/Badge components, cents formatting).

## Not Done (Requires Separate Work)

- Wiring into event detail page (conditional render for completed events)
- Wiring into dashboard page
- Tier assignment (likely Pro, sustainability module)
- Migration has not been applied (`supabase db push` needed)
