# Codex Zero-Out: Handoff Prompt for New Agent

> Generated: 2026-05-23 from crashed session analysis.
> 562 dirty files (387 untracked, 175 modified). Nothing committed.

---

## SITUATION

The previous session was dispatched to execute a "Complete Codex Zero-Out" initiative: 110 build prompts organized in 10 waves, covering the entire remaining backlog. The session crashed before any prompts were dispatched to Codex or agents. However, **significant prior work already exists on disk from earlier sessions** (swarm runs from May 17-22). The manifest at `docs/CODEX-ZERO-OUT-MANIFEST.md` was created but all items are marked QUEUED (none were updated to reflect existing work).

## CRITICAL: BUILD IS BROKEN

`tsc --noEmit --skipLibCheck` fails with errors in `lib/scheduling/types.ts`:

- `commitment_cockpit` widget key is missing from the `WidgetMeta` record (line ~177) and description record (line ~536)
- **Fix this FIRST before any new work.** Add the `commitment_cockpit` entry to both records in `lib/scheduling/types.ts`.

## CRITICAL: PATH SPLIT

Commitment code lives in TWO directories:

- `lib/commitment/` (singular) - main engine, domains, compound detectors (from May 17 Wave 1 build)
- `lib/commitments/` (plural) - some newer actions (cooling-off, portfolio, witness, say-no, delegation-types, remy-monthly-types)

The prompts reference `lib/commitments/` (plural). Reconcile before building more. The engine, types, friction, and domains are in `lib/commitment/` (singular). New builds should go where the engine lives.

---

## WHAT'S ALREADY BUILT (DO NOT REBUILD)

### Wave 0: UNBLOCK + VERIFY - ALL 4 BUILT

| #   | Item                         | Evidence                                                                                            |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | Portal Rail Foundation Tests | `tests/e2e/nav-02-rail-foundation.spec.ts` exists                                                   |
| 2   | Handoff Bar Mounts           | `components/rail/handoff-bar.tsx` + `lib/rail/handoff-resolver.ts` exist                            |
| 3   | Client Intelligence Ledger   | `lib/clients/intelligence-actions.ts`, types, migrations `20260522100000`, `20260522110000`         |
| 4   | Legal Readiness Center       | `lib/compliance/compliance-concierge-actions.ts`, `compliance-types.ts`, migration `20260522120000` |

### Wave 1: SPEC-READY - ALL 10 BUILT

| #   | Item                  | Evidence                                                                                                           |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 5   | Admin Rail Prominence | `components/rail/admin-rail-strip.tsx` + `lib/discovery/resolvers/admin-resolver.ts`                               |
| 6   | Chef/Client Rail      | `components/rail/client-rail-strip.tsx` + `lib/discovery/resolvers/client-resolver.ts`                             |
| 7   | Staff Rail            | `components/rail/staff-rail-strip.tsx` + `lib/discovery/resolvers/staff-resolver.ts` + `lib/rail/sources/staff.ts` |
| 8   | Partner Rail          | `components/rail/partner-rail-strip.tsx` + `lib/discovery/resolvers/partner-resolver.ts`                           |
| 9   | QA Validation         | `lib/qa/validation-actions.ts` + `lib/qa/validation-types.ts`                                                      |
| 10  | Flow Interrogation    | `lib/qa/flow-interrogation-actions.ts` + `lib/qa/flow-types.ts`                                                    |
| 11  | Domain Inventory      | `lib/qa/domain-inventory-actions.ts` + `lib/qa/domain-inventory-types.ts`                                          |
| 12  | Wiring Mise           | `lib/qa/wiring-mise-actions.ts` + `lib/qa/wiring-types.ts`                                                         |
| 13  | Archive Digester      | `lib/openclaw/archive-digester-actions.ts` + types + migration `20260522130000`                                    |
| 14  | Scraper Enrichment    | `lib/openclaw/enrichment-actions.ts` + `lib/openclaw/enrichment-types.ts`                                          |

### Wave 2: COMMUNICATION + REMY - 5/6 BUILT

