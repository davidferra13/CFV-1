# Agent Brain Wiring - Reflection Document

**Date:** 2026-02-17
**Scope:** Rewrite AI correspondence engine to use agent-brain documents

---

## What Changed

### New File: `lib/ai/agent-brain.ts`

The central module that bridges the 7 agent-brain markdown documents and the AI correspondence engine. It provides three capabilities:

1. **Document Loading** - Reads agent-brain markdown files from `docs/agent-brain/` using `fs.readFileSync`. Documents are cached in memory for the lifetime of the server process. This is server-side only (enforced by `'use server'`).

2. **Lifecycle State Detection** (`detectLifecycleState()`) - A fully deterministic function that maps the codebase's three FSMs (inquiry status, quote status, event status) to the 11-state engagement lifecycle defined in `02-LIFECYCLE.md`. It also determines the email stage (discovery/pricing/booking/post_service), data completeness, pricing eligibility, and missing blocking data. This function uses zero AI -- it's pure conditional logic based on database state.

3. **Stage-Relevant Rule Selection** (`getAgentBrainForState()`) - Given a lifecycle detection result, this function selects only the relevant rules for the AI system instruction. Discovery stage gets discovery rules + brand voice. Pricing stage gets pricing rules + rate card. Booking stage gets booking rules + rate card. This prevents sending all 7 documents to the AI on every call, reducing token cost and improving instruction focus.

### Rewritten: `lib/ai/correspondence.ts`

The main `draftResponseForInquiry()` function was expanded from a simple fetch-and-call pattern to a full 12-step pipeline:

1. Fetch inquiry
2. Fetch related quote (new)
3. Fetch related event (new)
4. Build client context with repeat-client detection (new)
5. Fetch conversation thread messages (new)
6. Build calendar context (preserved)
7. Detect lifecycle state (new -- calls `detectLifecycleState()`)
8. Load agent-brain rules for detected state (new -- calls `getAgentBrainForState()`)
9. Detect conversation depth (new -- for tone shifting)
10. Build structured inquiry summary (new)
11. Generate draft via Gemini (updated call signature)
12. Post-generation validation with flags (expanded)

The return type was expanded from `{ draft, flags }` to include `lifecycleState`, `emailStage`, `missingBlocking`, `pricingAllowed`, `conversationDepth`, and `confidence`. This gives the UI enough information to display state context alongside the draft.

Post-generation validation now checks for:
- Escalation markers
- Low-confidence state detection
- Missing blocking data
- Pricing violations (dollar amounts in a discovery-stage draft)
- Forbidden phrases from `03-EMAIL_RULES.md`

The `draftSimpleResponse()` and `draftPostEventFollowUp()` function signatures are unchanged.

### Rewritten: `lib/ai/gemini-service.ts`

Two functions were rewritten:

**`generateACEDraft()`** - The function signature changed from the old manifesto/catalog/voiceFingerprint params to the new structured params that come from `correspondence.ts`. The system instruction went from 5 generic lines to a full agent-brain-powered instruction set including brand voice rules, stage-specific content rules, pricing eligibility, rate card (when allowed), safety rules, output format, and rewrite mandate. Temperature now varies by stage (0.7 for discovery warmth, 0.5 for pricing/booking precision).

**`draftChefResponse()`** - The simple response drafter also got a proper system instruction with David's voice rules and forbidden phrases, though it remains a lightweight path for non-inquiry drafts.

All other functions (`extractTasksFromChat`, `extractTechniques`, `inferEquipmentFromTechniques`, `extractKitchenSpecs`) were not touched.

---

## How It Connects to the System

### Data Flow

