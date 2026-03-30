# Spec: Email Snapshot Footer & Portal Transition Strategy

> **Status:** ready
> **Priority:** P1
> **Depends on:** critical-path-and-dinner-circle-onboarding (verified)
> **Estimated complexity:** medium (4-6 files)
> **Created:** 2026-03-30

---

## What This Does (Plain English)

Two things:

1. **Email Snapshot Footer ("At a Glance"):** Every outgoing email to a client auto-appends a structured summary of everything known about their dinner. Not just the 10 critical path items (binary go/no-go), but the rich context: dishes discussed, occasion name, cuisine type, host name, guest count, dietary details. This summary updates with every email, so both parties always know exactly where things stand. The chef can edit or remove it before sending.

2. **Version A/B Email Strategy:** Every first response has two modes:
   - **Version A (email only):** Full email with snapshot footer. For clients who prefer email.
   - **Version B (portal transition):** Same email, but the snapshot footer includes a Dinner Circle link and the menu/proposal details are teased (not fully included) to drive portal visits. The email says "I put together some menu ideas based on what you listed" with a link. The full menu lives on the Dinner Circle page.

---

## Why It Matters

From the Gunjan Gupta exercise (2026-03-30), we learned:

1. Clients give us 70%+ of what we need in the first email (name, guest count, dietary, cuisine, dishes, location, occasion). The system should capture and reflect this immediately.
2. Repeating back what we know builds trust and eliminates "did I already tell you" friction.
3. Email chains for private dinners regularly exceed 20 messages. The snapshot footer keeps everyone aligned without re-reading the whole chain.
4. Research (`docs/research/email-to-portal-transition-tactics.md`) shows portal adoption jumps from ~43% to ~90% when the link delivers something the client already wants (their menu, their proposal) rather than a generic "visit your portal."

---

## What Already Exists (DO NOT Rebuild)

| Capability                         | File                                                  | Status     |
| ---------------------------------- | ----------------------------------------------------- | ---------- |
| Critical path tracker (10 items)   | `lib/lifecycle/critical-path.ts`                      | Production |
| Dinner Circle invitation templates | `lib/lifecycle/dinner-circle-templates.ts`            | Production |
| Reply composer with circle toggle  | `components/inquiries/inquiry-response-composer.tsx`  | Production |
| Guest-facing status view           | `components/hub/circle-client-status.tsx`             | Production |
| Chef-facing critical path card     | `components/lifecycle/critical-path-card.tsx`         | Production |
| Email-to-portal research           | `docs/research/email-to-portal-transition-tactics.md` | Complete   |

---

## Part 1: Email Snapshot Footer

### What It Contains

The snapshot is richer than the critical path. It includes free-text context that the critical path doesn't track:

```
- - -

{Event Title} (e.g., "Gunjan & Husband's 15th Anniversary Dinner")

- Host: {contact_name}
- Guests: {confirmed_guest_count}
- Occasion: {occasion text}
- Date: {confirmed_date or month text} (exact date TBD if partial)
- Location: {confirmed_location}
- Dietary: {confirmed_dietary_restrictions}
- Cuisine: {cuisine type if known}
- Dishes discussed:
  - {dish 1}
  - {dish 2}
  - ...
- Course selection: {selected tier or TBD}
- Service time: {time or TBD}
- Menu confirmed: {status text}
```

### Data Sources

| Field            | Source                                                           | Notes                                         |
| ---------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| Event title      | Computed from `contact_name` + `confirmed_occasion`              | "Gunjan & Husband's 15th Anniversary Dinner"  |
| Host             | `inquiries.contact_name`                                         |                                               |
| Guests           | `inquiries.confirmed_guest_count`                                |                                               |
| Occasion         | `inquiries.confirmed_occasion`                                   | Already exists in schema                      |
| Date             | `inquiries.confirmed_date`                                       | Show month if partial, full date if confirmed |
| Location         | `inquiries.confirmed_location`                                   | City-level or full address                    |
| Dietary          | `inquiries.confirmed_dietary_restrictions`                       | Array joined                                  |
| Cuisine          | Needs new field OR extracted from notes                          | See "New Fields" section                      |
| Dishes discussed | Needs new field: `inquiries.discussed_dishes`                    | JSONB array of strings                        |
| Course selection | Needs new field: `inquiries.selected_tier`                       | e.g., "3-course", "4-course", "tasting"       |
| Service time     | `inquiries.confirmed_date` time component or `events.start_time` |                                               |
| Menu confirmed   | Event menu status                                                | Same as critical path item 8                  |