| #   | Item                         | Status              | Evidence                                                                                                                                                                  |
| --- | ---------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15  | Remy Routine Authoring UI    | BUILT (no page.tsx) | `components/remy/remy-routine-control-panel.tsx`, `lib/ai/remy-routine-form-actions.ts` exist. **MISSING: `app/(chef)/remy/routines/page.tsx`** - needs page shell wiring |
| 16  | Runtime Hardening            | BUILT               | `tests/remy-routines/` directory exists                                                                                                                                   |
| 17  | Safety Audit + Observability | BUILT               | `tests/remy-safety/` + `components/remy/routine-observability.tsx`                                                                                                        |
| 18  | Skill Proposal               | BUILT               | `lib/remy/skill-proposal-actions.ts` + types + migration `20260523100000`                                                                                                 |
| 19  | Email Snapshot               | BUILT               | `lib/communication/email-snapshot-actions.ts` + types                                                                                                                     |
| 20  | Follow-Up Audit              | BUILT               | `lib/follow-up/sequence-crud.ts` exists (consolidation done)                                                                                                              |

### Wave 3: CIRCLES + MENU + LIFECYCLE - PARTIAL

| #   | Item                      | Status    | Evidence                                                                         |
| --- | ------------------------- | --------- | -------------------------------------------------------------------------------- |
| 21  | Multi-Host Collaboration  | BUILT     | `lib/circles/multi-host-actions.ts` + migration `20260523100000_circle_co_hosts` |
| 22  | Circle Unification        | NOT BUILT | `lib/circles/unified-registry-actions.ts` MISSING                                |
| 23  | Operating Loop Extraction | NOT BUILT | `lib/circles/operating-loop-actions.ts` MISSING                                  |
| 24  | Farm Dinner Co-Host       | NOT BUILT | `lib/circles/farm-dinner-actions.ts` MISSING                                     |
| 25  | Recipe Lifecycle          | BUILT     | `lib/recipes/lifecycle-types.ts` exists                                          |
| 26  | Peak Windows              | BUILT     | `lib/recipes/peak-window-actions.ts` + types                                     |
| 27  | Stop/Resume Trails        | BUILT     | `lib/events/stop-resume-actions.ts` + types + migration `20260523000001`         |

### Wave 4: AI + ONBOARDING + UI - PARTIAL

| #   | Item                | Status    | Evidence                                                                                  |
| --- | ------------------- | --------- | ----------------------------------------------------------------------------------------- |
| 28  | External Memory     | BUILT     | `lib/ai/external-memory-actions.ts` + types + migration `20260523110000`                  |
| 29  | Config Engine       | BUILT     | `lib/config/engine-actions.ts` + types + migration `20260523110000_tenant_configurations` |
| 30  | Culinary Ops        | NOT BUILT | `lib/ai/culinary-ops-actions.ts` MISSING                                                  |
| 31  | Onboarding Cohesion | NOT BUILT | `lib/onboarding/cohesion-actions.ts` MISSING                                              |
| 32  | Capture Triage Dock | BUILT     | `components/capture/triage-dock.tsx` exists                                               |
| 33  | Price Intelligence  | BUILT     | `lib/openclaw/price-intelligence-actions.ts` exists                                       |

### Wave 5: ULYSSES ENGINE - PARTIAL (core built, domains sparse)

| #   | Item                 | Status                 | Evidence                                                                                                             |
| --- | -------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 34  | Override Ceremony    | BUILT                  | `components/commitment/override-ceremony.tsx` (singular path, May 17)                                                |
| 35  | Scheduling Domain    | BUILT                  | `lib/commitment/domains/scheduling.ts`                                                                               |
| 36  | Dietary Safety       | EXISTS (as dietary.ts) | `lib/commitment/domains/dietary.ts` (built May 17, prompt names it dietary-safety.ts)                                |
| 37  | Streak Counter       | BUILT                  | `lib/commitment/streak-actions.ts` + types                                                                           |
| 38  | Commitment Cockpit   | BUILT                  | `components/commitment/commitment-cockpit.tsx` (singular path, May 17). TSC error: not registered in widget registry |
| 39  | Menu Integrity       | NOT BUILT              |                                                                                                                      |
| 40  | Closeout Discipline  | NOT BUILT              |                                                                                                                      |
| 41  | Communication Domain | BUILT                  | `lib/commitment/domains/communication.ts`                                                                            |
| 42  | Capacity Domain      | BUILT                  | `lib/commitment/domains/capacity.ts`                                                                                 |
| 43  | Future Self Letters  | MIGRATION ONLY         | Migration `20260523120000` exists, no action file                                                                    |
| 44  | Cooling-Off Periods  | PARTIAL                | Migration `20260523140000` + `lib/commitments/cooling-off-actions.ts` (plural path)                                  |
| 45  | Portfolios           | PARTIAL                | Migration `20260523140001` + `lib/commitments/portfolio-actions.ts` (plural path)                                    |

