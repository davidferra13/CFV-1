# Co-Hosted Dinner: Build Spec

> **Senior engineering recommendation.** Three independent Codex tasks, scoped to be safe.
> Each task is UI over existing backend. No new database tables. No financial logic changes.

---

## What Exists (DO NOT REBUILD)

| System                                    | Status | Key Files                                                                                     |
| ----------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| Event collaborators table + actions       | BUILT  | `lib/collaboration/actions.ts` (15 actions), `lib/collaboration/settlement-actions.ts`        |
| Event tickets + purchase flow             | BUILT  | `lib/tickets/actions.ts`, `lib/tickets/purchase-actions.ts`, `lib/tickets/webhook-handler.ts` |
| Tickets tab on event detail               | BUILT  | `app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx`                             |
| Public event page with Stripe             | BUILT  | `app/(public)/e/[shareToken]/public-event-view.tsx`                                           |
| Settlement calculation (revenue splits)   | BUILT  | `lib/collaboration/settlement-actions.ts` (`getEventSettlement`)                              |
| Event financial summary view              | BUILT  | `event_financial_summary` DB view, `lib/events/financial-summary-actions.ts`                  |
| Menu -> dish -> component -> recipe chain | BUILT  | Cost rollup via `menu_cost_summary` view                                                      |
| Hub groups / dinner circles               | BUILT  | `lib/dinner-circles/`, `app/(public)/hub/`                                                    |

## What To Build (3 Tasks)

### Task A: Event Collaborators Panel

**What:** Add a "Team" card to the event detail overview tab showing collaborators and allowing invite/remove.

**Why:** The `event_collaborators` table and 15 server actions exist but have zero UI. A chef cannot invite a co-host, see who's on the team, or manage permissions.

**Scope:**

- New component: `components/collaboration/event-collaborators-panel.tsx`
- Insert into: `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx`
- Data fetch: add `getEventCollaborators(eventId)` call in `app/(chef)/events/[id]/page.tsx` and pass as prop

**UI spec:**

- Card with heading "Team"
- List of current collaborators: name, role badge, status badge (pending/accepted/declined)
- "Invite" button opens inline form: search connected chefs (`getConnectedChefsForCollaboration`), pick role, optional note
- Each collaborator row has a remove button (calls `removeCollaborator`)
- Empty state: "No collaborators yet. Invite a co-host or sous chef."

**Actions to wire (all exist in `lib/collaboration/actions.ts`):**

- `getEventCollaborators(eventId)` - read
- `getConnectedChefsForCollaboration(search?)` - search
- `inviteChefToEvent({ eventId, targetChefId, role, note? })` - create
- `removeCollaborator(collaboratorId)` - delete

**Patterns to follow:**

- Use `Card className="p-6"` for the container
- Use `Badge` for role/status (variants: `default`, `success`, `warning`, `info`)
- Use `Button` variants: `primary` for invite, `ghost` for remove
- Use `useTransition` + `startTransition` for mutations with try/catch + error toast
- Use `useRouter().refresh()` after mutations to reload server data

**DO NOT:**

- Create new database tables or modify schema
- Touch the settlement or financial logic
- Add new server actions (all needed actions exist)
- Modify the tab structure (this is a Card within the existing overview tab)

---

### Task B: Revenue Split Preview

**What:** Add a "Revenue Split" card to the event detail money tab showing how revenue is divided among collaborators.

**Why:** `getEventSettlement` exists and computes splits, but there's no UI. A chef cannot see what each collaborator earns before going live.

**Scope:**

- New component: `components/collaboration/settlement-preview-panel.tsx`
- Insert into: `app/(chef)/events/[id]/_components/event-detail-money-tab.tsx`
- Data fetch: add `getEventSettlement(eventId)` call in `app/(chef)/events/[id]/page.tsx` and pass as prop

**UI spec:**

- Card with heading "Revenue Split"
- Only render if collaborators exist (settlement is null when solo event, so: `if (!settlement) return null`)
- Show total revenue at top: `formatCurrency(settlement.totalRevenueCents)`
- Table with columns: Name, Role, Split %, Amount
- Each row = one collaborator from `settlement.collaborators[]`
- Bottom row = host chef: `settlement.hostChefSplitPercent`% / `settlement.hostChefSplitCents`
- Status badge per collaborator: pending/confirmed/paid
- If total revenue is 0, show: "Revenue splits will appear once pricing is set."

**Data shape (from `lib/collaboration/settlement-actions.ts`):**

```ts
type EventSettlement = {
  eventId: string
  eventName: string
  totalRevenueCents: number
  collaborators: CollaboratorSettlement[]
  hostChefSplitCents: number
  hostChefSplitPercent: number
}

type CollaboratorSettlement = {
  collaboratorId: string
  chefId: string
  chefName: string
  role: string
  station: string | null
  splitPercent: number
  splitAmountCents: number
  status: 'pending' | 'confirmed' | 'paid'
}
```

