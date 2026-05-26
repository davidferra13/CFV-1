# Exit-Eval Codex Dispatch Manifest

> **Generated:** 2026-05-25
> **Total:** 76 prompts across 7 waves covering 489 exit scenarios
> **Dispatch:** Sequential Codex invocations. One prompt at a time.
> **Output:** Each prompt writes results to `docs/exit-evals/{role}/{category-slug}.md`

---

## Wave Summary

| Wave | Role      | Prompts | Scenarios | Status  |
| ---- | --------- | ------- | --------- | ------- |
| 1    | Chef      | 18      | 95        | PENDING |
| 2    | Client    | 13      | 91        | PENDING |
| 3    | Admin     | 9       | 72        | PENDING |
| 4    | Guest     | 10      | 65        | PENDING |
| 5    | Partner   | 10      | 56        | PENDING |
| 6    | Vendor    | 7       | 56        | PENDING |
| 7    | Staff     | 9       | 54        | PENDING |
|      | **TOTAL** | **76**  | **489**   |         |

---

## Wave 1: Chef (18 prompts, 95 scenarios)

### Prompt 1: Chef / COSTING & PRICING (Highest Frequency Exit)

- **Scenarios:** 1, 2, 3, 4, 5, 6, 7 (7 total)
- **Output:** `docs/exit-evals/chef/costing-pricing-highest-frequency-exit.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CHEF role in ChefFlow.

SOURCE FILE: docs/research/chef-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/chef-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 7 SCENARIOS from category "COSTING & PRICING (Highest Frequency Exit)":
  1. Cost out a menu using real retail prices
  2. Check current price of a specific ingredient
  3. Compare prices across multiple stores
  4. Check specialty ingredient availability
  5. Verify seasonal availability
  6. Look up bulk/wholesale pricing
  7. Calculate food cost % against a target

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the chef leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why chef leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the chef still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/chef/costing-pricing-highest-frequency-exit.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for chef by 7.
```

### Prompt 2: Chef / VENDOR & SUPPLIER INTERACTION

- **Scenarios:** 8, 9, 10, 11, 12, 13 (6 total)
- **Output:** `docs/exit-evals/chef/vendor-supplier-interaction.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CHEF role in ChefFlow.

SOURCE FILE: docs/research/chef-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/chef-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 6 SCENARIOS from category "VENDOR & SUPPLIER INTERACTION":
  8. Browse vendor's full product catalog
  9. Place an order with a vendor
  10. Check order status / delivery tracking
  11. Contact a vendor (call, email, chat)
  12. Research new vendors/suppliers
  13. Compare vendor quality/reliability

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the chef leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why chef leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the chef still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/chef/vendor-supplier-interaction.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for chef by 6.
```

### Prompt 3: Chef / CLIENT RESEARCH & RELATIONSHIP

- **Scenarios:** 14, 15, 16, 17, 18 (5 total)
- **Output:** `docs/exit-evals/chef/client-research-relationship.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CHEF role in ChefFlow.

SOURCE FILE: docs/research/chef-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/chef-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 5 SCENARIOS from category "CLIENT RESEARCH & RELATIONSHIP":
  14. Research a new client before first meeting
  15. Check client's social media for event context
  16. Look up client's company for corporate event
  17. Check a client's dietary/allergy info from external source
  18. View client's venue/home on map

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the chef leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why chef leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the chef still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/chef/client-research-relationship.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for chef by 5.
```

### Prompt 4: Chef / RECIPE & CULINARY RESEARCH

- **Scenarios:** 19, 20, 21, 22, 23, 24 (6 total)
- **Output:** `docs/exit-evals/chef/recipe-culinary-research.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CHEF role in ChefFlow.

SOURCE FILE: docs/research/chef-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/chef-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 6 SCENARIOS from category "RECIPE & CULINARY RESEARCH":
  19. Look up a technique or method
  20. Find recipe inspiration for a menu
  21. Research a cuisine they're less familiar with
  22. Check nutritional info for a dish
  23. Verify food safety temps/times
  24. Find a substitute ingredient

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the chef leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why chef leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the chef still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/chef/recipe-culinary-research.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for chef by 6.
```

### Prompt 5: Chef / COMMUNICATION (The Messy Reality)

- **Scenarios:** 25, 26, 27, 28, 29, 30, 31 (7 total)
- **Output:** `docs/exit-evals/chef/communication-the-messy-reality.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CHEF role in ChefFlow.

SOURCE FILE: docs/research/chef-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/chef-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 7 SCENARIOS from category "COMMUNICATION (The Messy Reality)":
  25. Text/iMessage a client
  26. WhatsApp with a client
  27. Call a client
  28. Check personal email for client replies
  29. Respond to inquiry on a 3rd-party platform
  30. Send food photos to client
  31. Coordinate with other vendors (florist, event planner, venue)

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the chef leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why chef leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the chef still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/chef/communication-the-messy-reality.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for chef by 7.
```

### Prompt 6: Chef / MARKETING & SOCIAL PRESENCE

- **Scenarios:** 32, 33, 34, 35, 36, 37 (6 total)
- **Output:** `docs/exit-evals/chef/marketing-social-presence.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CHEF role in ChefFlow.

SOURCE FILE: docs/research/chef-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/chef-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 6 SCENARIOS from category "MARKETING & SOCIAL PRESENCE":
  32. Post food photos to Instagram/TikTok
  33. Update Google Business Profile
  34. Respond to Yelp/Google reviews
  35. Update personal website/portfolio
  36. Create marketing materials
  37. Manage ads

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the chef leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why chef leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the chef still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/chef/marketing-social-presence.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for chef by 6.
```

### Prompt 7: Chef / MONEY & PAYMENTS

- **Scenarios:** 38, 39, 40, 41, 42 (5 total)
- **Output:** `docs/exit-evals/chef/money-payments.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CHEF role in ChefFlow.

SOURCE FILE: docs/research/chef-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/chef-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 5 SCENARIOS from category "MONEY & PAYMENTS":
  38. Check if a client payment cleared
  39. Send a payment request via Venmo/Zelle
  40. Reconcile bank statements
  41. Handle taxes / quarterly estimates
  42. Manage business insurance

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the chef leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why chef leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the chef still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/chef/money-payments.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for chef by 5.
```

### Prompt 8: Chef / LOGISTICS & TRAVEL

- **Scenarios:** 43, 44, 45, 46, 47 (5 total)
- **Output:** `docs/exit-evals/chef/logistics-travel.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CHEF role in ChefFlow.

SOURCE FILE: docs/research/chef-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/chef-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 5 SCENARIOS from category "LOGISTICS & TRAVEL":
  43. Route planning for the day
  44. Check traffic before leaving
  45. Find a grocery store near an event venue
  46. Book travel for destination events
  47. Rent equipment for large events

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the chef leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why chef leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the chef still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/chef/logistics-travel.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for chef by 5.
```

### Prompt 9: Chef / LEGAL & COMPLIANCE

- **Scenarios:** 48, 49, 50, 51, 52 (5 total)
- **Output:** `docs/exit-evals/chef/legal-compliance.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CHEF role in ChefFlow.

SOURCE FILE: docs/research/chef-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/chef-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 5 SCENARIOS from category "LEGAL & COMPLIANCE":
  48. Renew food handler's license
  49. Check local cottage food / home kitchen laws
  50. Get business license / permits
  51. Review/sign a venue's liability waiver
  52. Consult with a lawyer

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the chef leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why chef leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the chef still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/chef/legal-compliance.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for chef by 5.
```

### Prompt 10: Chef / PROFESSIONAL DEVELOPMENT

