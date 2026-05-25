# Exit System Swarm Handoff

> **Created:** 2026-05-25
> **Source session:** Practical Question Dreamer deep-mine of exit-point analysis system
> **Dispatch method:** Paste into fresh orchestrator session. Agents run in parallel waves.

---

## CONTEXT FOR ORCHESTRATOR

We have a complete exit-point analysis system: 489 exit scenarios across 7 roles, 1,354 never-leaves claims, 10 duplicate exit families, evaluation matrix, stress-test framework, and code infrastructure (registry, link generator, context helpers, icon resolver).

A deep-mine analysis answered 11 practical questions and produced clear action items. This handoff dispatches those items as parallel agent work.

### Key Findings (Agents Must Know)

1. **14 of 17 "reclassified" scenarios are already fully built.** The closure index is out of sync with reality.
2. **Communication exits = 24% of all exits (117/489).** Highest-ROI platform primitive.
3. **489 scenarios collapse to ~120 unique problems** via cross-role deduplication.
4. **30 of 1,354 never-leaves claims are conditional** (2.2%), mostly "when shared/enabled."
5. **Exit-link registry is chef-only, has no PII audit trail, no role awareness.**
6. **Only 3 features need actual build work:** day-of map visual, timezone picker UI, standalone unit converter widget.

---

## WAVE 1: Documentation Updates (3 parallel agents, Haiku)

### Agent 1A: Closure Index Reconciliation

**Task:** Update `docs/research/exit-point-closure-index.md` to mark 14 already-built scenarios as CLOSED.

**Already built (mark CLOSED with evidence path):**

| #   | Feature                  | Evidence                                                                               |
| --- | ------------------------ | -------------------------------------------------------------------------------------- |
| 1   | Recipe scaling           | `lib/scaling/recipe-scaling-engine.ts`, `components/recipes/recipe-scaler.tsx`         |
| 2   | Unit conversion (engine) | `lib/units/conversion-engine.ts`                                                       |
| 3   | Food safety reference    | `lib/constants/food-safety.ts`, `components/reference/food-safety-table.tsx`           |
| 4   | Calendar sync / iCal     | `lib/exports/ical-generator.ts`, `app/api/feeds/calendar/[token]/route.ts`             |
| 5   | Weather widget           | `lib/weather/open-meteo.ts`, `components/events/weather-widget.tsx`                    |
| 6   | Nutritional info         | `lib/nutrition/usda.ts`, `components/nutrition/nutrition-label.tsx`                    |
| 7   | Substitution engine      | `lib/ingredients/substitution-seed.ts`, `components/reference/substitution-search.tsx` |
| 8   | Margin modeler           | `lib/pricing/menu-economics.ts`, `components/finance/profit-at-a-glance.tsx`           |
| 9   | Payment status (Stripe)  | `app/api/webhooks/stripe/route.ts`, full webhook handler                               |
| 10  | Mileage tracking         | `lib/finance/mileage-actions.ts` (manual entry)                                        |
| 11  | Nearby stores            | `lib/events/nearby-stores-actions.ts`                                                  |
| 12  | Seasonal availability    | `lib/calendar/seasonal-produce.ts`, `app/(chef)/culinary/seasonal-calendar/page.tsx`   |
| 15  | Prep timeline (engine)   | `lib/prep-timeline/compute-timeline.ts`                                                |
| 16  | Waitlist                 | `lib/scheduling/waitlist-actions.ts`, `app/(chef)/waitlist/page.tsx`                   |
| 17  | Recurring events         | `lib/scheduling/recurring-actions.ts`, `app/(chef)/clients/recurring/page.tsx`         |

**Still OPEN (mark with gap description):**

| #   | Feature           | Gap                                                       |
| --- | ----------------- | --------------------------------------------------------- |
| 13  | Day-of map        | No map rendering, no Directions API, no visual route      |
| 14  | Timezone handling | No picker UI, defaults to America/New_York                |
| 2b  | Unit converter UI | Engine exists, no standalone chef-facing converter widget |

Also add a new section: "Cross-Role Deduplication Summary" noting 489 collapses to ~120 unique problems via the 10 exit families.

**Done-when:** Closure index accurately reflects codebase reality. No scenario marked CLOSED without a real file path. Run `/wire-audit` before marking done.

---

### Agent 1B: Reclassification Sprint Update

**Task:** Update `docs/specs/exit-scenario-reclassification-sprint.md` to reflect that 14 of its 17 items are already built.

