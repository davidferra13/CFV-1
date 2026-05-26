# Prompt 58: Partner / REFERRAL GENERATION & EXTERNAL DISCOVERY

> Wave 5 | 5 scenarios | Output: `docs/exit-evals/partner/referral-generation-external-discovery.md`

---

You are evaluating exit scenarios for the **PARTNER** role in ChefFlow.

## Source Files

- **Scenarios:** `docs/research/partner-exit-points-analysis.md`
- **Rubric:** `.claude/skills/exit-eval/SKILL.md` (read the full 7-question rubric)
- **Companion:** `docs/research/partner-never-leaves-analysis.md` (what already stays in-app)
- **Codebase:** Read `lib/` and `app/` directories relevant to each scenario

## Scenarios to Evaluate

Category: **REFERRAL GENERATION & EXTERNAL DISCOVERY**

- **#42:** Share chef referral link with a guest
- **#43:** Promote chef on partner website
- **#44:** Mention chef in host guidebook
- **#45:** Track lead before it becomes inquiry
- **#46:** Compare chef with other vendors

## Rubric (Apply to Each Scenario IN ORDER)

1. **Why does the partner leave?** Operational reason, not surface. What decision or action requires the external tool?
2. **What context does ChefFlow already have?** Event date/time/location, client data, menu items, recipes, ingredients, past events, financial data, region info.
3. **Is the external tool just a data source?** If yes (API, database, static reference), ChefFlow should drink from that source. The partner never visits it.
4. **Client-collaborative angle?** Does the client/guest/partner know something the partner would otherwise hunt for? Can Dinner Circle collect it?
5. **Physical/analog reality?** Would print solve this? Is voice (Remy) the natural interface? Messy hands? Loud kitchen? Large text for glance moments?
6. **Does knowledge compound?** High: venue profiles, client preferences, seasonal patterns (capture once, serve forever). Low: one-off calculations.
7. **Reclassify:** One of: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

## Output Format (Per Scenario)

Write this exact structure for each of the 5 scenarios:

```markdown
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

- [2-5 bullets of what to build]

**Where it appears:**

- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the partner still leaves for even after we build this]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]
```

## Post-Evaluation Checklist

1. Write ALL output to: `docs/exit-evals/partner/referral-generation-external-discovery.md`
2. Mark every scenario as `NEEDS-DEVELOPER-REVIEW` (solo mode, no chef input)
3. At the bottom of the output file, add a summary table:

```markdown
## Batch Summary

| #   | Title | Reclassified To | Spec Needed? |
| --- | ----- | --------------- | ------------ |
| N   | Title | Classification  | yes/no       |
```

4. Update `docs/exit-system-roadmap.md`: increment the evaluated count for partner by 5
5. If any scenario is Reducible and complex enough for a standalone spec, write it to `docs/specs/` and note the filename in the summary