- **Scenarios:** 53, 54, 55, 56 (4 total)
- **Output:** `docs/exit-evals/chef/professional-development.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CHEF role in ChefFlow.

SOURCE FILE: docs/research/chef-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/chef-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 4 SCENARIOS from category "PROFESSIONAL DEVELOPMENT":
  53. Take an online course or certification
  54. Read industry news
  55. Network with other chefs
  56. Find a sous chef / assistant for a large event

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the chef leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why chef leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the chef still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/chef/professional-development.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for chef by 4.
```

### Prompt 11: Chef / EVENT-SPECIFIC RESEARCH

- **Scenarios:** 57, 58, 59, 60, 61 (5 total)
- **Output:** `docs/exit-evals/chef/event-specific-research.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CHEF role in ChefFlow.

SOURCE FILE: docs/research/chef-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/chef-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 5 SCENARIOS from category "EVENT-SPECIFIC RESEARCH":
  57. Research a venue's kitchen capabilities
  58. Check weather for outdoor event
  59. Find local farm for farm-to-table sourcing
  60. Research wine/beverage pairings
  61. Get table/seating layout ideas

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the chef leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why chef leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the chef still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/chef/event-specific-research.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for chef by 5.
```

### Prompt 12: Chef / HARDWARE & EQUIPMENT

- **Scenarios:** 62, 63, 64 (3 total)
- **Output:** `docs/exit-evals/chef/hardware-equipment.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CHEF role in ChefFlow.

SOURCE FILE: docs/research/chef-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/chef-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 3 SCENARIOS from category "HARDWARE & EQUIPMENT":
  62. Buy kitchen equipment
  63. Get equipment serviced/repaired
  64. Research new equipment

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the chef leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why chef leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the chef still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/chef/hardware-equipment.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for chef by 3.
```

### Prompt 13: Chef / PEOPLE & DELEGATION

- **Scenarios:** 65, 66, 67, 68, 69, 70, 71 (7 total)
- **Output:** `docs/exit-evals/chef/people-delegation.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CHEF role in ChefFlow.

SOURCE FILE: docs/research/chef-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/chef-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 7 SCENARIOS from category "PEOPLE & DELEGATION":
  65. Coordinate with client's household staff (house manager, nanny, PA)
  66. Hire/coordinate photographer for events
  67. Communicate with commissary kitchen landlord
  68. Manage cleaning crew / dishwashers for large events
  69. Coordinate with delivery drivers (meal prep clients)
  70. Talk to accountant/bookkeeper (non-tax)
  71. Deal with health inspector

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the chef leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why chef leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the chef still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/chef/people-delegation.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for chef by 7.
```

### Prompt 14: Chef / OPERATIONAL TOOLS & CALCULATIONS (Part 1)

- **Scenarios:** 72, 73, 74, 75, 76, 77, 78, 79 (8 total)
- **Output:** `docs/exit-evals/chef/operational-tools-calculations-part1.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CHEF role in ChefFlow.

SOURCE FILE: docs/research/chef-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/chef-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 8 SCENARIOS from category "OPERATIONAL TOOLS & CALCULATIONS":
  72. Sync events to personal calendar
  73. Track mileage for tax deductions
  74. Scale a recipe from 4 to 40 servings
  75. Convert units (metric/imperial, volume/weight)
  76. Edit food photos before posting
  77. Print allergen/nutrition labels
  78. Create contracts/proposals beyond ChefFlow templates
  79. Check competitor pricing/offerings

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the chef leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why chef leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the chef still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/chef/operational-tools-calculations-part1.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for chef by 8.
```

### Prompt 15: Chef / OPERATIONAL TOOLS & CALCULATIONS (Part 2)

- **Scenarios:** 80, 81, 82, 83, 84, 85, 86 (7 total)
- **Output:** `docs/exit-evals/chef/operational-tools-calculations-part2.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CHEF role in ChefFlow.

SOURCE FILE: docs/research/chef-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/chef-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 7 SCENARIOS from category "OPERATIONAL TOOLS & CALCULATIONS":
  80. Manage a waitlist during busy season
  81. Calculate tip/gratuity split for hired staff
  82. Create/manage gift certificates
  83. Send thank-you / follow-up gifts to clients
  84. Manage recurring meal prep schedule
  85. Schedule social media posts
  86. Track personal pantry / dry stock inventory

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the chef leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why chef leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the chef still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/chef/operational-tools-calculations-part2.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for chef by 7.
```

### Prompt 16: Chef / TIME & LOCATION LOGISTICS

- **Scenarios:** 87, 88, 89, 90 (4 total)
- **Output:** `docs/exit-evals/chef/time-location-logistics.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CHEF role in ChefFlow.

SOURCE FILE: docs/research/chef-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/chef-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 4 SCENARIOS from category "TIME & LOCATION LOGISTICS":
  87. Set prep timing reminders/alarms
  88. Time zone math for destination events
  89. Find a commissary/commercial kitchen to rent
  90. Check parking/loading dock logistics at venue

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the chef leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why chef leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the chef still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/chef/time-location-logistics.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for chef by 4.
```

### Prompt 17: Chef / MARKET & COMPETITIVE INTELLIGENCE

- **Scenarios:** 91, 92 (2 total)
- **Output:** `docs/exit-evals/chef/market-competitive-intelligence.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CHEF role in ChefFlow.

SOURCE FILE: docs/research/chef-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/chef-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 2 SCENARIOS from category "MARKET & COMPETITIVE INTELLIGENCE":
  91. Research trending cuisines/food trends in area
  92. Validate own pricing against market rates

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the chef leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why chef leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the chef still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/chef/market-competitive-intelligence.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for chef by 2.
```

### Prompt 18: Chef / DURING-SERVICE (The Kitchen Boundary)

- **Scenarios:** 93, 94, 95 (3 total)
- **Output:** `docs/exit-evals/chef/during-service-the-kitchen-boundary.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CHEF role in ChefFlow.

SOURCE FILE: docs/research/chef-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/chef-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 3 SCENARIOS from category "DURING-SERVICE (The Kitchen Boundary)":
  93. Multiple concurrent kitchen timers
  94. Quick recipe glance mid-cook (hands dirty)
  95. Music/ambiance control

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the chef leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why chef leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the chef still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/chef/during-service-the-kitchen-boundary.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for chef by 3.
```

---

## Wave 2: Client (13 prompts, 91 scenarios)

### Prompt 19: Client / DISCOVERY & CHEF RESEARCH

- **Scenarios:** 1, 2, 3, 4, 5, 6, 7 (7 total)
- **Output:** `docs/exit-evals/client/discovery-chef-research.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CLIENT role in ChefFlow.

SOURCE FILE: docs/research/client-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/client-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 7 SCENARIOS from category "DISCOVERY & CHEF RESEARCH":
  1. Search for a private chef from scratch
  2. Ask friends for chef recommendations
  3. Browse food inspiration before choosing a chef
  4. Search for local restaurant alternatives
  5. Compare chefs on marketplace platforms
  6. Check a chef's social presence
  7. Validate whether ChefFlow serves their area

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the client leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why client leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the client still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/client/discovery-chef-research.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for client by 7.
```

### Prompt 20: Client / TRUST, REVIEWS & VALIDATION

- **Scenarios:** 8, 9, 10, 11, 12, 13 (6 total)
- **Output:** `docs/exit-evals/client/trust-reviews-validation.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CLIENT role in ChefFlow.

SOURCE FILE: docs/research/client-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/client-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 6 SCENARIOS from category "TRUST, REVIEWS & VALIDATION":
  8. Read third-party reviews
  9. Verify chef identity and background
  10. Check food safety or license claims
  11. Look for past event photos
  12. Check references manually
  13. Validate refund/cancellation policies

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the client leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why client leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the client still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/client/trust-reviews-validation.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for client by 6.
```