For each of the 17 items listed in the sprint doc:

- If already built: change status to "BUILT" with evidence paths
- If partially built: note what exists and what's missing
- Add a new "Remaining Work" section at the bottom listing only the 3 genuine gaps

Also update `docs/specs/exit-scenario-stress-test-prompt.md` line 31-44 ("What was already reclassified") to note the build status.

**Done-when:** Both docs reflect reality. Run `/wire-audit` before marking done.

---

### Agent 1C: Never-Leaves Qualification Flags

**Task:** Add a "Conditional Claims" appendix to each never-leaves doc that has qualified claims.

Files to update with appendix:

- `docs/research/client-never-leaves-analysis.md` (6 conditional)
- `docs/research/staff-never-leaves-analysis.md` (1 conditional)
- `docs/research/vendor-never-leaves-analysis.md` (4 conditional)
- `docs/research/partner-never-leaves-analysis.md` (2 conditional)
- `docs/research/admin-never-leaves-analysis.md` (4 conditional)
- `docs/research/guest-never-leaves-analysis.md` (13 conditional)

Appendix format per doc:

```markdown
## Conditional Claims

These items are in-app but depend on data availability or chef configuration:

| #   | Claim                    | Condition                     | Impact                |
| --- | ------------------------ | ----------------------------- | --------------------- |
| 45  | Cancel event from portal | When allowed by chef settings | Low: intentional gate |
```

Do NOT modify `docs/research/chef-never-leaves-analysis.md` (zero conditionals).

**Done-when:** All 6 docs have appendix. Run `/wire-audit` before marking done.

---

## WAVE 2: Code Hardening (2 parallel agents, Sonnet)

### Agent 2A: Exit-Link Type System + Role Awareness

**Task:** Add role awareness and sensitivity flags to the exit-link type system.

**File 1: `types/exit-links.ts`**

- Add `ExitRole` type: `'chef' | 'client' | 'staff' | 'vendor' | 'partner' | 'admin' | 'guest'`
- Add `sensitive?: boolean` to `ExitLinkDefinition` (for PII-containing links)
- Add `roles?: ExitRole[]` to `ExitLinkDefinition` (defaults to all roles if omitted)

**File 2: `lib/exit-links/generate-link.ts`**

- Add `getExitLinksForRole(role: ExitRole, category: ExitCategory, context)` function
- Filters definitions by role before resolving
- Add audit logging: when a link is resolved, call a lightweight logger with `{ linkId, category, role, timestamp }` (NOT the interpolated URL)
- For `sensitive: true` links, log `{ linkId, category, role, timestamp, sensitive: true }`

**File 3: `lib/exit-links/registry.ts`**

