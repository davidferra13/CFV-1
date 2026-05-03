# Remy Brain Dump Pipeline

> **Status:** BUILT + EXPANDED (2026-05-02) - 24 write commands, 12 intent types, staff/quotes/contracts/prep/packing/equipment
> **Priority:** P0 - this IS the workflow
> **Complexity:** Medium (plumbing, not new architecture)
> **New tables:** None
> **New AI modules:** None - reuses existing pieces

---

## The Problem

David's real workflow today: open ChatGPT, brain-dump everything about a dinner service in one wall of text. Screenshots of conversations, blurbs about the client, the menu, the prep plan, the shopping list, the timeline. ChatGPT processes it all.

Remy can't do this yet. Remy's classifier picks ONE intent per message, executes ONE command, and drops everything else. A 10-intent brain dump gets 10% processed.

## The Solution

**Multi-intent brain dump pipeline.** Remy receives a wall of text, splits it into discrete actionable intents, chains existing commands, and reports back with an action plan.

## Why This Is Achievable

Every piece already exists:

| Piece                                                | File                             | Status |
| ---------------------------------------------------- | -------------------------------- | ------ |
| Brain dump parser (extracts clients, recipes, notes) | `lib/ai/parse-brain-dump.ts`     | BUILT  |
| Intent classifier (routes to commands)               | `lib/ai/remy-classifier.ts`      | BUILT  |
| Command orchestrator (60+ executable commands)       | `lib/ai/command-orchestrator.ts` | BUILT  |
| Remy memory (cross-conversation context)             | `lib/ai/remy-memory-actions.ts`  | BUILT  |
| Remy context loader (events, clients, menus)         | `lib/ai/remy-context.ts`         | BUILT  |

**What's missing:** A pipeline that connects brain dump parser output to multi-command execution in sequence.

---

## Architecture

```
User brain dump (wall of text)
        |
        v
[1] CHUNKER - splits long input into digestible segments (~500 tokens each)
        |
        v
[2] MULTI-INTENT EXTRACTOR - expands parse-brain-dump.ts schema
    Extracts into categories:
      - event_info (date, location, guest count, type)
      - client_info (name, dietary, allergies, preferences)
      - menu_intent (dishes to make, courses, pairings)
      - shopping_items (things to buy, where to get them)
      - prep_tasks (what to prep, when, how)
      - timeline_items (day-of schedule, service order)
      - notes (general context, ideas, reminders)
        |
        v
[3] ENTITY RESOLVER - matches extracted names to existing DB records
    "the Johnsons" -> clients.id = 47
    "that risotto" -> recipes.id = 12
    "Saturday dinner" -> events.id = 203
        |
        v
[4] ACTION PLAN GENERATOR - maps intents to existing commands
    Each intent becomes a command from command-orchestrator.ts:
      - event_info -> event.create or event.update
      - client_info -> client.update (dietary, allergies)
      - menu_intent -> menu.add_dishes (search chef's recipes)
      - shopping_items -> grocery list generation
      - prep_tasks -> prep timeline / todo creation
      - timeline_items -> event timeline update
      - notes -> remy memory save
        |
        v
[5] CONFIRMATION STEP - shows chef the action plan before executing
    "Here's what I'm going to do:
     1. Update the Johnson dinner (Saturday) to 8 guests
     2. Add shellfish allergy for Mrs. Johnson
     3. Add your lobster bisque and Caesar to the menu
     4. Create shopping list for missing ingredients
     5. Save prep notes: 'sauce base day before'

     Approve all / Edit / Cancel"
        |
        v
[6] EXECUTOR - runs approved commands in sequence via command-orchestrator
    Reports results: "Done. 5/5 completed. Shopping list ready at /culinary/shopping"
```

---

## Key Design Decisions

### 1. Chunk before parsing (Gemma 4 constraint)

Gemma 4 context window is limited. Dumps over ~1000 tokens should be split into semantic chunks before extraction. Chunking is by paragraph/sentence boundary, not arbitrary token count.

### 2. Confirmation before execution (Zero Hallucination rule)

Remy NEVER silently creates/modifies data. The action plan is a draft. Chef approves, edits, or cancels. This is consistent with existing Remy philosophy ("output is DRAFT ONLY").

### 3. Entity resolution uses existing DB context

`remy-context.ts` already loads events, clients, recipes for the current chef. The resolver fuzzy-matches extracted names against this context. No new DB queries needed beyond what Remy already loads.

### 4. Graceful degradation

If Gemma 4 can't parse a chunk, that chunk goes to `unstructured` bucket and Remy says "I couldn't figure out what to do with this part: [quote]. Can you clarify?" Never silently drops information.

### 5. Single-event vs multi-event

V1: assume one dinner service per dump. If multiple events detected, Remy asks which one to focus on. V2: multi-event support.

---

## Files to Create/Modify

### New files:

- `lib/ai/remy-brain-dump-pipeline.ts` - main pipeline orchestrator (steps 1-6)
- `lib/ai/brain-dump-intent-schema.ts` - Zod schema for multi-intent extraction
- `lib/ai/brain-dump-entity-resolver.ts` - fuzzy match names to DB records
- `lib/ai/brain-dump-action-planner.ts` - maps intents to commands

### Modified files:

- `lib/ai/remy-classifier.ts` - add `brain_dump` intent detection (long messages with 3+ topics)
- `lib/ai/remy-actions.ts` - route `brain_dump` intent to pipeline instead of single command
- `lib/ai/parse-brain-dump.ts` - expand schema with event_info, shopping_items, prep_tasks, timeline_items categories
- `lib/ai/command-orchestrator.ts` - add `runCommandBatch()` for sequential multi-command execution

### No changes needed:

- All 60+ existing command executors (they already work)
- Remy memory system (already works)
- Remy context loader (already works)
- Remy personality/guardrails (already work)

---

## Detection: When Does Remy Enter Brain Dump Mode?

Trigger conditions (any of):

1. Message length > 300 characters AND contains 3+ distinct topic signals
2. Message explicitly says "brain dump" or "dump" or "everything about"
3. Message contains a mix of: names + dates + food items + action words

Topic signals: date/time words, food/ingredient words, people names, money amounts, location words, action verbs (buy, prep, make, cook, go).

The classifier already runs before command routing. Add a `brain_dump` check early in the classification pipeline.

---

## Remy UX Flow

### Input

Chef types or pastes a wall of text into Remy chat. No special syntax needed.

### Processing

Remy shows a brief "Processing your brain dump..." status. For large dumps, show incremental progress: "Found 3 clients, 2 menu items, 5 tasks..."

### Output: Action Plan Card

Remy renders a structured card (not just text) with:

- Grouped actions by category (Event, Menu, Shopping, Prep, Notes)
- Each action has a checkbox (approve/skip)
- "Run All" button at bottom
- "Edit" option to modify before running

### Post-execution

Remy reports: "Done. Here's what happened:" with links to created/updated records.

---

## Edge Cases

1. **Conflicting info** - "dinner is Saturday" + "dinner is Sunday" -> Remy asks, doesn't guess
2. **Ambiguous names** - "Sarah" matches 3 clients -> Remy asks which one
3. **Recipe mentions** - "I'll make my risotto" -> search chef's recipes, never generate
4. **No actionable content** - just venting/thinking out loud -> Remy responds conversationally, saves as memory
5. **Partial event info** - enough to update but not create -> update existing, don't create incomplete event
6. **Photos/screenshots** - V1: text only. V2: integrate with vision parsing (parse-recipe-vision.ts exists)

---

## Testing Strategy

1. **Unit test the chunker** with dumps of 100, 500, 1000, 2000 tokens
2. **Unit test entity resolver** with fuzzy name matching (exact, partial, nickname)
3. **Integration test** full pipeline with 5 real-world brain dump examples
4. **Playwright test** the action plan UI card (render, approve, execute, verify)

---

## Real-World Test Cases (from developer's actual workflow)

### Test Case 1: Full dinner brain dump

> "OK so Saturday dinner at the Vance estate, 8 guests, Aurelia said her daughter is now gluten-free, I'm thinking my braised short ribs, the Caesar but with gluten-free croutons, roasted beets from the farm, and that chocolate torte I did for the Beckhams. Need to buy short ribs, gonna check Whole Foods first. Prep the braise Thursday night, make croutons Friday, torte Friday afternoon. Oh and she wants cocktail hour apps too, maybe some crostini... wait, gluten-free, ok bruschetta on rice crackers."

Expected extraction:

- Event: Saturday, Vance estate, 8 guests
- Client update: Aurelia Vance's daughter -> gluten-free allergy
- Menu: braised short ribs, GF Caesar, roasted beets, chocolate torte, bruschetta on rice crackers
- Shopping: short ribs (Whole Foods)
- Prep timeline: braise Thu night, croutons Fri, torte Fri afternoon
- Note: cocktail hour apps needed, GF constraint on apps

### Test Case 2: Post-conversation dump

> "Just got off the phone with Jay, he wants to do another dinner in June, probably 12 people this time, same location as last time. His wife is now pescatarian. Budget around $150/head. He mentioned wanting something Mediterranean. I need to follow up with him about the exact date and send him a proposal."

Expected extraction:

- Event: June, 12 guests, same location (resolve from Jay's history), $150/head budget
- Client update: Jay's wife -> pescatarian
- Menu direction: Mediterranean theme
- Tasks: follow up on exact date, send proposal
- Note: repeat client, scaling up from last event

---

## Success Criteria

1. Chef can paste a 500-word brain dump into Remy and get a complete action plan in <10 seconds
2. Zero data created without chef approval (confirmation step is mandatory)
3. Entity resolution correctly matches >90% of name references to existing records
4. No information silently dropped - everything classified or flagged as unstructured
5. Works fully on Gemma 4 (no cloud AI dependency)
6. Existing single-intent messages still work exactly as before (no regression)