### Prompt 21: Client / BOOKING COMPARISON & BUDGETING

- **Scenarios:** 14, 15, 16, 17, 18, 19, 20 (7 total)
- **Output:** `docs/exit-evals/client/booking-comparison-budgeting.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CLIENT role in ChefFlow.

SOURCE FILE: docs/research/client-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/client-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 7 SCENARIOS from category "BOOKING COMPARISON & BUDGETING":
  14. Compare price ranges across options
  15. Track multiple chef quotes
  16. Estimate total event budget
  17. Compare private chef vs catering vs restaurant
  18. Ask another household decision-maker to approve
  19. Save a chef for later
  20. Calculate split costs among guests

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the client leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why client leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the client still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/client/booking-comparison-budgeting.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for client by 7.
```

### Prompt 22: Client / CALENDAR & SCHEDULING

- **Scenarios:** 21, 22, 23, 24, 25, 26 (6 total)
- **Output:** `docs/exit-evals/client/calendar-scheduling.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CLIENT role in ChefFlow.

SOURCE FILE: docs/research/client-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/client-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 6 SCENARIOS from category "CALENDAR & SCHEDULING":
  21. Check personal availability
  22. Coordinate date with spouse/family/team
  23. Add event to personal calendar
  24. Track payment/menu/guest deadlines
  25. Find a date that fits venue availability
  26. Reschedule with multiple stakeholders

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the client leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why client leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the client still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/client/calendar-scheduling.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for client by 6.
```

### Prompt 23: Client / COMMUNICATION

- **Scenarios:** 27, 28, 29, 30, 31, 32, 33, 34 (8 total)
- **Output:** `docs/exit-evals/client/communication.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CLIENT role in ChefFlow.

SOURCE FILE: docs/research/client-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/client-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 8 SCENARIOS from category "COMMUNICATION":
  27. Text the chef directly
  28. WhatsApp the chef
  29. Call the chef
  30. Email outside the portal
  31. Coordinate through an assistant or planner
  32. Share files or inspiration
  33. Ask guests questions manually
  34. Escalate a support issue

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the client leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why client leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the client still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/client/communication.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for client by 8.
```

### Prompt 24: Client / PAYMENTS, MONEY & RECEIPTS

- **Scenarios:** 35, 36, 37, 38, 39, 40, 41, 42 (8 total)
- **Output:** `docs/exit-evals/client/payments-money-receipts.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CLIENT role in ChefFlow.

SOURCE FILE: docs/research/client-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/client-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 8 SCENARIOS from category "PAYMENTS, MONEY & RECEIPTS":
  35. Check credit card or bank balance before paying
  36. Pay by Venmo, Zelle, PayPal, or check
  37. Complete secure card checkout
  38. Download receipts for reimbursement
  39. Split payment with guests
  40. Dispute or reverse a charge
  41. Track spending for taxes or business hosting
  42. Tip after the event

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the client leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why client leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the client still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/client/payments-money-receipts.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for client by 8.
```

### Prompt 25: Client / EVENT PLANNING & VENDOR COORDINATION

- **Scenarios:** 43, 44, 45, 46, 47, 48, 49, 50, 51 (9 total)
- **Output:** `docs/exit-evals/client/event-planning-vendor-coordination.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CLIENT role in ChefFlow.

SOURCE FILE: docs/research/client-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/client-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 9 SCENARIOS from category "EVENT PLANNING & VENDOR COORDINATION":
  43. Book a venue
  44. Coordinate with event planner
  45. Book rentals
  46. Hire florist/decorator
  47. Hire entertainment
  48. Send invitations
  49. Build seating chart
  50. Coordinate alcohol or bar service
  51. Order cake, favors, or non-chef food

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the client leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why client leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the client still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/client/event-planning-vendor-coordination.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for client by 9.
```

### Prompt 26: Client / GUEST COORDINATION

- **Scenarios:** 52, 53, 54, 55, 56, 57, 58, 59 (8 total)
- **Output:** `docs/exit-evals/client/guest-coordination.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CLIENT role in ChefFlow.

SOURCE FILE: docs/research/client-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/client-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 8 SCENARIOS from category "GUEST COORDINATION":
  52. Collect guest names
  53. Collect RSVPs
  54. Collect dietary restrictions
  55. Chase missing guest responses
  56. Share event details with guests
  57. Ask guests to pay their share
  58. Handle guest changes day-of
  59. Share parking/directions to guests

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the client leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why client leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the client still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/client/guest-coordination.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for client by 8.
```

### Prompt 27: Client / MENU, DIETARY & BEVERAGE RESEARCH

- **Scenarios:** 60, 61, 62, 63, 64, 65, 66, 67 (8 total)
- **Output:** `docs/exit-evals/client/menu-dietary-beverage-research.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CLIENT role in ChefFlow.

SOURCE FILE: docs/research/client-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/client-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 8 SCENARIOS from category "MENU, DIETARY & BEVERAGE RESEARCH":
  60. Find menu inspiration
  61. Research a cuisine or dish
  62. Check allergy seriousness
  63. Look up nutrition/macros
  64. Research wine pairings
  65. Buy wine/spirits
  66. Ask household members what they want
  67. Request substitutions or revisions

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the client leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why client leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the client still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/client/menu-dietary-beverage-research.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for client by 8.
```

### Prompt 28: Client / VENUE, HOME & LOGISTICS

- **Scenarios:** 68, 69, 70, 71, 72, 73, 74, 75 (8 total)
- **Output:** `docs/exit-evals/client/venue-home-logistics.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CLIENT role in ChefFlow.

SOURCE FILE: docs/research/client-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/client-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 8 SCENARIOS from category "VENUE, HOME & LOGISTICS":
  68. Share home access details
  69. Check venue rules
  70. Confirm parking/loading
  71. Share kitchen photos
  72. Confirm equipment availability
  73. Coordinate building security
  74. Book cleaning service
  75. Check weather for outdoor event

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the client leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why client leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the client still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/client/venue-home-logistics.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for client by 8.
```

### Prompt 29: Client / TRAVEL, DIRECTIONS & DAY-OF MOVEMENT

- **Scenarios:** 76, 77, 78, 79, 80 (5 total)
- **Output:** `docs/exit-evals/client/travel-directions-day-of-movement.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CLIENT role in ChefFlow.

SOURCE FILE: docs/research/client-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/client-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 5 SCENARIOS from category "TRAVEL, DIRECTIONS & DAY-OF MOVEMENT":
  76. Navigate to event
  77. Order rideshare
  78. Book lodging for destination event
  79. Track traffic or parking
  80. Coordinate pickup/drop-off timing

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the client leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why client leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the client still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/client/travel-directions-day-of-movement.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for client by 5.
```

### Prompt 30: Client / LEGAL, PRIVACY & COMPLIANCE

- **Scenarios:** 81, 82, 83, 84 (4 total)
- **Output:** `docs/exit-evals/client/legal-privacy-compliance.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CLIENT role in ChefFlow.

SOURCE FILE: docs/research/client-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/client-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 4 SCENARIOS from category "LEGAL, PRIVACY & COMPLIANCE":
  81. Review legal terms with lawyer or company procurement
  82. Get corporate approval
  83. Verify cannabis legality or age requirements
  84. Request privacy/data deletion help

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the client leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why client leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the client still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/client/legal-privacy-compliance.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for client by 4.
```

### Prompt 31: Client / POST-EVENT, SOCIAL & MEMORY

