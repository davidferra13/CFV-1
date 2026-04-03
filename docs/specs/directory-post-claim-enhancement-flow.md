# Spec: Directory Post-Claim Enhancement Flow

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** directory-operator-outreach.md (verified), discover-state-normalization-hardening.md (verified)
> **Estimated complexity:** medium (4 files modified, 1 migration)
> **Created:** 2026-04-02
> **Built by:** Codex (2026-04-02)
>
> **Build notes:** This spec is deliberately narrow. It upgrades the existing `/discover/[slug]/enhance` flow so claimed operators can quickly review and correct the fields that actually matter. It does not add external listing sync, manager delegation, or a full media library.

---

## What This Does (Plain English)

Turns the existing claimed-listing enhancement page into a real claim-and-correct workflow. After an operator claims a listing, the page should help them quickly confirm hours, fix the website/menu/order/reservation links, review phone and address, and add a primary photo. The goal is not to make them build a profile from nothing. The goal is to let them correct the public listing fast, with the highest-value fields first.

---

## Why It Matters

The current outreach direction only works if the follow-up experience feels worth the click. Right now the claim flow exists, but the enhancement surface is thinner than the operator workflow it promises. Research on April 2, 2026 showed that operators care most about operational accuracy and direct action links. That is where this page needs to improve.

---

## Current State

The enhancement route already exists:

- `app/(public)/discover/[slug]/enhance/page.tsx`
- `app/(public)/discover/[slug]/enhance/_components/enhance-profile-form.tsx`
- `lib/discover/actions.ts`

Current behavior:

- page summary shows the current business, type, location, and website if present
- form only edits `description`, `address`, `phone`, `menuUrl`, and `hours`
- `website_url` is shown in the summary but is not editable in the form
- existing `hours` are not prefilled into the form
- there is no way to add `order` or `reservation` action links
- there is no photo-management step even though the page copy promises photos

This creates a mismatch between:

- what the operator is told they can improve
- what the page actually lets them fix

---

## Files to Create

| File                                                              | Purpose                                                                         |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `database/migrations/[next-timestamp]_directory_action_links.sql` | Add dedicated `order_url` and `reservation_url` columns to `directory_listings` |

---

## Files to Modify

| File                                                                        | What to Change                                                                                                                                           |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(public)/discover/[slug]/enhance/page.tsx`                             | Pass through current website, hours, photo URLs, and new action-link fields. Update copy so the flow clearly reads as review and correction.             |
| `app/(public)/discover/[slug]/enhance/_components/enhance-profile-form.tsx` | Reorder the form around high-value fields, prefill current values, support current-hours editing, and add action-link plus photo-url inputs.             |
| `app/(public)/discover/[slug]/page.tsx`                                     | Surface `order_url` and `reservation_url` as direct public action buttons when present.                                                                  |
| `lib/discover/actions.ts`                                                   | Extend `enhanceDirectoryListing()` to accept and validate the new fields, preserve claimed/verified gate, and revalidate both detail and enhance routes. |

---

## Database Changes

### New Columns on Existing Tables

```sql
ALTER TABLE directory_listings
  ADD COLUMN IF NOT EXISTS order_url text,
  ADD COLUMN IF NOT EXISTS reservation_url text;