**Patterns to follow:**

- Use `Table, TableHeader, TableBody, TableRow, TableHead, TableCell` from `@/components/ui/table`
- Use `formatCurrency` from `@/lib/utils/currency` (amounts are in cents)
- Use `Badge` for status
- Pure display component, no mutations
- Use `Card className="p-6"` container

**DO NOT:**

- Modify settlement calculation logic
- Add payment/payout functionality
- Create new server actions
- Touch the ledger or financial summary

---

### Task C: Public Event Page Elevation

**What:** Enhance the public event page (`/e/[shareToken]`) to show collaborators, richer menu display, and ticket sales momentum.

**Why:** The page currently shows event name, date, location, ticket types, and a purchase form. It doesn't show who's involved, what the menu actually is, or any social proof. It needs to feel like a real event listing.

**Scope:**

- Modify: `app/(public)/e/[shareToken]/public-event-view.tsx`
- Modify: `lib/tickets/purchase-actions.ts` (`getPublicEventByShareToken`) to fetch additional data
- No new files needed

**Data additions to `PublicEventInfo` type and `getPublicEventByShareToken`:**

1. **Collaborators** - query `event_collaborators` where `status = 'accepted'`, join to `chefs` for `business_name`. Add to type:

```ts
collaborators: Array<{ role: string; businessName: string; chefSlug: string | null }>
```

2. **Menu dishes** - if `showMenu` is true, query `dishes` via the event's menu. Add to type:

```ts
menuDishes: Array<{ name: string; description: string | null; course: string | null }> | null
```

3. **Ticket sales momentum** - compute from existing ticket data. Add to type:

```ts
ticketsSold: number
totalCapacity: number
```

**UI additions to `PublicEventView` (purchase mode only):**

1. **Team section** (if collaborators.length > 0): heading "Your Hosts", list of collaborator business names with role labels. Simple text, no links to external pages.

2. **Menu section** (if menuDishes exists and showMenu): heading "The Menu", dishes grouped by course. Each dish: name in semibold, description below in muted text. If no dishes, show existing `menuSummary` string.

3. **Availability indicator** (if totalCapacity > 0): show "X of Y spots remaining" above the purchase form. Use green text if >50% available, yellow if >20%, red if <=20%. If sold out, show "Sold Out" badge and hide purchase form.

4. **Photos grid** (if publicPhotos.length > 0): simple 2-column grid of event photos above the purchase form. Already in the data, just not displayed.

**Layout order in purchase mode:**

1. Event name + date/time/location (existing)
2. Photos grid (new)
3. Team section (new)
4. Menu section (new)
5. Availability indicator (new)
6. Ticket selection + purchase form (existing)

**Patterns to follow:**

- This is a public page with no auth. Data queries use `{ admin: true }` client.
- Keep the existing purchase/confirmation/cancelled view modes intact
- Use Tailwind only (public pages don't use shadcn components heavily)
- Keep it clean and minimal. No animations, no clutter.
- All text must be responsive (mobile-first)

**DO NOT:**

- Add any authenticated features to the public page
- Create new API routes
- Modify the Stripe checkout flow
- Add sharing buttons, social links, or external integrations
- Show collaborator financial information publicly
- Break existing purchase, confirmation, or cancellation flows

---

## What Is Intentionally Deferred

These are real features but too risky for automated agents or not critical path:

| Feature                                                                | Why Deferred                                         |
| ---------------------------------------------------------------------- | ---------------------------------------------------- |
| Shared resource contribution (collaborators declaring what they bring) | Needs new DB table design, complex propagation logic |
| Venue layout / floor plan                                              | New feature, low urgency, no existing backend        |
| Activity signals on public page                                        | Needs SSE wiring to public (unauthenticated) pages   |
| Multi-channel distribution (Eventbrite, Facebook)                      | Phase 2 per spec                                     |
| Co-host circle admin bridge                                            | Phase 3 per spec                                     |

---

## Verification Checklist

After all three tasks, manually verify:

- [ ] Event detail overview tab shows collaborator panel (empty state when none)
- [ ] Can invite a collaborator from the panel
- [ ] Can remove a collaborator
- [ ] Money tab shows revenue split when collaborators exist
- [ ] Money tab hides revenue split for solo events
- [ ] Split percentages add up to 100%
- [ ] Public event page shows team section when collaborators exist
- [ ] Public event page shows menu dishes when available
- [ ] Public event page shows availability indicator
- [ ] Existing ticket purchase flow still works
- [ ] Existing confirmation and cancellation views still work
- [ ] No TypeScript errors (`npx tsc --noEmit --skipLibCheck`)
- [ ] Production build passes (`npx next build --no-lint`)
