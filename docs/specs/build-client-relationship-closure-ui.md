# Build: Client Relationship Closure UI

**Goal:** Add a chef-side closure panel on client detail that makes closure deliberate, reversible, and honest about active events, portal access, and money.
**Label:** CODEX
**Estimated scope:** M (3-8 files)
**Depends on:** `docs/specs/build-client-relationship-closure-server-actions.md`

## Context Files (read first)

- `docs/research/client-relationship-closure-market-research.md`
- `app/(chef)/clients/[id]/page.tsx`
- `components/clients/client-status-badge.tsx`
- `components/clients/portal-link-manager.tsx`
- `components/clients/client-financial-panel.tsx`
- `components/ui/button.tsx`
- `components/ui/badge.tsx`
- `docs/specs/universal-interface-philosophy.md`

## Files to Modify/Create

- `components/clients/relationship-closure-panel.tsx`: new client component for closure readiness, close, reopen, and portal policy.
- `app/(chef)/clients/[id]/page.tsx`: render the panel near the portal link and status header.
- `app/(chef)/clients/clients-table.tsx`: show closure badge and disable "Create event" when closure blocks new events.
- `components/clients/client-status-badge.tsx`: optionally show helper text that dormant is not closure, without adding invalid button variants.

## Steps

1. Create `RelationshipClosurePanel` with props from the new server action summary:
   - active closure mode and reason
   - active event count
   - outstanding balance
   - active portal link state
   - active handoff count
   - per-section errors
2. The panel must show a compact closed-state banner when an active closure exists, with mode, reason, created date, and reopen action.
3. When no closure exists, show a "Close relationship" control that opens a confirmation modal with:
   - closure mode select
   - reason category select
   - active-event policy select
   - checkboxes for block new events, block public booking, block automated outreach, revoke portal access
   - internal notes textarea
   - optional client-facing message textarea
4. The confirmation modal must display real readiness warnings from server data. If a section failed to load, show an error row, not a zero.
5. Use only valid button variants: `primary`, `secondary`, `danger`, `ghost`.
6. Add try/catch with rollback or reload behavior on every optimistic UI update.
7. Update the client table action row so "Create event" is disabled or hidden for clients whose closure blocks new events. Do not render a functional-looking button that will fail later.
8. Avoid nested cards. Use a single panel or full-width band consistent with the existing client detail layout.

## Constraints

- Do not edit server action behavior in this spec unless a type mismatch requires a minimal adjustment.
- Do not add any public-facing text containing the internal infrastructure name banned by project rules.
- Do not use `outline`, `default`, `warning`, or `success` as Button variants.
- Do not use em dashes.
- Do not generate or suggest recipes.

## Verification

- [ ] `npx tsc --noEmit --skipLibCheck` passes
- [ ] `npx next build --no-lint` passes if explicitly allowed by the developer
- [ ] Visit `/clients/[id]` with an open client and confirm the close relationship flow renders
- [ ] Visit `/clients/[id]` with an active closure and confirm the closed banner renders
- [ ] Confirm clients with closure blockers do not show a functional "Create event" action in `/clients`

## Rollback

If verification fails and you cannot fix within 2 attempts: `git stash`, report what failed.