```

### Migration Notes

- The filename shown above is a placeholder. The builder must check the current highest migration before choosing the real timestamp.
- Migration filename must be checked against the current highest migration before writing.
- This is additive only.
- No existing data is removed or transformed.

---

## Data Model

This spec keeps the directory listing model mostly intact.

Existing fields reused:

- `website_url`
- `menu_url`
- `address`
- `phone`
- `description`
- `hours`
- `photo_urls`

New fields:

- `order_url`
- `reservation_url`

### Field Priorities

The enhancement flow should prioritize fields in this order:

1. `hours`
2. `website_url`
3. `menu_url`
4. `order_url`
5. `reservation_url`
6. `phone`
7. `address`
8. `photo_urls`
9. `description`

### Photo Model Constraint

Do not invent a full upload pipeline in this pass.

Use the existing `photo_urls` array and support a small number of operator-managed photo URLs with preview and ordering. A true upload system can be a separate spec later.

---

## Server Actions

| Action                           | Auth                | Input                                                                                                                  | Output                                 | Side Effects                                                                                              |
| -------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `enhanceDirectoryListing(input)` | public claimed flow | `{ listingId, hours?, websiteUrl?, menuUrl?, orderUrl?, reservationUrl?, phone?, address?, photoUrls?, description? }` | `{ success: boolean, error?: string }` | Updates `directory_listings`, revalidates `/discover`, `/discover/[slug]`, and `/discover/[slug]/enhance` |

### Validation Rules

- listing must exist
- listing status must be `claimed` or `verified`
- URL fields must be normalized or rejected cleanly
- empty strings should clear fields to `NULL`
- `photo_urls` should be capped to a small sane max, such as `6`

### Hours Handling

The enhancement action must support both hour shapes already implied by the detail page:

- structured day-by-day object
- raw text payload when a structured conversion is not practical

That avoids destroying imported hours just because the input format differs.

---

## UI / Component Spec

### Page Layout

Keep the current page route and general shell. Do not redesign the route.

The enhancement page should feel like this:

1. short explanation: "Review and improve what guests see"
2. current business summary
3. completion checklist or grouped sections
4. form sections in priority order
5. save action

### Section Order

#### Section 1: Hours and Availability

- editable hours first
- if current hours are structured, prefill day-by-day controls
- if current hours are raw or unstructured, show a raw hours textarea instead of forcing a lossy format

#### Section 2: Where Guests Go Next

- website URL
- menu URL
- order URL
- reservation URL

This is the highest-value action block after hours.

#### Section 3: Contact and Location

- phone
- address

#### Section 4: Visuals

- primary photo URL
- optional additional photo URLs
- preview existing and newly entered URLs
- allow removal and reordering within the supported small cap

#### Section 5: Description

- short business description last

The description matters, but it should not block the operator from fixing the fields that drive action.

### States

- **Loading:** existing server-rendered shell, then populated form
- **Empty:** if there is no current data, show blank inputs with short guidance
- **Error:** inline validation plus toast, never fake success
- **Populated:** current values always visible and editable

### Interactions

- save should remain explicit, not autosave
- preserve current success toast plus redirect to the public listing
- if save fails, keep entered values in place and show error
- if a URL is invalid, show inline guidance instead of silently stripping it

---

## Public Listing Detail Changes

The listing detail page already renders:

- website CTA
- menu CTA
- photos
- hours

This spec adds two more optional public actions when present:

- `Order online`
- `Reserve`

Rules:

- only show buttons when the corresponding URL exists
- do not render fake placeholders
- preserve current website and menu CTA behavior
- if multiple action URLs exist, keep the CTA group compact and ordered

Recommended CTA order:

1. `Order online`
2. `Reserve`
3. `Visit website`
4. `View menu`

That ordering reflects operator conversion priorities better than passive browsing links.

---

## Edge Cases and Error Handling

| Scenario                                            | Correct Behavior                                                                 |
| --------------------------------------------------- | -------------------------------------------------------------------------------- |
| Current listing has `website_url` but no edit field | Fix in this spec by making `website_url` editable                                |
| Current listing has existing hours                  | Prefill them instead of starting from all-blank day inputs                       |
| Current hours are raw text, not day-by-day          | Preserve via raw-text editing mode rather than forcing destructive restructuring |
| Operator clears a URL field intentionally           | Save `NULL`, remove the public CTA                                               |
| Operator enters more than the max photo URLs        | Reject extras cleanly and explain the cap                                        |
| Claimed listing has no photos                       | Show empty visual state with guidance                                            |
| Save fails                                          | Keep form state, show honest error, do not redirect                              |
| Listing becomes removed or inaccessible mid-flow    | Fail honestly and route back to the listing or a not-found state                 |

---

## Verification Steps

1. Claim a discovered listing and land on `/discover/[slug]/enhance`.
2. Verify current website, menu URL, phone, address, and hours are prefilled when present.
3. Verify structured imported hours show day-by-day fields.
4. Verify raw imported hours show a raw-text editing path.
5. Add `order_url` and `reservation_url`, save, and verify the public listing shows `Order online` and `Reserve`.
6. Update `website_url`, save, and verify the public `Visit website` CTA uses the new value.
7. Add one or more `photo_urls`, save, and verify the public gallery renders them.
8. Clear a URL field, save, and verify the matching CTA disappears from the public page.
9. Attempt an invalid URL, verify honest validation and no fake success.
10. Refresh after save and confirm persistence.

---

## Out of Scope

- Google / Apple / Yelp sync
- manager or agency delegation
- dispute-resolution workflow for ownership
- file uploads or media storage pipeline
- seasonal promotions model
- special-hours calendar UI
- review management or ratings sync

---

## Notes for Builder Agent

1. This is not a redesign spec. Reuse the existing enhancement route and shell.
2. The current form already writes to a real action. Extend it instead of replacing it.
3. Do not overbuild hours. Support both structured and raw modes because the detail page already implies both shapes.
4. Keep the form ordered around operator value, not schema order.
5. Use the existing `photo_urls` array for this pass. Do not create an asset subsystem.
6. Do not promise cross-platform updates anywhere in the UI. This page improves ChefFlow's public listing only.
7. Revalidate the public detail route after save so the operator sees the result immediately.