- Add `sensitive: true` to links that contain PII:
  - Links with `sms:`, `tel:`, `mailto:` URL templates
  - Links with `{phoneNumber}`, `{email}`, `{homeAddress}`, `{venueAddress}` placeholders
  - Venmo payment links (#23 staff pay, #51 client charge)
- Add `roles: ['chef']` to all 91 existing links (current behavior preserved)
- Add `getExitDefinitionsForRole(role: ExitRole)` lookup function

**Constraints:**

- Do not break existing `getExitLink()` or `getExitLinksForCategory()` APIs
- `roles` field is optional; omitted = visible to all roles
- Audit logger should be a simple `console.info` for now (no DB table)
- Run `npx tsc --noEmit --skipLibCheck` after changes

**Done-when:** Types compile. Existing tests pass. New role-filtered lookup works. Sensitive links flagged. Run `/wire-audit` before marking done.

---

### Agent 2B: Stripe Payment Reclassification

**Task:** Reclassify Stripe payment status from "permanent boundary" to "already reduced" in the closure index.

Evidence: `app/api/webhooks/stripe/route.ts` handles `payment_intent.succeeded`, `payment_intent.payment_failed`, `checkout.session.completed/expired`, `charge.refunded`. Payment status is already mirrored in-app via webhooks and ledger (`lib/ledger/append-internal.ts`).

Update these docs:

1. `docs/research/exit-point-closure-index.md` - Move "Payments and reconciliation" from "Permanent Boundaries" to a new "Already Reduced" section. Note that Stripe dashboard is still a permanent exit for disputes/chargebacks, but status checking is fully in-app.
2. `docs/research/chef-exit-points-analysis.md` - Find scenario #38 (check if client payment cleared) and update its classification.

**Done-when:** Docs accurate. Run `/wire-audit` before marking done.

---

## WAVE 3: Priority Bucketing (1 agent, Opus)

### Agent 3A: Cross-Role Priority Triage

**Task:** Create `docs/research/exit-priority-triage.md` that buckets all 489 scenarios into P0/P1/P2/P3.

**Method:**

1. Read all 7 exit-points-analysis docs
2. For each scenario, apply this rubric:
   - **P0:** Daily pain, data loss risk, security/PII exposure, or blocks revenue
   - **P1:** Weekly pain, reduces efficiency, or causes client friction
   - **P2:** Monthly inconvenience, nice-to-have, or affects minority of users
   - **P3:** Edge case, aspirational, or affects <5% of workflows
3. Group by the 10 exit families from the closure index
4. For each family, count scenarios per priority level
5. Note which scenarios are already CLOSED (from Wave 1 reconciliation)

**Output format:**

```markdown
# Exit Priority Triage

## Summary

| Priority | Count | Already Closed | Net Remaining |
| -------- | ----- | -------------- | ------------- |

## By Exit Family

### 1. Native Communication (117 scenarios)

| Priority | Count | Key scenarios |
| -------- | ----- | ------------- |

### 2. Maps, Travel, Arrival (~40 scenarios)

...
```

**Constraints:**

- Do not create queue items or specs. This is classification only.
- Cross-reference against Wave 1's CLOSED list
- Flag any scenario that appears in multiple families

**Done-when:** Every scenario has a priority. Totals add up to 489. Run `/wire-audit` before marking done.

---

## WAVE 4: Communication Primitive Spec (1 agent, Opus)

### Agent 4A: Contextual Contact Primitive Spec

**Task:** Write `docs/specs/contextual-contact-primitive.md` specifying the platform-level communication bridge.

**Context from analysis:**

- 117 communication exits across all 7 roles (24% of total)
- Client worst (24 exits, 26% of role), Vendor second (20 exits, 36% of role)
- SMS/text, phone, email, WhatsApp cover ~95% of channels
- Most classified as Reducible or Bridgeable

**Spec must cover:**

1. **Scope:** Event-scoped contextual contact, not a full messaging platform
2. **Core primitive:** When a user needs to contact someone, ChefFlow pre-fills context (event name, date, items, etc.) and offers channel choice (SMS, email, WhatsApp, call)
3. **Capture:** After contact, prompt for outcome capture (call note, decision, follow-up)
4. **Timeline:** Contact events appear on event timeline with captured context
5. **Role matrix:** Which roles can contact which, with what context pre-filled
6. **Phase 1:** Chef-to-client contact (highest frequency)
7. **Phase 2:** Chef-to-vendor contact (highest percentage)
8. **Phase 3:** Staff, partner, guest contact
9. **Privacy:** No message content stored without consent. Only metadata (who, when, channel, outcome note)
10. **Architecture:** Extend exit-link registry or separate system? Recommend based on fit.

**Read first:**

- `docs/research/exit-point-closure-index.md` (duplicate family: "Native communication")
- `docs/specs/exit-stay-evaluation-matrix.md` (treatments: bridge it, source it)
- `lib/exit-links/registry.ts` (links #30-38: channel lock-in)
- `docs/specs/universal-interface-philosophy.md` (UI principles)

**Constraints:**

- Do not build code. Spec only.
- Follow the evaluation matrix template for each phase
- Include "what disappears" for each phase (the texts, lost decisions, duplicate questions)

**Done-when:** Spec is complete, covers all 7 roles, phases are sequenced by ROI. Run `/wire-audit` before marking done.

---

## DISPATCH ORDER

```
Wave 1: 1A + 1B + 1C (parallel, Haiku, ~10 min)
Wave 2: 2A + 2B (parallel, Sonnet, ~15 min, depends on Wave 1 for accurate closure data)
Wave 3: 3A (Opus, ~20 min, depends on Wave 1 for CLOSED list)
Wave 4: 4A (Opus, ~20 min, independent of Wave 3)
```

Waves 3 and 4 can run in parallel. Total estimated time: ~45 min with parallelism.

## POST-SWARM VERIFICATION

After all agents complete:

1. Run `npx tsc --noEmit --skipLibCheck`
2. Run `npm run regression:firewall`
3. Run `/wire-audit`
4. Verify closure index totals: 14 CLOSED + 3 OPEN + remaining = original count
5. Verify type changes compile and existing exit-link consumers still work
6. Commit all changes with `feat(exit-system): reconcile exit analysis with codebase reality`