- **Scenarios:** 85, 86, 87, 88, 89, 90, 91 (7 total)
- **Output:** `docs/exit-evals/client/post-event-social-memory.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the CLIENT role in ChefFlow.

SOURCE FILE: docs/research/client-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/client-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 7 SCENARIOS from category "POST-EVENT, SOCIAL & MEMORY":
  85. Post event photos
  86. Store photos in personal album
  87. Leave a public review
  88. Send thank-you notes to guests
  89. Recommend the chef to friends
  90. Recreate a dish at home
  91. Remember what was served months later

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the client leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why client leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the client still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/client/post-event-social-memory.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for client by 7.
```

---

## Wave 3: Admin (9 prompts, 72 scenarios)

### Prompt 32: Admin / AUTHENTICATION, ADMIN ACCESS & ROLE CONTROL

- **Scenarios:** 1, 2, 3, 4, 5, 6, 7, 8 (8 total)
- **Output:** `docs/exit-evals/admin/authentication-admin-access-role-control.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the ADMIN role in ChefFlow.

SOURCE FILE: docs/research/admin-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/admin-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 8 SCENARIOS from category "AUTHENTICATION, ADMIN ACCESS & ROLE CONTROL":
  1. Sign in after session expiry
  2. Retrieve admin password or MFA code
  3. Bootstrap the first owner/admin row
  4. Investigate why an expected admin cannot enter `/admin`
  5. Promote a trusted operator to admin
  6. Remove or demote an admin
  7. Confirm VIP is not admin
  8. Audit an access anomaly

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the admin leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why admin leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the admin still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/admin/authentication-admin-access-role-control.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for admin by 8.
```

### Prompt 33: Admin / INFRASTRUCTURE, DEPLOYMENT & LOCAL SERVICES

- **Scenarios:** 9, 10, 11, 12, 13, 14, 15, 16 (8 total)
- **Output:** `docs/exit-evals/admin/infrastructure-deployment-local-services.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the ADMIN role in ChefFlow.

SOURCE FILE: docs/research/admin-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/admin-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 8 SCENARIOS from category "INFRASTRUCTURE, DEPLOYMENT & LOCAL SERVICES":
  9. Restart or inspect the canonical dev server
  10. Inspect Docker containers
  11. Check hosting deployment status
  12. Inspect server logs during a 500
  13. Check environment variables
  14. Restart Ollama or local AI
  15. Restart OpenClaw worker/container
  16. Verify database connectivity outage

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the admin leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why admin leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the admin still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/admin/infrastructure-deployment-local-services.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for admin by 8.
```

### Prompt 34: Admin / DATABASE, MIGRATIONS & CROSS-TENANT DATA REPAIR

- **Scenarios:** 17, 18, 19, 20, 21, 22, 23, 24 (8 total)
- **Output:** `docs/exit-evals/admin/database-migrations-cross-tenant-data-repair.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the ADMIN role in ChefFlow.

SOURCE FILE: docs/research/admin-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/admin-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 8 SCENARIOS from category "DATABASE, MIGRATIONS & CROSS-TENANT DATA REPAIR":
  17. Apply a migration
  18. Inspect raw cross-tenant records
  19. Repair malformed tenant data
  20. Investigate RLS/service-role behavior
  21. Restore from backup
  22. Run one-off data export for legal/support
  23. Debug missing public directory records
  24. Investigate audit-log write failure

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the admin leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why admin leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the admin still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/admin/database-migrations-cross-tenant-data-repair.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for admin by 8.
```

### Prompt 35: Admin / PAYMENTS, FINANCE & ACCOUNTING

- **Scenarios:** 25, 26, 27, 28, 29, 30, 31, 32 (8 total)
- **Output:** `docs/exit-evals/admin/payments-finance-accounting.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the ADMIN role in ChefFlow.

SOURCE FILE: docs/research/admin-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/admin-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 8 SCENARIOS from category "PAYMENTS, FINANCE & ACCOUNTING":
  25. Verify a charge, transfer, or refund in Stripe
  26. Cancel or inspect a paid subscription after comping
  27. Reconcile platform fees against payouts
  28. Confirm bank deposits
  29. Handle chargebacks or disputes
  30. Prepare taxes or monthly books
  31. Investigate Stripe key mode mismatch
  32. Issue non-ChefFlow refund or goodwill payment

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the admin leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why admin leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the admin still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/admin/payments-finance-accounting.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for admin by 8.
```

### Prompt 36: Admin / COMMUNICATION, SUPPORT & USER RELATIONSHIPS

- **Scenarios:** 33, 34, 35, 36, 37, 38, 39, 40 (8 total)
- **Output:** `docs/exit-evals/admin/communication-support-user-relationships.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the ADMIN role in ChefFlow.

SOURCE FILE: docs/research/admin-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/admin-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 8 SCENARIOS from category "COMMUNICATION, SUPPORT & USER RELATIONSHIPS":
  33. Read replies to admin emails
  34. Resolve sensitive support issue by phone
  35. Help a chef through account recovery
  36. Handle urgent outage communications
  37. Coordinate with a trusted admin/operator
  38. Verify email delivery failure
  39. Answer support ticket from outside channel
  40. Send legal/privacy response

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the admin leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why admin leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the admin still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/admin/communication-support-user-relationships.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for admin by 8.
```

### Prompt 37: Admin / WEB RESEARCH, DIRECTORY & OUTREACH

- **Scenarios:** 41, 42, 43, 44, 45, 46, 47, 48 (8 total)
- **Output:** `docs/exit-evals/admin/web-research-directory-outreach.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the ADMIN role in ChefFlow.

SOURCE FILE: docs/research/admin-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/admin-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 8 SCENARIOS from category "WEB RESEARCH, DIRECTORY & OUTREACH":
  41. Verify a web research candidate
  42. Search for new directory leads
  43. Validate a chef's public identity
  44. Review external directory listing quality
  45. Send outreach campaign beyond current preview commands
  46. Verify opt-out or unsubscribe behavior
  47. Check search indexing or SEO state
  48. Update external listing or social profile

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the admin leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why admin leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the admin still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/admin/web-research-directory-outreach.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for admin by 8.
```

### Prompt 38: Admin / PRICING, OPENCLAW & MARKET DATA

- **Scenarios:** 49, 50, 51, 52, 53, 54, 55, 56 (8 total)
- **Output:** `docs/exit-evals/admin/pricing-openclaw-market-data.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the ADMIN role in ChefFlow.

SOURCE FILE: docs/research/admin-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/admin-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 8 SCENARIOS from category "PRICING, OPENCLAW & MARKET DATA":
  49. Verify a quarantined price
  50. Investigate OpenClaw sync failure
  51. Import vendor pricing from external file
  52. Resolve price coverage gaps
  53. Export catalog for offline review
  54. Tune scraper/API credentials
  55. Check regional store availability
  56. Compare ChefFlow price against real receipt

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the admin leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why admin leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the admin still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/admin/pricing-openclaw-market-data.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for admin by 8.
```

### Prompt 39: Admin / LEGAL, POLICY, PRIVACY & REGULATED FLOWS

- **Scenarios:** 57, 58, 59, 60, 61, 62, 63, 64 (8 total)
- **Output:** `docs/exit-evals/admin/legal-policy-privacy-regulated-flows.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the ADMIN role in ChefFlow.

SOURCE FILE: docs/research/admin-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/admin-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 8 SCENARIOS from category "LEGAL, POLICY, PRIVACY & REGULATED FLOWS":
  57. Review terms or policies with counsel
  58. Publish or revise legal documents
  59. Process privacy/data request
  60. Verify cannabis compliance
  61. Review cannabis invite or age edge case
  62. Respond to DMCA or acceptable-use issue
  63. Document security incident
  64. Verify professional licensing or certificates

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the admin leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why admin leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the admin still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/admin/legal-policy-privacy-regulated-flows.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for admin by 8.
```

### Prompt 40: Admin / QA, SECURITY & SYSTEM INTEGRITY