### New Fields Required

Two new nullable columns on `inquiries`:

1. **`discussed_dishes`** - `JSONB` (array of strings). Populated manually by chef or auto-extracted from conversation text by lifecycle intelligence layer (future). Example: `["Malai Soya Chaap", "Paneer Tikka", "Gulab Jamun"]`

2. **`selected_tier`** - `TEXT`. The pricing tier the client chose or is considering. Values: `"3-course"`, `"4-course"`, `"5-course"`, `"tasting"`, `"custom"`, or null if not yet discussed.

These are additive, nullable columns. No data loss risk. Migration adds them with `ALTER TABLE inquiries ADD COLUMN`.

### Template Function

New export in `lib/lifecycle/email-snapshot.ts`:

```typescript
export async function getEmailSnapshot(inquiryId: string): Promise<{
  title: string
  lines: SnapshotLine[]
  formatted: string // Ready to paste into email body
}>
```

- `SnapshotLine` has `label`, `value`, `status` ('confirmed' | 'partial' | 'tbd')
- `formatted` returns plain text with the separator, title, and bullet list
- Uses DB column names (`contact_name`, not `client_name`)
- Auth: `requireChef()` with tenant scoping

### Snapshot Rendering Rules

- Items with confirmed values show the value
- Items with partial data show what we know + "(exact TBD)"
- Items with no data show "TBD" (not "missing" or "waiting" which can feel passive-aggressive)
- "Dishes discussed" only appears if `discussed_dishes` has entries
- "Course selection" only appears if `selected_tier` is not null
- The snapshot title is computed: `{contact_name}'s {occasion} Dinner` or `{contact_name}'s Dinner` if no occasion

---

## Part 2: Version A/B Strategy

### Version A (Email Only)

Full email body + snapshot footer. The snapshot contains all details inline. This is the default for:

- Clients who haven't been sent a Dinner Circle link
- Follow-up emails where the client is responding via email
- Clients who explicitly prefer email

### Version B (Portal Transition)

Same email body, but:

1. The snapshot footer includes a "View full details" link to the Dinner Circle
2. Menu details and dish discussions are teased, not fully listed. Instead: "I put together some menu ideas based on your favorites. Take a look: {circle_url}"
3. The snapshot still shows confirmed items (so the email is useful standalone) but the link is prominently placed

### How This Works in the Reply Composer

The existing `InquiryResponseComposer` at [inquiry-response-composer.tsx](components/inquiries/inquiry-response-composer.tsx) gets:

1. **New prop:** `snapshotData` from `getEmailSnapshot(inquiryId)`
2. **New toggle:** "Include dinner summary" (default: on)
3. **Existing toggle:** "Include Dinner Circle link" determines A vs B mode
4. After the chef's sign-off (detected by `-Chef Ferragamo` or similar), the snapshot is auto-appended
5. If both toggles are on (Version B), the snapshot includes the circle URL and teases the menu
6. If only the summary toggle is on (Version A), the full snapshot is inlined without portal links
7. Chef can always edit or remove the snapshot before sending

### The "First Email" Portal Hook

Research shows the #1 tactic: never send a "visit your portal" email. Send a "your custom menu is ready" email where the menu lives on the portal.

For Version B first emails:

- The email body says something like "I put together some menu ideas based on the dishes you listed. Take a look: {circle_url}"
- The Dinner Circle page must be pre-loaded BEFORE the link is sent (critical path status, discussed dishes, any draft menu)
- The email does NOT contain the full menu. It teases: names a few dishes, mentions the course options, but the full proposal/menu is on the circle page

This means `createInquiryCircle()` (already auto-fires on inquiry creation) should pre-populate the circle with available data. The circle page already shows the critical path via `CircleClientStatus`. The missing piece is showing discussed dishes and menu drafts on the circle page.

---

## Files to Create

| File                                                       | Purpose                                                                                                                            |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `lib/lifecycle/email-snapshot.ts`                          | `getEmailSnapshot()` function. Computes rich snapshot from inquiry + event data. Returns structured data and formatted plain text. |
| `database/migrations/XXXXXXXX_inquiry_dishes_and_tier.sql` | Adds `discussed_dishes` (JSONB) and `selected_tier` (TEXT) to `inquiries` table                                                    |