```
Client message arrives
        |
        v
correspondence.ts:draftResponseForInquiry()
        |
        +-- Fetches: inquiry, quote, event, client, conversation, calendar
        |
        +-- agent-brain.ts:detectLifecycleState()
        |     Pure logic: maps DB state -> lifecycle state + email stage
        |
        +-- agent-brain.ts:getAgentBrainForState()
        |     Selects rules: brand voice + stage rules + edge cases + forbidden phrases
        |     Includes rate card only when pricing is allowed
        |
        +-- gemini-service.ts:generateACEDraft()
        |     System instruction = agent-brain rules
        |     User prompt = inquiry context + thread + directives
        |
        +-- Post-validation: forbidden phrases, pricing violations, flags
        |
        v
Returns: { draft, flags, lifecycleState, emailStage, missingBlocking, ... }
        |
        v
Chef reviews and approves (UI layer, unchanged)
```

### Lifecycle State Mapping

| Lifecycle State | Codebase Trigger | Email Stage |
|----------------|-----------------|-------------|
| INBOUND_SIGNAL | inquiry.status=new, no structured data | discovery |
| QUALIFIED_INQUIRY | inquiry.status=new/awaiting_client, partial data | discovery |
| DISCOVERY_COMPLETE | inquiry.status=awaiting_chef or all core data present | pricing |
| PRICING_PRESENTED | inquiry.status=quoted or quote.status=sent | pricing |
| TERMS_ACCEPTED | quote.status=accepted or event.status=accepted | booking |
| BOOKED | event.status=paid/confirmed | booking |
| MENU_LOCKED | event.status=confirmed + menu_id present | booking |
| EXECUTION_READY | event confirmed + all prep booleans true | booking |
| IN_PROGRESS | event.status=in_progress | booking |
| SERVICE_COMPLETE | event.status=completed | post_service |
| CLOSED | completed + financially_closed + follow_up_sent + aar_filed | post_service |

### Pricing Gate

Pricing is allowed only when ALL of these are true:
1. Email stage is `pricing` or `booking` (never `discovery`)
2. Guest count is known
3. Date is known
4. Location is known

When pricing is forbidden, the rate card is not included in the AI context at all, and any dollar amounts in the output trigger a `PRICING_VIOLATION` flag.

---

## Design Decisions

1. **Deterministic lifecycle detection, not AI-driven.** The `detectLifecycleState()` function is pure conditional logic. This keeps state determination predictable and auditable. The AI only handles the creative writing step.

2. **Rule selection, not full dump.** Sending all 7 agent-brain documents every time would be wasteful and could confuse the model. Instead, we select stage-relevant rules and condense them into structured instructions.

3. **Document caching.** Agent-brain files are read once and cached in a `Map` for the server process lifetime. This avoids filesystem reads on every request while ensuring changes are picked up on server restart.

4. **Expanded return type.** The old return was just `{ draft, flags }`. The new return includes lifecycle state, missing data, pricing eligibility, and confidence. This gives the UI layer everything it needs to show contextual information alongside the draft.

5. **Post-generation validation.** The forbidden phrase check and pricing violation detection happen after the AI generates its output. This is a safety net -- the system instructions tell the AI not to include these, but we verify anyway.

6. **Conversation depth tracking.** Tone shifts based on thread depth (from `01-BRAND_VOICE.md`). First response is slightly formal; by email 3+ it's relaxed; booking stage is direct; post-service is warm.

---

## What Was NOT Changed

- `draftPostEventFollowUp()` - Still a simple string template, not AI-driven
- `extractTasksFromChat()` - Unrelated, unchanged
- `extractTechniques()` - Unrelated, unchanged
- `inferEquipmentFromTechniques()` - Unrelated, unchanged
- `extractKitchenSpecs()` - Unrelated, unchanged
- No database migrations
- No changes to auth, Supabase client, or role checks
- No changes to the agent-brain markdown documents themselves

---

## AI Policy Compliance

Per `docs/AI_POLICY.md`:
- AI drafts only -- never owns truth, never mutates canonical state
- Chef approval gate preserved (the system drafts, the chef sends)
- No lifecycle transitions, no ledger writes, no identity changes
- Pricing computation remains deterministic (AI formats but never calculates)
- Unplug test passes: remove AI entirely and the inquiry/quote/event system still functions