- **Scenarios:** 65, 66, 67, 68, 69, 70, 71, 72 (8 total)
- **Output:** `docs/exit-evals/admin/qa-security-system-integrity.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the ADMIN role in ChefFlow.

SOURCE FILE: docs/research/admin-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/admin-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 8 SCENARIOS from category "QA, SECURITY & SYSTEM INTEGRITY":
  65. Run admin route coverage tests
  66. Run security integrity tests
  67. Debug client-side JS error
  68. Inspect network failures
  69. Compare admin nav against route inventory
  70. Validate API route auth inventory
  71. Investigate Remy/admin boundary
  72. Prepare a handoff or queue item for admin gaps

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the admin leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why admin leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the admin still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/admin/qa-security-system-integrity.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for admin by 8.
```

---

## Wave 4: Guest (10 prompts, 65 scenarios)

### Prompt 41: Guest / PUBLIC DISCOVERY & TRUST VALIDATION

- **Scenarios:** 1, 2, 3, 4, 5, 6, 7 (7 total)
- **Output:** `docs/exit-evals/guest/public-discovery-trust-validation.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the GUEST role in ChefFlow.

SOURCE FILE: docs/research/guest-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/guest-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 7 SCENARIOS from category "PUBLIC DISCOVERY & TRUST VALIDATION":
  1. Search for private chefs before landing on ChefFlow
  2. Validate a chef's reputation
  3. Check a chef's social presence
  4. Compare private chef against restaurants
  5. Research food operators in local directory results
  6. Ask friends whether a chef is worth booking
  7. Verify service area manually

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the guest leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why guest leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the guest still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/guest/public-discovery-trust-validation.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for guest by 7.
```

### Prompt 42: Guest / EVENT INVITE & RSVP COORDINATION

- **Scenarios:** 8, 9, 10, 11, 12, 13, 14 (7 total)
- **Output:** `docs/exit-evals/guest/event-invite-rsvp-coordination.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the GUEST role in ChefFlow.

SOURCE FILE: docs/research/guest-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/guest-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 7 SCENARIOS from category "EVENT INVITE & RSVP COORDINATION":
  8. Find the invitation link again
  9. Ask the host whether they should attend
  10. Coordinate plus-one permission
  11. Share the event with someone else
  12. Chase another guest's RSVP
  13. Recover an expired, revoked, or missing guest token
  14. Resolve duplicate RSVP by email

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the guest leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why guest leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the guest still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/guest/event-invite-rsvp-coordination.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for guest by 7.
```

### Prompt 43: Guest / CALENDAR, MAPS & ARRIVAL LOGISTICS

- **Scenarios:** 15, 16, 17, 18, 19, 20, 21 (7 total)
- **Output:** `docs/exit-evals/guest/calendar-maps-arrival-logistics.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the GUEST role in ChefFlow.

SOURCE FILE: docs/research/guest-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/guest-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 7 SCENARIOS from category "CALENDAR, MAPS & ARRIVAL LOGISTICS":
  15. Add event to personal calendar
  16. Navigate to the event
  17. Check traffic before leaving
  18. Coordinate parking or building access
  19. Order rideshare
  20. Check weather for outdoor dinner
  21. Look up venue/farm details

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the guest leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why guest leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the guest still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/guest/calendar-maps-arrival-logistics.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for guest by 7.
```

### Prompt 44: Guest / PAYMENTS, TICKETS & MONEY

- **Scenarios:** 22, 23, 24, 25, 26, 27, 28 (7 total)
- **Output:** `docs/exit-evals/guest/payments-tickets-money.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the GUEST role in ChefFlow.

SOURCE FILE: docs/research/guest-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/guest-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 7 SCENARIOS from category "PAYMENTS, TICKETS & MONEY":
  22. Complete public ticket checkout
  23. Retry failed or cancelled checkout
  24. Check bank or card balance before buying
  25. Split ticket or event cost with friends
  26. Tip via informal method
  27. Resolve card dispute or refund
  28. Expense ticket or dinner cost

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the guest leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why guest leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the guest still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/guest/payments-tickets-money.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for guest by 7.
```

### Prompt 45: Guest / DIETARY, ALLERGY & HEALTH CONTEXT

- **Scenarios:** 29, 30, 31, 32, 33, 34 (6 total)
- **Output:** `docs/exit-evals/guest/dietary-allergy-health-context.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the GUEST role in ChefFlow.

SOURCE FILE: docs/research/guest-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/guest-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 6 SCENARIOS from category "DIETARY, ALLERGY & HEALTH CONTEXT":
  29. Ask a doctor about allergy seriousness
  30. Look up whether an ingredient is safe
  31. Check medication, pregnancy, or cannabis interaction
  32. Ask household member what they can eat
  33. Photograph ingredient labels for chef
  34. Clarify dietary ambiguity verbally

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the guest leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why guest leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the guest still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/guest/dietary-allergy-health-context.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for guest by 6.
```

### Prompt 46: Guest / MENU, FOOD & EXPERIENCE RESEARCH

- **Scenarios:** 35, 36, 37, 38, 39, 40 (6 total)
- **Output:** `docs/exit-evals/guest/menu-food-experience-research.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the GUEST role in ChefFlow.

SOURCE FILE: docs/research/guest-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/guest-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 6 SCENARIOS from category "MENU, FOOD & EXPERIENCE RESEARCH":
  35. Research unfamiliar dishes before picking
  36. Ask friends which menu option to choose
  37. Browse wine, cocktail, or beverage pairings
  38. Buy wine or host-provided items
  39. Save a dish idea for later home cooking
  40. Translate or explain menu language

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the guest leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why guest leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the guest still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/guest/menu-food-experience-research.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for guest by 6.
```

### Prompt 47: Guest / DINNER CIRCLE & NO-LOGIN PROFILE ACCESS

- **Scenarios:** 41, 42, 43, 44, 45, 46, 47 (7 total)
- **Output:** `docs/exit-evals/guest/dinner-circle-no-login-profile-access.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the GUEST role in ChefFlow.

SOURCE FILE: docs/research/guest-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/guest-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 7 SCENARIOS from category "DINNER CIRCLE & NO-LOGIN PROFILE ACCESS":
  41. Recover lost Circle profile token
  42. Receive Circle updates
  43. Continue a Circle conversation from email
  44. Create a community circle as anonymous visitor
  45. Invite someone by SMS
  46. Discuss sensitive guest detail privately
  47. Download or save a QR code

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the guest leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why guest leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the guest still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/guest/dinner-circle-no-login-profile-access.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for guest by 7.
```

### Prompt 48: Guest / PHOTOS, SOCIAL & MEMORY

- **Scenarios:** 48, 49, 50, 51, 52, 53 (6 total)
- **Output:** `docs/exit-evals/guest/photos-social-memory.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the GUEST role in ChefFlow.

SOURCE FILE: docs/research/guest-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/guest-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 6 SCENARIOS from category "PHOTOS, SOCIAL & MEMORY":
  48. Take event photos
  49. Edit photos before sharing
  50. Post dinner photos socially
  51. Store photos long term
  52. Share recap with friends
  53. Leave a public third-party review

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the guest leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why guest leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the guest still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/guest/photos-social-memory.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for guest by 6.
```

### Prompt 49: Guest / PROPOSAL, BOOKING & FUTURE EVENT HANDOFFS

- **Scenarios:** 54, 55, 56, 57, 58, 59 (6 total)
- **Output:** `docs/exit-evals/guest/proposal-booking-future-event-handoffs.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the GUEST role in ChefFlow.

SOURCE FILE: docs/research/guest-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/guest-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 6 SCENARIOS from category "PROPOSAL, BOOKING & FUTURE EVENT HANDOFFS":
  54. Discuss proposal with spouse/team
  55. Negotiate proposal terms verbally
  56. Sign a separate venue or company document
  57. Book again from post-action footer
  58. Compare multiple chefs after attending dinner
  59. Ask chef directly before submitting lead form

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the guest leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why guest leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the guest still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/guest/proposal-booking-future-event-handoffs.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for guest by 6.
```