### Wave 6: ULYSSES DOMAINS + COMPOUND - MOSTLY NOT BUILT

| #   | Item                    | Status                                                                |
| --- | ----------------------- | --------------------------------------------------------------------- |
| 46  | Contingency             | BUILT (`lib/commitment/domains/contingency.ts`)                       |
| 47  | Travel                  | NOT BUILT                                                             |
| 48  | Business Health         | BUILT (`lib/commitment/domains/business-health.ts`)                   |
| 49  | Spiral Detector         | BUILT (`lib/commitment/compound/spiral-detector.ts`)                  |
| 50  | Client Vortex           | BUILT (`lib/commitment/compound/client-vortex-detector.ts`)           |
| 51  | Seasonal Erosion        | NOT BUILT                                                             |
| 52  | Fatigue Cascade         | NOT BUILT                                                             |
| 53  | New Client Risk         | NOT BUILT                                                             |
| 54  | Seasons                 | PARTIAL (types only: `lib/commitment/seasons-types.ts`)               |
| 55  | Event Contracts         | NOT BUILT                                                             |
| 56  | Override Correlation    | NOT BUILT                                                             |
| 57  | Beta Monetization       | PARTIAL (`lib/monetization/archive-types.ts` exists, actions MISSING) |
| 58  | Data Export             | NOT BUILT                                                             |
| 59  | Product Doctrine        | BUILT (`lib/doctrine/doctrine-actions.ts`)                            |
| 60  | Research Index          | BUILT (`lib/research/builds-index-actions.ts`)                        |
| 61  | Respectful Monetization | BUILT (`lib/monetization/respectful-actions.ts` + types)              |
| 62  | Support Network         | NOT BUILT                                                             |
| 63  | Integrity Interrogation | PARTIAL (types only: `lib/qa/integrity-interrogation-types.ts`)       |

### Waves 7-8: ULYSSES ADVANCED + BUSINESS - MOSTLY NOT BUILT

