# Prompt 4: Chef / RECIPE & CULINARY RESEARCH

> Wave 1 | 6 scenarios | Output: `docs/exit-evals/chef/recipe-culinary-research.md`

---

You are evaluating exit scenarios for the **CHEF** role in ChefFlow.

## Source Files

- **Scenarios:** `docs/research/chef-exit-points-analysis.md`
- **Rubric:** `.claude/skills/exit-eval/SKILL.md` (read the full 7-question rubric)
- **Companion:** `docs/research/chef-never-leaves-analysis.md` (what already stays in-app)
- **Codebase:** Read `lib/` and `app/` directories relevant to each scenario

## Scenarios to Evaluate

Category: **RECIPE & CULINARY RESEARCH**

- **#19:** Look up a technique or method
- **#20:** Find recipe inspiration for a menu
- **#21:** Research a cuisine they're less familiar with
- **#22:** Check nutritional info for a dish
- **#23:** Verify food safety temps/times
- **#24:** Find a substitute ingredient

## Rubric (Apply to Each Scenario IN ORDER)

1. **Why does the chef leave?** Operational reason, not surface. What decision or action requires the external tool?
2. **What context does ChefFlow already have?** Event date/time/location, client data, menu items, recipes, ingredients, past events, financial data, region info.
3. **Is the external tool just a data source?** If yes (API, database, static reference), ChefFlow should drink from that source. The chef never visits it.
4. **Client-collaborative angle?** Does the client/guest/partner know something the chef would otherwise hunt for? Can Dinner Circle collect it?
5. **Physical/analog reality?** Would print solve this? Is voice (Remy) the natural interface? Messy hands? Loud kitchen? Large text for glance moments?
6. **Does knowledge compound?** High: venue profiles, client preferences, seasonal patterns (capture once, serve forever). Low: one-off calculations.
7. **Reclassify:** One of: Reducible | Reducible + Client-Collaborative | Partially Reducible | Bridgeable | Permanent

## Output Format (Per Scenario)

Write this exact structure for each of the 6 scenarios:

```markdown
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

- [2-5 bullets of what to build]

**Where it appears:**

- [surface 1]
- [surface 2]

**What remains as permanent exit:**
[What the chef still leaves for even after we build this]

**Priority:** [pain frequency] x [effort] = [rank signal]
**Spec needed?** [yes/no]
```

## Post-Evaluation Checklist

1. Write ALL output to: `docs/exit-evals/chef/recipe-culinary-research.md`
2. Mark every scenario as `NEEDS-DEVELOPER-REVIEW` (solo mode, no chef input)
3. At the bottom of the output file, add a summary table:

```markdown
## Batch Summary

| #   | Title | Reclassified To | Spec Needed? |
| --- | ----- | --------------- | ------------ |
| N   | Title | Classification  | yes/no       |
```

4. Update `docs/exit-system-roadmap.md`: increment the evaluated count for chef by 6
5. If any scenario is Reducible and complex enough for a standalone spec, write it to `docs/specs/` and note the filename in the summary