### Prompt 50: Guest / SUPPORT, PRIVACY & LEGAL

- **Scenarios:** 60, 61, 62, 63, 64, 65 (6 total)
- **Output:** `docs/exit-evals/guest/support-privacy-legal.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the GUEST role in ChefFlow.

SOURCE FILE: docs/research/guest-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/guest-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 6 SCENARIOS from category "SUPPORT, PRIVACY & LEGAL":
  60. Contact support or privacy inbox
  61. Request data deletion or privacy help
  62. Read Stripe or processor terms
  63. Read guest or client legal terms
  64. Escalate safety concern
  65. Unsubscribe or recover notification preferences

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the guest leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why guest leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the guest still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/guest/support-privacy-legal.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for guest by 6.
```

---

## Wave 5: Partner (10 prompts, 56 scenarios)

### Prompt 51: Partner / ACCOUNT CLAIMING & ACCESS

- **Scenarios:** 1, 2, 3, 4, 5 (5 total)
- **Output:** `docs/exit-evals/partner/account-claiming-access.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the PARTNER role in ChefFlow.

SOURCE FILE: docs/research/partner-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/partner-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 5 SCENARIOS from category "ACCOUNT CLAIMING & ACCESS":
  1. Receive the partner invite link
  2. Ask the chef for a new invite
  3. Retrieve password from a password manager
  4. Check email for account or chef context
  5. Review partner terms with counsel

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the partner leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why partner leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the partner still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/partner/account-claiming-access.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for partner by 5.
```

### Prompt 52: Partner / PARTNER INTAKE & CHEF RELATIONSHIP SETUP

- **Scenarios:** 6, 7, 8, 9, 10 (5 total)
- **Output:** `docs/exit-evals/partner/partner-intake-chef-relationship-setup.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the PARTNER role in ChefFlow.

SOURCE FILE: docs/research/partner-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/partner-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 5 SCENARIOS from category "PARTNER INTAKE & CHEF RELATIONSHIP SETUP":
  6. Find the chef-specific partner form
  7. Confirm this is the right chef
  8. Send extra setup context to the chef
  9. Coordinate partnership terms before being added
  10. Share business documents with the chef

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the partner leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why partner leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the partner still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/partner/partner-intake-chef-relationship-setup.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for partner by 5.
```

### Prompt 53: Partner / PROFILE CONTENT & PUBLIC SHOWCASE

- **Scenarios:** 11, 12, 13, 14, 15, 16, 17 (7 total)
- **Output:** `docs/exit-evals/partner/profile-content-public-showcase.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the PARTNER role in ChefFlow.

SOURCE FILE: docs/research/partner-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/partner-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 7 SCENARIOS from category "PROFILE CONTENT & PUBLIC SHOWCASE":
  11. Find a cover image URL
  12. Edit or crop venue photos
  13. Update the partner's own website
  14. Update external booking page copy
  15. Check how public listing looks outside ChefFlow
  16. Ask chef to make profile public
  17. Ask chef to reorder or feature partner

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the partner leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why partner leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the partner still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/partner/profile-content-public-showcase.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for partner by 7.
```

### Prompt 54: Partner / LOCATION DETAILS & VENUE OPERATIONS

- **Scenarios:** 18, 19, 20, 21, 22, 23, 24 (7 total)
- **Output:** `docs/exit-evals/partner/location-details-venue-operations.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the PARTNER role in ChefFlow.

SOURCE FILE: docs/research/partner-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/partner-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 7 SCENARIOS from category "LOCATION DETAILS & VENUE OPERATIONS":
  18. Verify address or map pin
  19. Check parking/loading/access instructions
  20. Confirm venue capacity with official docs
  21. Update room availability or blackout dates
  22. Coordinate location change approval
  23. Provide new location photos
  24. Handle venue maintenance or closures

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the partner leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why partner leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the partner still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/partner/location-details-venue-operations.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for partner by 7.
```

### Prompt 55: Partner / EVENT HISTORY, ATTRIBUTION & REPORTING

- **Scenarios:** 25, 26, 27, 28, 29, 30 (6 total)
- **Output:** `docs/exit-evals/partner/event-history-attribution-reporting.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the PARTNER role in ChefFlow.

SOURCE FILE: docs/research/partner-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/partner-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 6 SCENARIOS from category "EVENT HISTORY, ATTRIBUTION & REPORTING":
  25. Verify missing or misattributed events
  26. Export contribution report for internal use
  27. Compare ChefFlow event count with venue bookings
  28. Share impact results with a manager or owner
  29. Investigate event revenue details
  30. Track referral source beyond linked events

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the partner leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why partner leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the partner still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/partner/event-history-attribution-reporting.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for partner by 6.
```

### Prompt 56: Partner / COMMISSION, PAYOUTS & MONEY

- **Scenarios:** 31, 32, 33, 34, 35, 36 (6 total)
- **Output:** `docs/exit-evals/partner/commission-payouts-money.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the PARTNER role in ChefFlow.

SOURCE FILE: docs/research/partner-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/partner-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 6 SCENARIOS from category "COMMISSION, PAYOUTS & MONEY":
  31. Check whether a commission was paid
  32. Receive actual payout
  33. Resolve payout discrepancy
  34. Reconcile tax income
  35. Confirm commission terms
  36. Send invoice to chef

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the partner leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why partner leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the partner still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/partner/commission-payouts-money.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for partner by 6.
```

### Prompt 57: Partner / COMMUNICATION & RELATIONSHIP MANAGEMENT

- **Scenarios:** 37, 38, 39, 40, 41 (5 total)
- **Output:** `docs/exit-evals/partner/communication-relationship-management.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the PARTNER role in ChefFlow.

SOURCE FILE: docs/research/partner-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/partner-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 5 SCENARIOS from category "COMMUNICATION & RELATIONSHIP MANAGEMENT":
  37. Message chef about a new referral
  38. Call chef about urgent venue issue
  39. Coordinate with venue staff
  40. Forward client/guest context
  41. Ask support for account help

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the partner leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why partner leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the partner still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/partner/communication-relationship-management.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for partner by 5.
```

### Prompt 58: Partner / REFERRAL GENERATION & EXTERNAL DISCOVERY

- **Scenarios:** 42, 43, 44, 45, 46 (5 total)
- **Output:** `docs/exit-evals/partner/referral-generation-external-discovery.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the PARTNER role in ChefFlow.

SOURCE FILE: docs/research/partner-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/partner-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 5 SCENARIOS from category "REFERRAL GENERATION & EXTERNAL DISCOVERY":
  42. Share chef referral link with a guest
  43. Promote chef on partner website
  44. Mention chef in host guidebook
  45. Track lead before it becomes inquiry
  46. Compare chef with other vendors

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the partner leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why partner leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the partner still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/partner/referral-generation-external-discovery.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for partner by 5.
```

### Prompt 59: Partner / LEGAL, PRIVACY & COMPLIANCE

- **Scenarios:** 47, 48, 49, 50, 51 (5 total)
- **Output:** `docs/exit-evals/partner/legal-privacy-compliance.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the PARTNER role in ChefFlow.

SOURCE FILE: docs/research/partner-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/partner-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 5 SCENARIOS from category "LEGAL, PRIVACY & COMPLIANCE":
  47. Review privacy or partner terms outside portal
  48. Request data deletion or profile removal
  49. Verify insurance/licensing requirements
  50. Handle incident or liability issue
  51. Approve public use of venue photos

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the partner leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why partner leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the partner still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/partner/legal-privacy-compliance.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for partner by 5.
```