## Files to Modify

| File                                                 | What to Change                                                                                       |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `components/inquiries/inquiry-response-composer.tsx` | Add `snapshotData` prop, "Include dinner summary" toggle, auto-append logic after sign-off detection |
| `app/(chef)/inquiries/[id]/page.tsx`                 | Fetch `getEmailSnapshot()` and pass to composer                                                      |
| `components/hub/circle-client-status.tsx`            | Show discussed dishes if available (from inquiry data passed through)                                |
| `lib/lifecycle/critical-path.ts`                     | Add `discussed_dishes` and `selected_tier` to guest result if present (informational, not blocking)  |

## Database Changes

One migration, additive only:

```sql
ALTER TABLE inquiries ADD COLUMN discussed_dishes JSONB DEFAULT NULL;
ALTER TABLE inquiries ADD COLUMN selected_tier TEXT DEFAULT NULL;

COMMENT ON COLUMN inquiries.discussed_dishes IS 'Array of dish names discussed with client, e.g. ["Paneer Tikka", "Gulab Jamun"]';
COMMENT ON COLUMN inquiries.selected_tier IS 'Pricing tier selected or under consideration: 3-course, 4-course, 5-course, tasting, custom';
```

---

## Server Actions

| Action                        | Auth            | Input      | Output                        | Side Effects     |
| ----------------------------- | --------------- | ---------- | ----------------------------- | ---------------- |
| `getEmailSnapshot(inquiryId)` | `requireChef()` | inquiry ID | `{ title, lines, formatted }` | None (read-only) |

No new mutation actions. Updating `discussed_dishes` and `selected_tier` uses the existing `updateInquiry()` action.

---

## Edge Cases

| Scenario                                  | Behavior                                                               |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| No data at all (brand new inquiry)        | Snapshot shows title + "Details coming soon"                           |
| Occasion is null                          | Title is "{name}'s Dinner" not "{name}'s null Dinner"                  |
| `discussed_dishes` is empty array vs null | Empty array = "No dishes discussed yet." Null = field omitted entirely |
| Chef removes snapshot from email          | Respected. Toggle remembers preference per email                       |
| Client hasn't been sent circle link yet   | Version A automatically (no circle link in snapshot)                   |
| Inquiry converts to event                 | Snapshot seamlessly pulls from both inquiry and event tables           |

---

## Verification Steps

1. Create inquiry with partial data (name, email, dietary)
2. Open reply composer
3. Generate draft
4. Verify: snapshot auto-appended after sign-off
5. Verify: "Include dinner summary" toggle works
6. Verify: Version A mode (no circle link) shows full inline snapshot
7. Verify: Version B mode (with circle link) teases menu and includes link
8. Update inquiry with dishes and tier
9. Regenerate draft
10. Verify: dishes and tier now appear in snapshot
11. Open Dinner Circle as guest
12. Verify: discussed dishes visible on circle page
13. Screenshot both versions side by side

---

## Out of Scope

- Auto-extraction of dishes from email text (that's lifecycle intelligence layer)
- Visual email preview thumbnails/cards (future design work)
- Menu proposal builder (separate feature)
- Bidirectional email-circle sync
- Per-operator configurable travel fee toggle (separate spec)
- Pricing template system (operator configures their course tiers/prices)

---

## Notes for Builder

- The snapshot is **appended after the chef's sign-off**, not before. Detect sign-off by looking for lines starting with `-Chef` or `-David` or a configurable pattern.
- The snapshot separator is `- - -` (three hyphens with spaces), not `---` (which renders as an HR in markdown/rich email).
- "Waiting for selections" was rejected as phrasing. Use "TBD" for missing items. Keep it neutral.
- The title format is `{Name}'s {Occasion} Dinner` or `{Name} & {Partner}'s {Occasion} Dinner` if partner name is known (future field).
- Dishes should be listed as sub-bullets under "Dishes discussed:" exactly as the client named them. Don't reformat, categorize, or translate dish names.
- The snapshot must work in plain text email (no HTML required). Gmail handles line breaks and bullets via plain text formatting.
- Travel fee is NOT included in the snapshot. It will be a separate toggled system option (separate spec).
