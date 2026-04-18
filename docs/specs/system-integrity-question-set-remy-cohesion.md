# System Integrity Question Set: Remy Cohesion & Gemma 4 Migration

> **Sweep 9 of N** | 40 binary pass/fail questions across 8 domains
> Executed: 2026-04-18 | Executor: Claude Code (Opus 4.6)
> Focus: model migration, workflow actions, prompt compression, fast-path routing, Focus Mode, result formatting
> Prerequisite: Sweep 8 (AI & Remy System, 50 questions)

---

## Methodology

1. Map: trace every connection between fast-paths, action registry, Focus Mode filter, result formatters, and SSE client handlers
2. Design: 40 binary pass/fail questions exposing disconnects, dead ends, and silent failures
3. Execute: answer each question with evidence (file path + line number)
4. Fix: all actionable gaps
5. Verify: no regressions

---

## Domain A: Model Migration Integrity (5 questions)

### A1. Do ALL production Ollama calls resolve to gemma4, with zero qwen3 references in runtime code?

**PASS** - [providers.ts:11](lib/ai/providers.ts#L11): `getOllamaConfig()` returns `process.env.OLLAMA_MODEL || 'gemma4'`. All three model tiers (fast/standard/complex) default to gemma4. Zero `qwen3` references in any file under `lib/ai/` or `app/api/remy/`. Stale qwen3 references exist only in docs (non-runtime).

### A2. Is the ThinkingBlockFilter compatible with Gemma 4 output format (no false-positive stripping)?

**PASS** - [route-runtime-utils.ts:698-756](app/api/remy/stream/route-runtime-utils.ts#L698-L756): Filter strips `<think>...</think>` blocks. Gemma 4 emits these when `think: true` is passed (correct behavior). When `think: false`, no thinking blocks emitted, filter acts as passthrough with 7-char buffer. Edge case: literal `<think>` in response text would be stripped, but this is astronomically unlikely in chef-ops context.

### A3. Does the streaming route avoid setting `num_ctx` (which causes 170s KV cache hang on RTX 3050)?

**PASS** - [route.ts:886-898](app/api/remy/stream/route.ts#L886-L898): Only `num_predict`, `keep_alive`, `think`, and `stream` are set. No `num_ctx`. Comment at [providers.ts:65-68](lib/ai/providers.ts#L65-L68) documents the hang issue.

### A4. Does `shouldUseThinking()` correctly gate thinking mode by scope (never for minimal, always for full)?

**PASS** - [route.ts](app/api/remy/stream/route.ts): `useThinking` is true for full scope always; for focused scope, only when message matches complexity patterns (financials, analysis, strategy, "why" questions). Always false for minimal scope. Gemma 4 supports `think: true` natively.

### A5. Are there any hardcoded model names (not env-var backed) in the streaming route?

**PASS** - [route.ts](app/api/remy/stream/route.ts): All model references go through `routeForRemy()` which calls `getModelForEndpoint()` from `providers.ts`. No hardcoded model strings in the route file.

---

## Domain B: Deterministic Fast-Path Routing (5 questions)

### B1. Does every fast-path `taskType` have a matching handler in `executeSingleTask`?

**PASS** - All 29 fast-path patterns emit taskTypes that exist either as switch cases in `executeSingleTask` or as registered agent actions (via `getAgentAction()`). Verified: `event.list_upcoming`, `client.search`, `calendar.availability`, `finance.summary`, `recipe.search`, `inquiry.list_open`, `draft.thank_you`, `email.followup`, `email.generic`, `briefing.morning`, `agent.create_event`, `email.inbox_summary`, `staff.availability`, `web.search`, `finance.pnl`, `ops.packing_list`, `agent.complete_todo`, `agent.start_timer`, `agent.stop_timer`, `agent.set_food_budget`, `agent.create_goal`, `agent.shopping_list`, `agent.recipe_dietary_check`, `agent.mark_followup`, `goals.dashboard`, `tasks.list`, `tasks.overdue`, `nudge.list`, `nav.go`.

### B2. Does every fast-path `taskType` have a dedicated result formatter (not falling to generic "completed successfully")?

**PASS** - After fix: all 29 fast-path taskTypes now have dedicated formatters in `summarizeTaskResults()`. Added formatters for `email.inbox_summary`, `email.followup`, `finance.pnl`, and `tasks.overdue` in this session. Agent action results use `{ success, message }` pattern which is always formatted.

### B3. Do patterns 23, 26, 28 (apparent duplicates of 9, 12, 11) catch genuinely different phrasings?

**PASS** - Pattern 9 catches "brief me", "morning briefing". Pattern 23 catches "what's on my plate", "what should I do today". Pattern 12 catches "who's available" with apostrophe variations. Pattern 26 catches simpler "staff availability" form. Pattern 11 catches "show my inbox", "recent emails". Pattern 28 catches "check my emails", "any new emails". These are complementary catchment nets, not true duplicates.

### B4. Does the nav fast-path pass `inputs.route` (not `inputs.destination`) to match what `executeNavGo` reads?

**PASS** - [command-orchestrator.ts:2782](lib/ai/command-orchestrator.ts#L2782): Pattern 29 passes `inputs: { route: target }`. Fixed from `inputs: { destination: target }` earlier in this session.

### B5. Does the dietary safety fast-path correctly exclude write intents (create client, update profile)?

**PASS** - [command-orchestrator.ts:2816-2818](lib/ai/command-orchestrator.ts#L2816-L2818): `hasWriteIntent` check blocks the dietary fast-path when the message contains create/add/update + client/profile/record. Prevents "create a client with nut allergy" from being misrouted as a dietary lookup.

---

## Domain C: Focus Mode Coherence (5 questions)

### C1. Does every Focus Mode allow-list entry match an actual `taskType` in executeSingleTask or the agent action registry?

**PASS** - After fix: all 28 entries in `FOCUS_MODE_ACTIONS` use exact taskType strings from the switch statement or agent action registry. Fixed 15 mismatched entries (e.g., `event.list` -> `event.list_upcoming`, `client.detail` -> `client.details`, `inquiry.list` -> `inquiry.list_open`).

### C2. Does Focus Mode correctly pass through ALL registered agent actions when disabled?

**PASS** - [remy-action-filter.ts:77](lib/ai/remy-action-filter.ts#L77): `if (!focusMode) return allActions` returns the full unfiltered list. No actions are dropped when Focus Mode is off.

### C3. Does Focus Mode correctly bypass for privileged users (VIP, Admin, Owner)?

**PASS** - [remy-action-filter.ts:76](lib/ai/remy-action-filter.ts#L76): `if (privileged) return allActions` checks `isEffectivePrivileged()` first. Privileged users always get all actions regardless of Focus Mode state.

### C4. Are the two async checks (privileged + focus mode) parallelized?

**PASS** - [remy-action-filter.ts:75](lib/ai/remy-action-filter.ts#L75): `const [privileged, focusMode] = await Promise.all([...])`. Both checks run concurrently.

### C5. Does Focus Mode include all 7 new workflow actions?

**PASS** - [remy-action-filter.ts:50-57](lib/ai/remy-action-filter.ts#L50-L57): `agent.complete_todo`, `agent.start_timer`, `agent.stop_timer`, `agent.set_food_budget`, `agent.create_goal`, `agent.mark_followup`, `agent.shopping_list`, `agent.recipe_dietary_check` all present in the allow-list.

---

## Domain D: Workflow Action Integrity (5 questions)

### D1. Do ALL 7 workflow action imports resolve to real exported functions?

**PASS** - All verified by agent audit: `toggleTodo` (lib/todos/actions.ts:81), `startEventActivity` (lib/events/actions.ts:931), `stopEventActivity` (lib/events/actions.ts:1017), `setEventFoodCostBudget` (lib/events/actions.ts:1187), `createGoal` (lib/goals/actions.ts:119), `markFollowUpSent` (lib/events/actions.ts:838), `getMenuShoppingList` (lib/menus/actions.ts:1990), `analyzeRecipeDietaryCompatibility` (lib/recipes/actions.ts:2258).

### D2. Are all 7 workflow actions set to tier 2 (chef approval required before commit)?

**PASS** - [workflow-actions.ts](lib/ai/agent-actions/workflow-actions.ts): All 7 actions use `approvalTier: 2` and have both `executor` (preview) and `commitAction` (on approval) methods.

### D3. Does the approval flow in `approveTask` correctly route agent actions through `commitAction`?

**PASS** - [command-orchestrator.ts:2980+](lib/ai/command-orchestrator.ts): `approveTask()` calls `getAgentAction(taskType)`, validates policy, runs audit trail, then calls `agentAction.commitAction(payload)`. Error handling wraps the entire flow.

### D4. Does the client-side `AgentConfirmationCard` render preview fields for workflow actions?

**PASS** - [remy-task-card.tsx](components/ai/remy-task-card.tsx): When `task.preview` is present, renders `<AgentConfirmationCard>` with fields, warnings, safety level, and approve/reject buttons. All workflow actions return `preview` from their `executor`.

### D5. Does the conversational follow-through ("yes", "do it") correctly auto-approve pending workflow actions?

**PASS** - [use-remy-send.ts:299-358](components/ai/use-remy-send.ts#L299-L358): Affirmative patterns trigger `approveTask()` for each pending task from the last Remy message. Works for all task types including new workflow actions.

---

## Domain E: Prompt Assembly Coherence (5 questions)

### E1. Does the compressed personality prompt retain ALL hard rules (recipe ban, privacy, topic guardrails)?

**PASS** - [remy-personality.ts](lib/ai/remy-personality.ts): `REMY_PERSONALITY` contains explicit "NEVER create, generate, or suggest recipes" rule. `REMY_TOPIC_GUARDRAILS` enforces topic boundaries. `REMY_ANTI_INJECTION` blocks jailbreaks. `REMY_PRIVACY_NOTE` covers data privacy. All critical rules survived compression.

### E2. Is `REMY_SPEED_EXPLANATION` only injected when the user's message references latency/speed?

**PASS** - [route-prompt-utils.ts](app/api/remy/stream/route-prompt-utils.ts): Gated by `/\b(?:slow|speed|fast|lag|delay|wait|long|forever|taking)\b/i.test(userMessage)`. Only fires on relevant messages, saving ~47 tokens per non-latency request.

### E3. Is `NAV_ROUTE_MAP` included when the user asks for navigation, even in focused scope?

**PASS** - [route-prompt-utils.ts](app/api/remy/stream/route-prompt-utils.ts): Included when `includeOperationalContext` (full scope) OR when `userMessage` matches `/\b(?:go to|navigate|where|page|find|open|show me)\b/i`. Focused scope with nav intent gets the map.

### E4. Are there context fields loaded from DB but never injected into the prompt (wasted queries)?

**FAIL** - 4 fields loaded every non-minimal request but never referenced in `buildRemySystemPrompt()`: `serviceConfigPrompt` (DB query for service config), `recentSurveyFeedback` (DB query for 5 recent surveys), `pendingMilestones` (DB query for 10 pending milestones), `autoResponseStatus` (2 parallel DB queries for auto-response config + template count). Total: 4 unnecessary DB queries per non-minimal request. `costingContext` is free (computed from archetype, no DB call).

### E5. Are `chefCity` and `chefState` available for seasonal/regional context in the prompt?

**FAIL** - Fields loaded from chef profile (free, same row) but `buildRemySystemPrompt()` never references `context.chefCity` or `context.chefState`. Location data could improve seasonal produce suggestions, regional vendor recommendations, and weather-aware prep advice.

---

## Domain F: SSE Stream & Client Handling (5 questions)

### F1. Are ALL SSE event types emitted by the server handled by the client-side stream parser?

**PASS** - Server emits: `intent`, `token`, `tasks`, `nav`, `memories`, `error`, `done`. Client `parseRemyStream` (lib/ai/remy-stream-parser.ts) has handlers for all 7 event types. No unhandled events.

### F2. Does the command path emit task results as structured `tasks` SSE events (not just text)?

**PASS** - [route.ts:695-794](app/api/remy/stream/route.ts#L695-L794): `runCommand()` results mapped to `RemyTaskResult[]` and emitted as `{ type: 'tasks', data: tasks }`. Human-readable summary also streamed as `token` events via `summarizeTaskResults()`.

### F3. Does `summarizeTaskResults` handle the `pending` status with inline draft text?

**PASS** - [route-runtime-utils.ts:91-104](app/api/remy/stream/route-runtime-utils.ts#L91-L104): Pending tasks with `draftText` inline the full draft into the stream. Tasks without drafts show "check the card below."

### F4. Does the `ollamaOffline` flag from `runCommand` correctly surface as an SSE error?

**PASS** - [route.ts](app/api/remy/stream/route.ts): `OllamaOfflineError` caught specifically, returns `{ ollamaOffline: true }` from `runCommand`, which triggers `sseErrorResponse()` with a user-friendly message.

### F5. Does the mixed intent path (command + conversation) execute commands before streaming the LLM response?

**PASS** - [route.ts:800-820](app/api/remy/stream/route.ts#L800-L820): Commands execute first via `runCommand()`, task results emitted, then LLM streams conversational response. Order is deterministic.

---

## Domain G: Action Suggestion & Follow-Through (5 questions)

### G1. Do deterministic action suggestions cover all 7 new workflow action types?

**PASS** - [route-runtime-utils.ts](app/api/remy/stream/route-runtime-utils.ts): `suggestFollowUpActions()` includes rules for: prep/timer start, todo completion, goal creation, food budget setting, and more. All 7 workflow categories have at least one suggestion trigger.

### G2. Do `remy:` prefixed nav suggestions correctly trigger new Remy commands (not page navigation)?

**PASS** - [remy-drawer.tsx:1264-1271](components/ai/remy-drawer.tsx#L1264-L1271): `nav.href.startsWith('remy:')` renders a `<button>` that calls `handleSend(nav.href.slice(5))`, sending the text as a new Remy message. Regular hrefs render as `<Link>` for page navigation.

### G3. Does `extractNavSuggestions()` correctly parse LLM-generated `NAV_SUGGESTIONS: [...]` JSON?

**PASS** - [route.ts](app/api/remy/stream/route.ts): Regex extracts JSON array after `NAV_SUGGESTIONS:`, parsed with `JSON.parse`. Wrapped in try/catch, falls through to deterministic suggestions on parse failure.

### G4. Are action suggestions only emitted when the LLM didn't already include nav suggestions?

**PASS** - [route.ts:934-950](app/api/remy/stream/route.ts#L934-L950): `suggestFollowUpActions()` only called when `extractNavSuggestions(fullResponse)` returns empty/null. No double-suggestion.

### G5. Does the `default` case in `executeSingleTask` return a clear error (not silently succeed)?

**PASS** - [command-orchestrator.ts:2084](lib/ai/command-orchestrator.ts#L2084): Default returns `status: 'held'` with message `"<taskType>" is not currently supported. Try rephrasing your request.` User sees actionable feedback, not silence.

---

## Domain H: Cross-System Cohesion (5 questions)

### H1. Does `getAvailableActions()` affect BOTH the LLM prompt (available actions list) AND task execution (post-parse filter)?

**PARTIAL** - Focus Mode filters available actions before the LLM sees them (prompt assembly). BUT: deterministic fast-paths bypass `getAvailableActions()` entirely because they skip LLM classification. A Focus Mode user typing "mark todo done" hits the fast-path and executes `agent.complete_todo` regardless of Focus Mode state. This is currently harmless (all fast-path workflow actions are in the allow-list anyway), but it's an architectural gap: Focus Mode is not enforced on deterministic paths.

### H2. Is the `approveTask` default case (line ~3160) reachable, and if so, does it correctly no-op?

**PASS** - The default returns `{ success: true, message: 'Approved.' }` but is unreachable in practice: `executeSingleTask` only returns `pending` for agent actions (which have explicit `commitAction` handlers) and legacy email/event types (which have explicit handlers in `approveTask`). No task can reach `pending` status without a corresponding commit path.

### H3. Is the agent action registry (`registerAgentActions`) called exactly once at module load time?

**PASS** - [agent-actions/index.ts](lib/ai/agent-actions/index.ts): `registerAgentActions()` called at module top level. Module imported by `command-orchestrator.ts`. All action registrations (including the 7 new workflow actions) are synchronous and complete before any command processing.

### H4. Does the security guardrail in `executeSingleTask` block unregistered `agent.*` taskTypes?

**PASS** - [command-orchestrator.ts:1338-1352](lib/ai/command-orchestrator.ts#L1338-L1352): After agent action lookup fails, checks `task.taskType.includes('agent.')` and returns error status. Prevents LLM hallucination of fake agent actions.

### H5. Do ALL Remy surfaces (operator chat, client chat, public widget) use the same model provider?

**PASS** - All three call through `getOllamaConfig()` or `getModelForEndpoint()` from `providers.ts`. All resolve to gemma4. No surface has a hardcoded model override.

---

## Score Summary

| Domain                | Score | Notes                                                                         |
| --------------------- | ----- | ----------------------------------------------------------------------------- |
| A: Model Migration    | 5/5   | Clean migration, no qwen3 remnants                                            |
| B: Fast-Path Routing  | 5/5   | All paths connected, all formatters present                                   |
| C: Focus Mode         | 5/5   | After fix: all 28 entries match real taskTypes                                |
| D: Workflow Actions   | 5/5   | All imports resolve, approval flow intact                                     |
| E: Prompt Assembly    | 3/5   | 4 wasted DB queries, unused location data                                     |
| F: SSE Stream         | 5/5   | All events handled, correct ordering                                          |
| G: Action Suggestions | 5/5   | Complete coverage, no double-suggestions                                      |
| H: Cross-System       | 4/5   | Focus Mode not enforced on fast-paths (architectural gap, currently harmless) |

**Total: 37/40 (92.5%)**

---

## Actionable Gaps

### GAP 1: Wasted Context Queries (E4) - Priority: P2

4 DB queries per non-minimal request with results discarded:

- `recentSurveyFeedback`: 1 query (post_event_surveys)
- `pendingMilestones`: 1 query (event_payment_milestones)
- `autoResponseStatus`: 2 queries (auto_response_config + response_templates)

**Fix:** Either wire into prompt builder or stop loading. Survey feedback and milestones are actionable context worth wiring. Auto-response status is low value.

### GAP 2: Unused Location Data (E5) - Priority: P3

`chefCity` and `chefState` loaded for free but never used in prompt. Could improve seasonal suggestions and regional vendor awareness.

**Fix:** Add location line to business context section in `buildRemySystemPrompt()`.

### GAP 3: Focus Mode Not Enforced on Deterministic Fast-Paths (H1) - Priority: P3

Deterministic fast-paths bypass `getAvailableActions()`. Currently safe because all fast-path workflow actions are in the Focus Mode allow-list, but a future fast-path that emits a non-allowed action would bypass Focus Mode.

**Fix:** Add `FOCUS_MODE_ACTIONS.has(plan.tasks[0].taskType)` check before returning fast-path result in `runCommand()`. Low priority since fast-paths only exist for core actions that should always be available.