### Prompt 60: Partner / DAY-OF OPERATIONS

- **Scenarios:** 52, 53, 54, 55, 56 (5 total)
- **Output:** `docs/exit-evals/partner/day-of-operations.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the PARTNER role in ChefFlow.

SOURCE FILE: docs/research/partner-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/partner-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 5 SCENARIOS from category "DAY-OF OPERATIONS":
  52. Coordinate arrival/loading day-of
  53. Check real-time traffic or directions
  54. Alert chef to last-minute venue issue
  55. Update guest-facing signage or printed materials
  56. Coordinate cleanup or house rules

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the partner leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why partner leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the partner still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/partner/day-of-operations.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for partner by 5.
```

---

## Wave 6: Vendor (7 prompts, 56 scenarios)

### Prompt 61: Vendor / INVITE, ACCOUNT & ACCESS BOUNDARIES

- **Scenarios:** 1, 2, 3, 4, 5, 6, 7 (7 total)
- **Output:** `docs/exit-evals/vendor/invite-account-access-boundaries.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the VENDOR role in ChefFlow.

SOURCE FILE: docs/research/vendor-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/vendor-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 7 SCENARIOS from category "INVITE, ACCOUNT & ACCESS BOUNDARIES":
  1. Receive the vendor invite
  2. Find a lost invite
  3. Confirm which email was invited
  4. Store or retrieve password
  5. Resolve sign-in trouble
  6. Change business user access
  7. Switch between multiple chef accounts

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the vendor leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why vendor leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the vendor still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/vendor/invite-account-access-boundaries.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for vendor by 7.
```

### Prompt 62: Vendor / CATALOG, PRICE SHEETS & PRODUCT DATA

- **Scenarios:** 8, 9, 10, 11, 12, 13, 14, 15, 16 (9 total)
- **Output:** `docs/exit-evals/vendor/catalog-price-sheets-product-data.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the VENDOR role in ChefFlow.

SOURCE FILE: docs/research/vendor-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/vendor-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 9 SCENARIOS from category "CATALOG, PRICE SHEETS & PRODUCT DATA":
  8. Update a price sheet
  9. Add new catalog items
  10. Remove discontinued items
  11. Attach spec sheets or product docs
  12. Share seasonal availability
  13. Share substitutions
  14. Confirm pack size changes
  15. Publish bulk discounts or minimums
  16. Sync full ERP catalog

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the vendor leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why vendor leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the vendor still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/vendor/catalog-price-sheets-product-data.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for vendor by 9.
```

### Prompt 63: Vendor / PURCHASE ORDER FULFILLMENT

- **Scenarios:** 17, 18, 19, 20, 21, 22, 23, 24, 25 (9 total)
- **Output:** `docs/exit-evals/vendor/purchase-order-fulfillment.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the VENDOR role in ChefFlow.

SOURCE FILE: docs/research/vendor-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/vendor-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 9 SCENARIOS from category "PURCHASE ORDER FULFILLMENT":
  17. Receive purchase orders in the normal sales workflow
  18. Accept an order with changes
  19. Reject an order
  20. Confirm partial line fulfillment
  21. Confirm delivery date changes
  22. Print or pick the order for warehouse work
  23. Assign the order to an internal driver or picker
  24. Merge multiple chef orders
  25. Handle emergency short stock

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the vendor leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why vendor leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the vendor still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/vendor/purchase-order-fulfillment.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for vendor by 9.
```

### Prompt 64: Vendor / DELIVERY, LOGISTICS & PHYSICAL FULFILLMENT

- **Scenarios:** 26, 27, 28, 29, 30, 31, 32, 33 (8 total)
- **Output:** `docs/exit-evals/vendor/delivery-logistics-physical-fulfillment.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the VENDOR role in ChefFlow.

SOURCE FILE: docs/research/vendor-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/vendor-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 8 SCENARIOS from category "DELIVERY, LOGISTICS & PHYSICAL FULFILLMENT":
  26. Route delivery
  27. Track truck status
  28. Document proof of delivery
  29. Report delivery issue
  30. Coordinate loading dock or access
  31. Handle same-day route changes
  32. Confirm cold-chain or handling details
  33. Collect signature or receiving name

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the vendor leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why vendor leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the vendor still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/vendor/delivery-logistics-physical-fulfillment.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for vendor by 8.
```

### Prompt 65: Vendor / INVOICES, PAYMENTS & ACCOUNTING

- **Scenarios:** 34, 35, 36, 37, 38, 39, 40, 41 (8 total)
- **Output:** `docs/exit-evals/vendor/invoices-payments-accounting.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the VENDOR role in ChefFlow.

SOURCE FILE: docs/research/vendor-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/vendor-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 8 SCENARIOS from category "INVOICES, PAYMENTS & ACCOUNTING":
  34. Submit an invoice
  35. Correct an invoice
  36. Send credit memo
  37. Check payment clearing
  38. Reconcile open AR
  39. Update payment terms
  40. Collect tax forms or W-9s
  41. Handle collections/escalation

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the vendor leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why vendor leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the vendor still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/vendor/invoices-payments-accounting.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for vendor by 8.
```

### Prompt 66: Vendor / COMMUNICATION, DISPUTES & RELATIONSHIP MEMORY

- **Scenarios:** 42, 43, 44, 45, 46, 47, 48, 49 (8 total)
- **Output:** `docs/exit-evals/vendor/communication-disputes-relationship-memory.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the VENDOR role in ChefFlow.

SOURCE FILE: docs/research/vendor-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/vendor-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 8 SCENARIOS from category "COMMUNICATION, DISPUTES & RELATIONSHIP MEMORY":
  42. Message the chef from the portal
  43. Respond to AI or chef supplier calls
  44. Clarify ambiguous PO notes
  45. Dispute missing/late/quality issue
  46. Negotiate pricing relationship
  47. Send marketing/new product updates
  48. Coordinate with non-chef event parties
  49. Ask for technical support

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the vendor leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why vendor leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the vendor still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/vendor/communication-disputes-relationship-memory.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for vendor by 8.
```

### Prompt 67: Vendor / COMPLIANCE, BUSINESS OPS & SUPPLIER SYSTEMS

- **Scenarios:** 50, 51, 52, 53, 54, 55, 56 (7 total)
- **Output:** `docs/exit-evals/vendor/compliance-business-ops-supplier-systems.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the VENDOR role in ChefFlow.

SOURCE FILE: docs/research/vendor-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/vendor-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 7 SCENARIOS from category "COMPLIANCE, BUSINESS OPS & SUPPLIER SYSTEMS":
  50. Review supplier legal agreement later
  51. Provide insurance/licensing certificates
  52. Maintain food safety or HACCP records
  53. Manage wholesale account setup
  54. Manage internal inventory
  55. Manage staff, routes, payroll, procurement
  56. Export relationship history for internal CRM

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the vendor leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why vendor leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the vendor still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/vendor/compliance-business-ops-supplier-systems.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for vendor by 7.
```

---

## Wave 7: Staff (9 prompts, 54 scenarios)

### Prompt 68: Staff / DAY-OF COMMUNICATION & ESCALATION

- **Scenarios:** 1, 2, 3, 4, 5, 6, 7, 8 (8 total)
- **Output:** `docs/exit-evals/staff/day-of-communication-escalation.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the STAFF role in ChefFlow.

SOURCE FILE: docs/research/staff-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/staff-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 8 SCENARIOS from category "DAY-OF COMMUNICATION & ESCALATION":
  1. Call the chef from an event briefing
  2. Text the chef about a blocked task
  3. Send a photo of a station issue
  4. Ask another staffer for help
  5. Escalate a safety incident
  6. Resolve an access or building issue
  7. Ask for clarification on chef notes
  8. Report being late or unavailable

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the staff leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why staff leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the staff still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/staff/day-of-communication-escalation.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for staff by 8.
```