| #      | Built                                                     | Not Built                                                                                                                                                                                                                                                                                                                                            |
| ------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wave 7 | Archaeology (#66, actions exist), Diffusion (#76, exists) | Temptation (#64), Witness (#65, partial in commitments/), Best-Month (#67), Negotiation (#68), Regret (#69), Remy Coach (#70), Remy Override (#71), Remy Monthly (#72, types only), Anti-Commitment (#73), Recovery (#74), DNA (#75)                                                                                                                 |
| Wave 8 | Say-No (#82, in commitments/)                             | Quarterly Audit (#77), Scope Creep (#78), Delegation (#79, types only + migration), No Free Work (#80), Transparency (#81), Milestones (#83), Quote Check (#84), Decay (#85), Vendor (#86), Learning (#87), Time-of-Day (#88), Reputation (#89), Energy Budget (#90), Client Education (#91), Gratitude (#92), Living Recipe (#93), Pre-Mortem (#94) |

### Wave 9-10: HUMAN BODY - MOSTLY BUILT (from swarm runs)

Most "organ" contracts and intelligence files exist:

- Chef Capacity Twin, Chef Life Strategy Map, Client Household Memory, Craft Evolution Lab, Crisis Recovery, Physical Loadout Brain, Staff Trust Delegation, Private Memory Visibility - ALL BUILT
- Financial Cockpit, Revenue Engine, Sustainability Ledger, Vendor Trust Ledger, PIE Oracle - ALL BUILT
- Chef Life Synthesis, Dinner Circle workspace/arrival/accommodation/action-surface - ALL BUILT
- Reviews Command Center, Hub Link Preview, Remy Sensitive Boundary Broker - ALL BUILT
- URL Capability Registry, Server Timing, Fact Guardrails, Build Queue Contract Types - ALL BUILT
- Public Showcase (`lib/showcase/`) - NOT BUILT

---

## WHAT NEEDS BUILDING (REMAINING ~45 ITEMS)

### Priority 0: Fix Build

1. Fix `lib/scheduling/types.ts` - add `commitment_cockpit` to both widget registries

### Priority 1: Consolidate Path Split

2. Reconcile `lib/commitment/` vs `lib/commitments/` - move everything into `lib/commitment/` (where engine lives)

### Priority 2: Finish Waves 3-4 Gaps (6 items)

3. Circle Unification (Prompt 22)
4. Operating Loop Extraction (Prompt 23)
5. Farm Dinner Co-Host (Prompt 24) - depends on #21 (built)
6. Culinary Ops Intelligence (Prompt 30)
7. Onboarding Cohesion Rework (Prompt 31) - depends on Config Engine (built)
8. Remy Routines page shell (`app/(chef)/remy/routines/page.tsx`, Prompt 15 gap)

### Priority 3: Ulysses Domains (11 items, mechanical)

9. Menu Integrity domain (Prompt 39)
10. Closeout Discipline domain (Prompt 40)
11. Travel domain (Prompt 47)
12. Vendor domain (Prompt 86)
13. Learning domain (Prompt 87)
14. Time-of-Day domain (Prompt 88)
15. Reputation domain (Prompt 89)
16. Client Education domain (Prompt 91)
17. Gratitude domain (Prompt 92)
18. Living Recipe domain (Prompt 93)
19. Dietary Safety domain - verify `dietary.ts` covers prompt 36 requirements or rename

### Priority 4: Ulysses Compound Detectors (3 items)

20. Seasonal Erosion Detector (Prompt 51)
21. Fatigue Cascade Detector (Prompt 52)
22. New Client Risk Detector (Prompt 53)

### Priority 5: Ulysses Actions (complete files, ~15 items)

23. Future Self Letters actions (Prompt 43) - migration exists
24. Event Contracts actions (Prompt 55)
25. Override Correlation actions (Prompt 56)
26. Seasons actions (Prompt 54) - types exist
27. Temptation Catalog (Prompt 64)
28. Best-Month Mirror (Prompt 67)
29. Negotiation (Prompt 68)
30. Regret Minimizer (Prompt 69)
31. Remy Coach Morning Briefing (Prompt 70)
32. Remy Post-Override Coaching (Prompt 71)
33. Anti-Commitment Detection (Prompt 73)
34. Recovery Protocol (Prompt 74)
35. Commitment DNA (Prompt 75)
36. Integrity Interrogation actions (Prompt 63) - types exist
37. Beta Monetization actions (Prompt 57) - types exist

### Priority 6: Ulysses Business (Wave 8 remaining, ~13 items)

38. Quarterly Audit (Prompt 77)
39. Scope Creep Lock (Prompt 78)
40. Delegation/Crisis Protocol actions (Prompt 79) - types + migration exist
41. No Free Work (Prompt 80)
42. Transparency (Prompt 81)
43. Milestone Commitments (Prompt 83)
44. Commitment-Aware Quoting (Prompt 84)
45. Decay Detection (Prompt 85)
46. Energy Budget (Prompt 90)
47. Pre-Mortem (Prompt 94)
48. Diffusion - verify complete (Prompt 76, file exists)

### Priority 7: Remaining Infrastructure

49. Support Network Map (Prompt 62)
50. Data Export Takeout (Prompt 58)
51. Public Showcase (`lib/showcase/`) - if in scope

---

## DISPATCH STRATEGY

All remaining items are mechanical, spec-following builds. Use Codex or Haiku agents.

**Batch by pattern:**

- **Ulysses domains** (9-11 items): identical pattern. Read `lib/commitment/domains/pricing.ts` as template. One agent per domain or batch 3-4 per agent.
- **Compound detectors** (3 items): identical pattern. Read `lib/commitment/compound/spiral-detector.ts` as template.
- **Action files** (15 items): each is self-contained server actions + types. One agent per item.
- **Circle features** (3 items): depend on existing `lib/circles/` and `lib/dinner-circles/`.

**Every agent dispatch must include:**

- "Run `npm run regression:firewall` before marking done"
- "Do NOT delete any existing files"
- "Use `lib/commitment/` (singular) for all commitment code"
- "All server actions need: auth gate, tenant scoping, input validation"

---

## GIT STATE

- 562 dirty files (387 untracked, 175 modified)
- Last commit: `54ed325c0` (2026-05-21, PIE native serving index)
- All work from May 21-23 swarm runs is uncommitted
- **Commit the existing work before dispatching new builds** to avoid merge conflicts

## FILES TO COMMIT FIRST

Priority commit groups:

1. `lib/commitment/` + `lib/commitments/` + `components/commitment/` + related migrations
2. `lib/qa/` (validation, flow, domain-inventory, wiring-mise, integrity)
3. `lib/openclaw/` (archive-digester, enrichment, price-intelligence)
4. `lib/remy/` + `components/remy/` + `tests/remy-*/`
5. `components/rail/` + `lib/rail/` + `lib/discovery/resolvers/`
6. Everything else (intelligence, circles, communication, config, etc.)
