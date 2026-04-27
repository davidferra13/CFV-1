# Build: Client Relationship Closure Communications

**Goal:** Wire closure-aware transition, goodbye, and do-not-contact communication without automating outreach behind the chef's back.
**Label:** CLAUDE
**Estimated scope:** M (3-8 files)
**Depends on:** `docs/specs/build-client-relationship-closure-server-actions.md`

## Context Files (read first)

- `docs/research/client-relationship-closure-market-research.md`
- `lib/email/send-chef-transition.ts`
- `lib/email/templates/chef-transition.tsx`
- `lib/network/collab-actions.ts`
- `lib/events/transitions.ts`
- `lib/hub/message-actions.ts`
- `lib/clients/communication-actions.ts`
- `docs/AI_POLICY.md`

## Files to Modify/Create

- `lib/email/templates/client-relationship-closure.tsx`: closure and transition email template.
- `lib/email/send-client-relationship-closure.ts`: explicit send action or send helper.
- `lib/clients/relationship-closure-actions.ts`: add optional non-blocking email send only when explicitly requested by chef input.
- `components/clients/relationship-closure-panel.tsx`: add send-message options if UI spec has landed.
- `tests/unit/client-relationship-closure-email.test.ts`: template and guard tests.

## Steps

1. Create an email template for three modes:
   - moving or transition handoff
   - relationship closed with no future booking
   - active event cancellation or review needed
2. Reuse the existing tone guard idea from `sendChefTransitionEmail()`, but do not block factual neutral language such as "moving" or "closing the relationship."
3. Do not send automatically when a relationship is closed. The chef must explicitly choose to send.
4. If sending is selected, wrap the send in try/catch as a non-blocking side effect. Closure must remain successful even if email fails.
5. If a network handoff is linked, include only the approved new chef name and client-facing transition note. Do not leak private notes.
6. For hostile or safety closure modes, default to no client-facing email and show a warning that manual legal or safety handling may be needed.
7. Add tests that verify no email is sent unless the input explicitly requests it.

## Constraints

- AI must not generate recipes, menus, or culinary suggestions.
- Do not auto-send client outreach.
- Do not leak internal closure notes to client-facing email.
- Do not use em dashes.
- Email sender naming must remain consistent with project rules.

## Verification

- [ ] `node --test --import tsx tests/unit/client-relationship-closure-email.test.ts` passes
- [ ] `npx tsc --noEmit --skipLibCheck` passes
- [ ] `npx next build --no-lint` passes if explicitly allowed by the developer
- [ ] Manual code check confirms hostile modes default to no outgoing email

## Rollback

If verification fails and you cannot fix within 2 attempts: `git stash`, report what failed.