### Prompt 69: Staff / MAPS, TRAVEL & ARRIVAL

- **Scenarios:** 9, 10, 11, 12, 13, 14 (6 total)
- **Output:** `docs/exit-evals/staff/maps-travel-arrival.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the STAFF role in ChefFlow.

SOURCE FILE: docs/research/staff-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/staff-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 6 SCENARIOS from category "MAPS, TRAVEL & ARRIVAL":
  9. Navigate to the event
  10. Check live traffic before leaving
  11. Find parking or loading access
  12. Coordinate rideshare or transit
  13. Get directions between prep site and event
  14. Locate a nearby store for emergency supplies

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the staff leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why staff leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the staff still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/staff/maps-travel-arrival.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for staff by 6.
```

### Prompt 70: Staff / CLOCK, PAY, BANKING & TAX

- **Scenarios:** 15, 16, 17, 18, 19, 20, 21 (7 total)
- **Output:** `docs/exit-evals/staff/clock-pay-banking-tax.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the STAFF role in ChefFlow.

SOURCE FILE: docs/research/staff-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/staff-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 7 SCENARIOS from category "CLOCK, PAY, BANKING & TAX":
  15. Confirm money was deposited
  16. Receive informal tip or reimbursement
  17. Correct a disputed time entry
  18. Submit tax forms or contractor paperwork
  19. Download pay stubs or year-end tax docs
  20. Track mileage for work
  21. Check minimum wage/overtime rules

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the staff leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why staff leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the staff still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/staff/clock-pay-banking-tax.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for staff by 7.
```

### Prompt 71: Staff / SCHEDULE, AVAILABILITY & SWAPS

- **Scenarios:** 22, 23, 24, 25, 26, 27 (6 total)
- **Output:** `docs/exit-evals/staff/schedule-availability-swaps.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the STAFF role in ChefFlow.

SOURCE FILE: docs/research/staff-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/staff-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 6 SCENARIOS from category "SCHEDULE, AVAILABILITY & SWAPS":
  22. Compare ChefFlow schedule to personal calendar
  23. Request a shift change
  24. Find someone to cover a shift
  25. Tell chef weekly availability
  26. Track personal reminders for arrival time
  27. Ask whether assignment was confirmed

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the staff leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why staff leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the staff still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/staff/schedule-availability-swaps.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for staff by 6.
```

### Prompt 72: Staff / KITCHEN EXECUTION & HARDWARE

- **Scenarios:** 28, 29, 30, 31, 32, 33 (6 total)
- **Output:** `docs/exit-evals/staff/kitchen-execution-hardware.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the STAFF role in ChefFlow.

SOURCE FILE: docs/research/staff-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/staff-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 6 SCENARIOS from category "KITCHEN EXECUTION & HARDWARE":
  28. Run active cooking timers
  29. Use a thermometer or probe app
  30. Weigh ingredients during prep
  31. Scan or print labels
  32. Check equipment instructions
  33. Play music or ambiance during service

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the staff leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why staff leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the staff still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/staff/kitchen-execution-hardware.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for staff by 6.
```

### Prompt 73: Staff / RECIPE, SOP & TRAINING REFERENCE

- **Scenarios:** 34, 35, 36, 37, 38, 39 (6 total)
- **Output:** `docs/exit-evals/staff/recipe-sop-training-reference.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the STAFF role in ChefFlow.

SOURCE FILE: docs/research/staff-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/staff-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 6 SCENARIOS from category "RECIPE, SOP & TRAINING REFERENCE":
  34. Watch a technique video
  35. Translate recipe or instruction text
  36. Ask about a vague prep step
  37. Find allergen training or safety policy
  38. Look up substitution guidance mid-prep
  39. Check company code of conduct or terms

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the staff leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why staff leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the staff still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/staff/recipe-sop-training-reference.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for staff by 6.
```

### Prompt 74: Staff / SUPPLIES, INVENTORY & EMERGENCY PURCHASING

- **Scenarios:** 40, 41, 42, 43, 44 (5 total)
- **Output:** `docs/exit-evals/staff/supplies-inventory-emergency-purchasing.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the STAFF role in ChefFlow.

SOURCE FILE: docs/research/staff-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/staff-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 5 SCENARIOS from category "SUPPLIES, INVENTORY & EMERGENCY PURCHASING":
  40. Buy missing ingredient or disposable
  41. Check store availability
  42. Photograph a receipt for reimbursement
  43. Report waste with more context
  44. Replace broken smallware or equipment

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the staff leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why staff leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the staff still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/staff/supplies-inventory-emergency-purchasing.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for staff by 5.
```

### Prompt 75: Staff / ACCOUNT, ACCESS & SUPPORT

- **Scenarios:** 45, 46, 47, 48, 49 (5 total)
- **Output:** `docs/exit-evals/staff/account-access-support.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the STAFF role in ChefFlow.

SOURCE FILE: docs/research/staff-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/staff-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 5 SCENARIOS from category "ACCOUNT, ACCESS & SUPPORT":
  45. Recover a forgotten staff password
  46. Handle revoked or expired token link
  47. Report portal bug or issue
  48. Switch to another role/account
  49. Read full legal/privacy policies

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the staff leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why staff leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the staff still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/staff/account-access-support.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for staff by 5.
```

### Prompt 76: Staff / OFFLINE, LOW-SIGNAL & DEVICE BOUNDARIES

- **Scenarios:** 50, 51, 52, 53, 54 (5 total)
- **Output:** `docs/exit-evals/staff/offline-low-signal-device-boundaries.md`
- **Status:** PENDING

```
You are evaluating exit scenarios for the STAFF role in ChefFlow.

SOURCE FILE: docs/research/staff-exit-points-analysis.md
RUBRIC: .claude/skills/exit-eval/SKILL.md (read the full 7-question rubric)
COMPANION: docs/research/staff-never-leaves-analysis.md
CODEBASE CONTEXT: Read lib/ and app/ directories relevant to each scenario.

EVALUATE THESE 5 SCENARIOS from category "OFFLINE, LOW-SIGNAL & DEVICE BOUNDARIES":
  50. Work in a kitchen with bad signal
  51. Keep a copy of briefing on phone
  52. Use shared kiosk or kitchen device
  53. Enter data while hands are dirty
  54. Continue after app error

For EACH scenario, apply the 7-question rubric IN ORDER:
1. Why does the staff leave? (operational reason, not surface)
2. What context does ChefFlow already have?
3. Is the external tool just a data source?
4. Client-collaborative angle? (what can Dinner Circle collect?)
5. Physical/analog reality?
6. Does knowledge compound over time?
7. Reclassify: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

OUTPUT FORMAT (per scenario):

## Scenario #[N]: [Title]

**Original classification:** [from source file]
**Reclassified to:** [your assessment]

**Why staff leaves:** [operational reason]
**Context ChefFlow has:** [bullet list]
**Data source?** [yes/no + which API/database]
**Client-collaborative angle:** [what Circle can collect]
**Physical reality:** [print/voice/screen/hands-free needs]
**Compounding:** [high/medium/low + why]

**Solution design:**
[2-5 bullets]

**Where it appears:**
- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the staff still leaves for]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]

---

Write ALL output to: docs/exit-evals/staff/offline-low-signal-device-boundaries.md
Mark as NEEDS-DEVELOPER-REVIEW (solo mode).
After writing, update docs/exit-system-roadmap.md: increment evaluated count for staff by 5.
```

---
