# Build: Client-Facing Group Split Page

**Goal:** Shareable page showing event total, per-person split, and optionally who has paid, so group coordinators can collect from attendees.
**Label:** CLAUDE
**Estimated scope:** M (4-6 files)
**Depends on:** build-fix-tsc-errors

## Context Files (read first)

- `app/(chef)/payments/splitting/page.tsx` (chef-side split billing view)
- `lib/payments/payment-splitting.ts` (split_billing JSON column queries)
- `lib/sharing/actions.ts` (event share token generation pattern)
- `app/(public)/proposal/[token]/page.tsx` (public token-gated page pattern)
- `app/(client)/my-events/[id]/proposal/page.tsx` (client pricing display, lines 222-280)
- `lib/db/schema/schema.ts` (events table, split_billing column)

## Design

**Two access modes:**

1. **Client-authenticated:** `/my-events/[id]/split` - Megan sees the split page for her event
2. **Shareable token:** `/split/[token]` - Megan texts this link to the group; anyone can see the breakdown (no auth)

**What the page shows:**

- Event name, date, location
- Total cost
- Number of people splitting
- Per-person amount (total / N, rounded up to nearest cent)
- Optional: list of names with paid/unpaid status (if chef has entered this)
- "Copy amount" button for easy texting
- Chef contact info for questions

**Token reuse:** Add a `split_share_token` column to `events` table (nullable, unique, generated on demand). Simpler than a separate table for a single-purpose token.

## Files to Modify/Create

1. **New migration** `database/migrations/XXXXXX_split_share_token.sql`
   - Add `split_share_token` text UNIQUE nullable to `events`
   - Default null; generated when chef or client first requests the share link

2. **New actions** `lib/payments/split-share-actions.ts`
   - `generateSplitShareToken(eventId)` - chef-authenticated, generates and stores token
   - `getSplitByToken(token)` - public, rate-limited, returns event name, date, total, guest count, per-person amount
   - `getClientSplitView(eventId)` - client-authenticated, returns same data

3. **New page** `app/(public)/split/[token]/page.tsx`
   - Public, no auth, rate-limited
   - Shows split breakdown, copy button, chef contact

4. **New page** `app/(client)/my-events/[id]/split/page.tsx`
   - Client-authenticated
   - Same display plus "Share with group" button that generates/shows the public token link

5. **Modify** `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx`
   - Add "Share group split" button that generates token and shows copyable link
   - Or add to an existing payments section on the event detail

## Steps

1. Read all context files
2. Create migration (check max timestamp, go one higher)
3. Create split share actions
4. Create public split page
5. Create client split page
6. Add "Share split" button to chef event detail
7. Run `npx tsc --noEmit --skipLibCheck`
8. Test both access modes

## Constraints

- Public page must NOT expose client names, emails, or any PII beyond first names (if entered by chef)
- Public page must NOT expose the chef's financial details (margin, costs); only the client-facing total
- The total shown must match the proposal/invoice total (derive from same source: `event_financial_summary` view)
- Do NOT modify the chef-side split billing page at `app/(chef)/payments/splitting/page.tsx`
- No em dashes
- Rate limit public page by IP

## Verification

- [ ] `npx tsc --noEmit --skipLibCheck` passes
- [ ] `npx next build --no-lint` passes
- [ ] Manual: client can view split page for their event
- [ ] Manual: share link works in incognito (no auth)
- [ ] Manual: per-person amount = total / guest count

## Rollback

If verification fails and you cannot fix within 2 attempts: `git stash`, report what failed.
