# Recipe Generation Ban — AI Policy Enforcement

**Date:** 2026-02-27
**Status:** Permanent, non-negotiable
**Rule:** AI must NEVER generate, fabricate, suggest, or pull recipes from anywhere.

---

## The Rule

Recipes are the chef's creative work and intellectual property. AI (Remy, Ollama, any LLM) has zero role in authoring, suggesting, or retrieving recipes. The only allowed interaction is searching the chef's own recipe book (read-only lookup of recipes they manually entered).

## What AI CAN Do

- **Search** the chef's existing recipe book (`recipe.search` — Supabase query, no LLM involved)
- **Cost** recipes (grocery pricing, ingredient cost lookups — math)
- **Scale** recipes (multiply quantities — math)
- **Discuss** food, culinary techniques, food culture (conversation, not recipe writing)

## What AI CANNOT Do

- Generate or fabricate a recipe from scratch
- Pull or suggest recipes from the internet or training data
- Create recipe instructions, methods, or ingredient lists
- Draft recipe content for chef review
- Add or modify ingredients via AI
- Suggest "what to make" or "what to cook"
- Search the web for recipes
- Auto-fill recipe fields from natural language descriptions

## Enforcement Layers (6 total)

### Layer 1 — Input Validation (earliest, cheapest)

**File:** `lib/ai/remy-input-validation.ts`

- `checkRecipeGenerationBlock()` runs regex patterns against the user's message
- Catches: "create a recipe", "recipe for X", "how to cook X", "suggest a meal", etc.
- Fires before any LLM call — zero compute cost, instant rejection
- Returns a friendly Remy-voiced refusal, not an error

### Layer 2 — Stream Route (request handler)

**File:** `app/api/remy/stream/route.ts`

- Calls `checkRecipeGenerationBlock()` after input validation, before intent classification
- Returns the refusal as a `token` + `done` SSE pair (feels like Remy chatting, not an error)

### Layer 3 — LLM System Prompt (behavioral)

**File:** `lib/ai/remy-personality.ts`

- `REMY_PERSONALITY` BOUNDARIES section: explicit "GENERATE RECIPES" ban
- `REMY_TOPIC_GUARDRAILS` refusal list: recipe generation is first item, with redirect text
- Web search section: explicitly says "NEVER search for recipes"
- Culinary discussion section: "you can TALK about food all day, but you never WRITE recipes"

### Layer 4 — Restricted Actions (agent action registry)

**File:** `lib/ai/agent-actions/restricted-actions.ts`

- `agent.create_recipe` — permanently restricted (Tier 3, never executes)
- `agent.update_recipe` — permanently restricted
- `agent.add_ingredient` — permanently restricted
- Each returns a clear explanation and directs to manual recipe entry

### Layer 5 — Web Search Guard (runtime block)

**File:** `lib/ai/command-orchestrator.ts`

- `executeWebSearch()` checks the query against `WEB_RECIPE_BLOCK_PATTERN`
- Blocks queries containing "recipe", "how to cook", "meal plan", "what to make", etc.
- Returns empty results with a blocked message

### Layer 6 — Task Descriptions (LLM guidance)

**File:** `lib/ai/command-task-descriptions.ts`

- `recipe.search` description: "Search the chef's existing recipe book... NEVER generates, fabricates, or suggests new recipes"
- `web.search` description: "NEVER use this to search for recipes"
- Removed "recipes online" from web search description

## Dead Code Removed

- `lib/ai/agent-actions/recipe-actions.ts` — gutted, exports empty array
- Import removed from `lib/ai/agent-actions/index.ts`
- All recipe generation code (parseRecipeFromNL, parseIngredientFromNL, executor/commit functions) deleted

## Additional Security Improvements (same session)

- **Expanded injection detection** in `lib/ai/remy-guardrails.ts`:
  - Bracket-style tag injection (`[SYSTEM]`, `[[instruction]]`)
  - Delimiter injection (` ```system`, ` ```admin`)
- **`recipe.search` verified safe** — calls `getRecipes()` which is a direct Supabase query scoped to the chef's tenant. No LLM, no internet, no hallucination risk.

## Testing

To verify the ban works:

1. Ask Remy "create a recipe for pasta" — should get friendly refusal
2. Ask Remy "how to cook salmon" — should get friendly refusal
3. Ask Remy "suggest a meal for tonight" — should get friendly refusal
4. Ask Remy "search my recipes for salmon" — should work (searches existing recipe book)
5. Ask Remy "what recipes do I have?" — should work (searches existing recipe book)
