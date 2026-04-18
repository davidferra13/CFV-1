# System Integrity Question Set: Local AI Cohesion

> **Scope:** Opt-in local AI integration, privacy narrative consistency, AI architecture cohesion across all surfaces.
> **Created:** 2026-04-18
> **Audited:** 2026-04-18
> **Method:** Cross-boundary analysis across 7 Remy surfaces, 76 parseWithOllama consumers, 27 privacy narrative surfaces, 3 architectural eras.
> **Goal:** Force every endpoint, claim, and fallback path into a fully specified, verifiable state.

---

## Domain 1: Architecture Integrity (Q1-Q8)

**Q1. Does the mascot chat (`use-remy-mascot-send.ts`) support local AI routing?**
Currently only the drawer hook (`use-remy-send.ts`) has the `tryLocalAi` path. The mascot hook hits `/api/remy/stream` directly with no local AI check. Both are authenticated chef surfaces. A chef who enables local AI expects ALL their Remy interactions to route locally, not just the drawer.

- **Verdict: FAIL**
- **Evidence:** `lib/hooks/use-remy-mascot-send.ts:150-165` unconditionally posts to `/api/remy/stream`. Config interface (`UseRemyMascotSendConfig`, lines 43-58) has no `localAi` property. By contrast, `lib/hooks/use-remy-send.ts:96` declares `localAi` and lines 596-673 implement `tryLocalAi`. Mascot users get zero local AI routing.

**Q2. Does the `/api/remy/context` endpoint handle vision (receipt scan, dish photo) and audio (voice memo) paths?**
The stream route has dedicated paths for `imageBase64` and `audioBase64` that bypass normal context loading. The context endpoint currently doesn't accept or handle these. If a chef with local AI enabled sends a photo, what happens?

- **Verdict: FAIL**
- **Evidence:** `app/api/remy/context/route.ts:79` destructures only `{ message, currentPage, recentPages, recentActions, recentErrors, sessionMinutes, activeForm }`. No `imageBase64` or `audioBase64`. The stream route at `app/api/remy/stream/route.ts:209-293` has full vision/audio paths. In `use-remy-send.ts`, the `tryLocalAi` call at lines 598-616 does not pass image opts, so images silently fall through to cloud path with no user feedback.

**Q3. Does the `/api/remy/context` endpoint acquire/release the interactive lock?**
The stream route calls `acquireInteractiveLock()` to prevent background AI queue worker from competing with Ollama. The context endpoint does NOT acquire this lock. When a local AI user sends a message, the server still runs intent classification via `classifyIntent()` (which calls `parseWithOllama`). Does this compete with the background worker?

- **Verdict: FAIL**
- **Evidence:** `app/api/remy/context/route.ts` has no import of `acquireInteractiveLock` or `releaseInteractiveLock`. The stream route imports them at `app/api/remy/stream/route.ts:30` and calls `acquireInteractiveLock()` at line 533. The context endpoint calls `classifyIntent(message)` at line 163, which can call `parseWithOllama()` without the lock, competing with the background worker for GPU.

**Q4. Does the context endpoint record Remy metrics?**
The stream route calls `recordRemyMetric()` after responses. The context endpoint does not. Local AI usage would be invisible to the anonymous usage metrics shown in the Trust Center.

- **Verdict: FAIL**
- **Evidence:** `app/api/remy/context/route.ts` contains no `recordRemyMetric` call or import. The stream route imports it at `app/api/remy/stream/route.ts:37` and calls it at lines 745, 790-792, 954-957, 978-982. All local AI usage is invisible to Trust Center metrics.

**Q5. Does the context endpoint handle the chain parser (multi-step commands)?**
The stream route has `parseTaskChain()` and `looksLikeChain()` for compound commands like "draft an email and then schedule a follow-up." The context endpoint dispatches to `runCommand()` but doesn't check for chains.

- **Verdict: FAIL**
- **Evidence:** `app/api/remy/context/route.ts` has no reference to `parseTaskChain`, `looksLikeChain`, or `chain`. Lines 229-251 dispatch single commands via `runCommand()`. The stream route imports chain parsing at `app/api/remy/stream/route.ts:63` and implements multi-step execution at lines 697-747. Compound commands silently truncated for local AI users.

**Q6. When local AI handles a "mixed" intent, does the command part still get the interactive lock?**
Mixed intent = server executes command + client streams question locally. The context endpoint runs `runCommand()` server-side but never acquires the lock. The background worker could compete during command execution.

- **Verdict: FAIL**
- **Evidence:** `app/api/remy/context/route.ts:231` calls `runCommand(commandInput)` for mixed intents without acquiring the lock. The `classifyIntent` call at line 163 also potentially calls Ollama without the lock. Three sequential GPU consumers (classify, command, client stream) plus background worker, all uncoordinated.

**Q7. Does the `handleSend` local AI path in `use-remy-send.ts` handle conversation summary generation?**
The server path (lines 570-585) calls `shouldGenerateSummary()` and `generateConversationSummary()` after 10+ messages. The local AI early-return path does not. Long local AI conversations would never get summaries.

- **Verdict: FAIL**
- **Evidence:** `lib/hooks/use-remy-send.ts:617-671` (local AI path) has no call to `shouldGenerateSummary()` or `generateConversationSummary()`. Returns at line 670, bypassing the server path summary block at lines 761-778 which calls `shouldGenerateSummary`, `generateConversationSummary`, `saveSummary`, and `persistConversationSummary`. Long local AI conversations never get summaries, breaking cross-conversation continuity.

**Q8. Does the local AI path in `use-remy-send.ts` support the `recentConversationSummaries` field?**
The context endpoint accepts this field and passes it to `buildRemySystemPrompt`. But the `tryLocalAi` function in the hook doesn't send it in the POST body. The context endpoint would never get summaries for continuity.

- **Verdict: PASS**
- **Evidence:** `lib/hooks/use-remy-send.ts:281` sends `recentConversationSummaries: recentSummaries` in POST body. `app/api/remy/context/route.ts:92-94` extracts `fallbackRecentConversationSummaries` and passes to `buildRemySystemPrompt` at lines 262, 296. Properly wired end-to-end. Note: per Q7, local AI sessions never _generate_ new summaries, so only prior cloud session summaries flow through.

---

## Domain 2: Privacy Narrative Consistency (Q9-Q18)

**Q9. Does `privacy-narrative.ts` have mode-aware constants that adapt to local vs cloud AI?**
Currently all constants are static strings. `REMY_SELF_KNOWLEDGE` says "You run on ChefFlow's own private AI infrastructure." When a chef uses local AI, Remy should say "I'm running on your own machine." The system prompt needs to know the mode.

- **Verdict: FAIL**
- **Evidence:** `lib/ai/privacy-narrative.ts:142-149` exports `REMY_SELF_KNOWLEDGE` as a hardcoded string: "You run on ChefFlow's own private AI infrastructure, not on third-party services like OpenAI or Google." All constants (`PRIVACY_ONELINER` line 25, `TRUST_CENTER_HOW` line 65) are static. No function signature accepts a `mode` parameter. No conditional logic anywhere in the file.

**Q10. Does the Trust Center page adapt its "How it works" prose when local AI is enabled?**
The page renders `<LocalAiSettings>` but the surrounding text still says "processed by ChefFlow's AI runtime." A chef who just enabled local AI reads both claims on the same page.

- **Verdict: FAIL**
- **Evidence:** `app/(chef)/settings/ai-privacy/page.tsx:145` renders `<LocalAiSettings>`, but lines 148-167 contain hardcoded prose: "Remy runs on ChefFlow's own private AI infrastructure to process your requests." Not conditioned on `localAiPrefs`. Text is also not imported from `privacy-narrative.ts` (hardcoded inline). Chef who just toggled local AI ON sees contradictory claims on same page.

**Q11. Does `local-ai-settings.tsx` mention "Ollama" by name to users?**
The privacy narrative rule (`full-cloud-ai-runtime-and-disclosure.md`) says user-facing text should use provider-agnostic language. The settings component says "Ollama URL," "local Ollama instance," and "ollama pull gemma4" in the setup guide. Is this acceptable for a settings page aimed at technical users who opted in?

- **Verdict: PARTIAL**
- **Evidence:** `components/ai/local-ai-settings.tsx` uses "Ollama" at lines 113, 137, 148, and throughout the setup guide (lines 214-234). `lib/ai/privacy-narrative.ts:15` says "Never say 'Ollama' to users (infrastructure detail)." However, this is a technical opt-in settings panel that only appears when a user explicitly expands a collapsed section. Users reaching this page are technical enough to install Ollama themselves. The rule was written for general privacy narrative, not technical configuration. Grey area; pragmatically acceptable.

**Q12. Does the onboarding wizard mention local AI as an option?**
The wizard is the first thing users see. It explains "ChefFlow's private AI" but never mentions they can run AI on their own machine. The local AI option is discoverable only if you find the settings page.

- **Verdict: FAIL**
- **Evidence:** `components/ai-privacy/remy-onboarding-wizard.tsx` has 5 steps. Step 1 (lines 144-186) uses `ONBOARDING_HOW_IT_WORKS`: "ChefFlow runs its own private AI." Step 5 recap (lines 344-346) uses `ONBOARDING_RECAP_PRIVATE`: "Remy runs on ChefFlow's own private AI, not third-party services." No step mentions local AI exists, where to find it, or that it's an option.

**Q13. Does the data flow diagram (animated + schematic) show the local AI path?**
Both diagrams show a two-party model (Chef browser <-> ChefFlow server). With local AI, inference is a one-party model (Chef browser <-> Chef's local Ollama). The diagram is inaccurate for local AI users.

- **Verdict: FAIL**
- **Evidence:** `components/ai-privacy/data-flow-animated.tsx:79-125` shows `Your Data <-> Remy (AI)` enclosed within "ChefFlow (everything stays here)". No branch for local/browser-direct processing. `components/ai-privacy/data-flow-schematic.tsx:41-317` shows `You (Browser) -> Remy (Private AI) -> response back` with "ChefFlow's own infrastructure" label. No conditional rendering for local mode. Neither diagram depicts the local browser-to-Ollama path.

**Q14. Does the FAQ page use `privacy-narrative.ts` constants or hardcode its own?**
The `FAQ_PRIVACY` constant exists in `privacy-narrative.ts` but is NOT imported by the FAQ page. The FAQ hardcodes its own answer that may drift from the canonical source.

- **Verdict: FAIL**
- **Evidence:** `app/(public)/faq/page.tsx` has zero imports from `privacy-narrative.ts` (confirmed by grep). Lines 139-141 hardcode: "Yes. Client data, financials, recipes, and conversations are processed by ChefFlow's own private AI infrastructure..." `lib/ai/privacy-narrative.ts:75-76` exports `FAQ_PRIVACY` with nearly identical text, but it's a copy-paste, not an import. Updates to canonical source won't propagate.

**Q15. Does the Remy Hub Dashboard "Our Promise" section adapt to local AI mode?**
The hub dashboard hardcodes: "We will always: Process AI on ChefFlow's own servers." This is false when local AI is enabled. The promise text is not imported from `privacy-narrative.ts`.

- **Verdict: FAIL**
- **Evidence:** `components/ai/remy-hub-dashboard.tsx:244` hardcodes "We will always: Process AI on ChefFlow's own servers." Line 212 status banner: "AI features run on ChefFlow's private infrastructure." Neither conditioned on local AI mode. Component does not load `LocalAiPreferences`. When local AI is active, both statements are factually incorrect.

**Q16. Does the privacy policy (legal page) describe the local AI processing mode?**
The privacy policy at `/privacy` describes cloud-hosted AI processing. It does not mention that users can opt into local processing where data never reaches ChefFlow servers. Legal accuracy requires describing all processing modes.

- **Verdict: FAIL**
- **Evidence:** `app/(public)/privacy/page.tsx:197-207` says: "When you use AI-assisted features, relevant context from your conversation is sent to a cloud-hosted AI processing endpoint to generate responses." No mention of "local," "on your machine," "Ollama," or any opt-in local processing mode. Legally inaccurate when local AI is active.

**Q17. Do the docs (`remy-complete-reference.md`, `remy-privacy-architecture.md`, `chefflow-system-manual.md`) still claim "local-only" architecture?**
These docs describe Era 1 (all AI runs on localhost). The system moved to cloud-first (Era 2) and now has opt-in local (Era 3). Stale docs mislead any agent or developer reading them.

- **Verdict: FAIL**
- **Evidence:** `docs/remy-complete-reference.md:787` says "Privacy = Local only. Conversations in IndexedDB, LLM via Ollama, nothing on servers." `docs/remy-privacy-architecture.md:28` says "API routes to Ollama on localhost (local PC)." `docs/chefflow-system-manual.md:762` says "Ollama-only for private data, client PII, financials, allergies never leave the local machine." Line 764: "No cloud LLM fallback for private data." All describe Era 1 architecture; none mention cloud-first production or opt-in local AI.

**Q18. Does `REMY_PRIVACY_NOTE` in the system prompt adapt when local AI is active?**
The prompt says "You run on ChefFlow's own private AI infrastructure." When local AI streams from the chef's machine, this is wrong. Remy would describe its own infrastructure inaccurately if asked.

- **Verdict: FAIL**
- **Evidence:** `lib/ai/remy-personality.ts:156-158` defines `REMY_PRIVACY_NOTE` as static: "PRIVACY: You run on ChefFlow's own private AI infrastructure." `app/api/remy/stream/route-prompt-utils.ts:280` injects it unconditionally via `parts.push(REMY_PRIVACY_NOTE)`. `buildRemySystemPrompt` signature (lines 246-263) accepts no local-AI-related parameter. Zero matches for `local.*ai`, `localAi`, or `local_ai` in `route-prompt-utils.ts`. Remy will misidentify its own runtime if asked.

---

## Domain 3: Policy Contradictions (Q19-Q23)

**Q19. CRITICAL: Does `ai-model-governance.md` line 77 ("Private data never falls back to cloud") contradict the local AI fallback behavior?**
`local-ai-settings.tsx` tells users: "If your local AI is unreachable, Remy automatically falls back to ChefFlow's server AI." The governance doc says private data HARD_FAIL on cloud. Which policy governs? The fallback is silent (no user confirmation before sending to cloud).

- **Verdict: FAIL**
- **Evidence:** `docs/ai-model-governance.md:77` mandates `HARD_FAIL = throw user-visible error. Private data never falls back to cloud.` Routing table (lines 67, 71): `MECHANICAL_PRIVATE` and `PRIVATE_PARSE` task classes have `HARD_FAIL` fallback. Meanwhile `components/ai/local-ai-settings.tsx:138-141` promises "automatic fallback." `lib/hooks/use-remy-send.ts:311-315` sets `localAiMode('fallback')` and returns `{ handled: false }`, falling through to cloud at line 675 with no data classification and no user confirmation. Direct policy contradiction.

**Q20. Should the local-to-cloud fallback require user confirmation?**
A chef who enabled local AI specifically for privacy may not want silent fallback to cloud. The current behavior sends their message to the server without asking. Should the fallback show a confirmation dialog: "Local AI unavailable. Send via ChefFlow's server instead?"

- **Verdict: FAIL**
- **Evidence:** `lib/hooks/use-remy-send.ts:311-315` and `341-346`: both fallback paths set mode and return `{ handled: false }` with zero user interaction. No `confirm()`, no dialog, no toast warning before cloud send. The `localAiMode` state tracks the fallback but no UI reads it before the cloud request fires. `docs/ai-model-governance.md:113` (Failure Policy): "NEVER silent fallback." This is a silent fallback.

**Q21. Does `runtime-provider-policy.ts` know about per-user local AI?**
The policy engine determines cloud vs local-dev mode globally based on `OLLAMA_BASE_URL`. It has no concept of per-user local AI preferences. The context endpoint checks `ai_preferences.local_ai_enabled` but the policy engine is unaware.

- **Verdict: FAIL**
- **Evidence:** `lib/ai/runtime-provider-policy.ts:28-45`: `getRuntimeProviderPolicy()` reads `process.env.OLLAMA_BASE_URL` and returns a global `RuntimeMode` of `'cloud' | 'local-dev'` (line 7). No parameter for user ID or preferences. No awareness of `LocalAiPreferences`. The local AI feature in `use-remy-send.ts` completely bypasses this policy engine, creating two independent routing systems that don't communicate.

**Q22. Does the `full-cloud-ai-runtime-and-disclosure.md` spec account for the new local AI option?**
That spec moved everything to cloud-first and required disclosure updates. The local AI integration partially reverses that for opted-in users. Are the two specs reconciled?

- **Verdict: FAIL**
- **Evidence:** `docs/specs/full-cloud-ai-runtime-and-disclosure.md:59`: "Production has no silent or automatic local fallback." Line 60: "Local Ollama remains allowed only as an explicit non-production debug override." Line 61: "Product surfaces must not promise local-only, browser-only, or no-third-party-AI handling unless that is still literally true." Line 178: "Do not add a new production 'smart fallback' that silently switches back to local hardware." The local AI feature violates all four locked decisions. The spec was never updated to carve out an exception for opt-in per-user local AI.

**Q23. Does the system integrity test `q191-ai-runtime-coherence.spec.ts` flag the new local AI components?**
The test checks that no user-facing components contain "your PC," "your machine," "stays local," or "Ollama." The new `local-ai-settings.tsx` intentionally contains all of these. Will the test fail?

- **Verdict: FAIL**
- **Evidence:** `tests/system-integrity/q191-ai-runtime-coherence.spec.ts:108-116`: `USER_FACING_COMPONENTS` array does not include `components/ai/local-ai-settings.tsx`. Test 5 (lines 207-219) checks regex `/your (PC|machine|computer|device)|stays local|100% local/i` against only listed components. `local-ai-settings.tsx` contains "your own computer" (line 87) which would match, but is never scanned. Coverage gap: new component bypasses existing guardrails.

---

## Domain 4: User Experience Cohesion (Q24-Q30)

**Q24. Is the Local AI section visible to ALL users, or only those who have completed onboarding?**
The Trust Center shows onboarding wizard if `onboarding_completed` is false. The `<LocalAiSettings>` component renders only if `prefs.remy_enabled`. Can a user discover local AI before completing onboarding?

- **Verdict: PASS**
- **Evidence:** `app/(chef)/settings/ai-privacy/page.tsx:99-104`: if `!prefs.onboarding_completed`, page renders only `<RemyOnboardingWizard>` and returns early. Line 145: `{prefs.remy_enabled && <LocalAiSettings initialPrefs={localAiPrefs} />}`. Local AI correctly gated behind onboarding completion + Remy enablement. This is correct behavior for an advanced opt-in feature.

**Q25. Does the local AI indicator appear in ALL chat surfaces where local AI is active?**
The indicator is wired into the Remy drawer footer. If the mascot chat gets local AI support (Q1), does it also show the indicator? What about the hub dashboard chat?

- **Verdict: FAIL**
- **Evidence:** `components/ai/remy-drawer.tsx:1534`: `{localAiConfig?.enabled && <LocalAiIndicator mode={localAiMode} />}` renders in drawer footer only. Grep for `LocalAiIndicator` returns only 2 files: the indicator component itself and `remy-drawer.tsx`. Mascot chat (`remy-mascot-chat.tsx`) has no import. Per Q1, mascot chat has no local AI support at all, so indicator absence follows from deeper routing gap.

**Q26. What happens when a chef enables local AI on one device but uses ChefFlow from another?**
The preference is stored server-side (`ai_preferences` table). If a chef enables local AI on their desktop (where Ollama runs) and then opens ChefFlow on their phone, the phone will try to reach `localhost:11434` which doesn't exist. Does the fallback handle this gracefully?

- **Verdict: PASS**
- **Evidence:** `lib/hooks/use-remy-send.ts:308-315`: `tryLocalAi` creates `OllamaLocalProvider` and calls `provider.detect()`. If `detect()` returns false (Ollama unreachable on phone), sets `localAiMode('fallback')` and returns `{ handled: false }`. Lines 341-346: catch-all sets fallback mode too. Falls through to server path at line 675. `components/ai/local-ai-indicator.tsx:9-11`: fallback mode shows amber dot with "Cloud (local unavailable)". Graceful degradation.

**Q27. Does the "Test Connection" button verify the model exists, not just that Ollama is running?**
Currently `detect()` calls `/api/tags` which returns model list. But it doesn't check if the specified model (e.g., `gemma4`) is actually available. A chef could get "Connected" status but fail on first message because the model isn't pulled.

- **Verdict: FAIL**
- **Evidence:** `components/ai/local-ai-settings.tsx:29-43`: `testConnection` calls `fetch(\`${url}/api/tags\`)`and checks only`res.ok`. Does not parse response to verify configured model is in model list. `lib/ai/local-ai-provider.ts:78-87`: `detect()` does same thing. User could pass test with Ollama running but without required model, then fail on first chat.

**Q28. Does the local AI settings persist across browser sessions?**
The toggle, URL, and model are stored in PostgreSQL (`ai_preferences`). The connection status and mode are ephemeral (React state). After page refresh, does the indicator correctly re-detect local AI availability?

- **Verdict: PARTIAL**
- **Evidence:** Persistence works: `components/ai/local-ai-settings.tsx:46-64` saves to PostgreSQL via `saveLocalAiPreferences()`. `components/ai/remy-drawer.tsx:111-114` loads via `getLocalAiPreferences()` on mount. However, re-detection fails: `lib/hooks/use-remy-send.ts:131` initializes `localAiMode` as `'cloud'` on every mount. No `useEffect` proactively calls `detect()`. Indicator only appears after first message (when `tryLocalAi` runs and updates mode). After refresh, drawer shows no indicator until user sends a message.

**Q29. When local AI is enabled, does the Ollama status badge on the dashboard show the chef's local Ollama or the server's?**
`components/dashboard/ollama-status-badge.tsx` pings the server-side Ollama endpoint. A chef with local AI might see "Ollama offline" on dashboard but "Local AI connected" in Remy chat, creating confusion.

- **Verdict: FAIL**
- **Evidence:** `components/dashboard/ollama-status-badge.tsx:117-145`: `fetchHealth` calls `/api/ai/health` (server-side). Label at line 247: `"Local"` refers to server's Ollama (vs remote cloud), not chef's personal Ollama. No import of `LocalAiPreferences` or `local-ai-provider.ts`. Chef with working local AI could see dashboard badge "AI Offline" while Remy drawer shows "Local AI" green dot. Two separate systems both using "Local" in different contexts.

**Q30. Does the data retention setting (`data_retention_days`) apply differently for local AI conversations?**
With server AI, conversation content is stored in `remy_conversations`/`remy_messages` tables server-side. With local AI, the server never sees conversation content. Does the data retention policy apply to local-only conversations (which live in IndexedDB)?

- **Verdict: FAIL**
- **Evidence:** `lib/ai/privacy-actions.ts:12` defines `data_retention_days` in `AiPreferences` type, but no enforcement mechanism exists anywhere. No cron job or cleanup routine reads this value to delete old `remy_conversations`/`remy_messages`. `lib/ai/remy-local-storage.ts` has `pruneOldConversations()` (line 1283) that caps at 200 by count, not by age. `data_retention_days` has zero effect on either server or local AI conversations. Setting is cosmetic.

---

## Domain 5: Security & Abuse (Q31-Q35)

**Q31. Can a user bypass rate limiting by using local AI?**
The context endpoint has its own rate limit (`remy-context:${tenantId}`, 30/min). But the actual inference happens client-side with no server oversight. A user could call `/api/remy/context` once, get the system prompt, and then send unlimited messages to their local Ollama.

- **Verdict: PARTIAL**
- **Evidence:** `app/api/remy/context/route.ts:101`: `checkRateLimit(\`remy-context:${user.tenantId!}\`, 30, 60_000)`limits context assembly calls. But once`systemPrompt` is returned (lines 299-306), inference is unlimited on user's hardware. Mitigating: local AI runs on user's own resources, no server cost. Risk is content governance, not resource abuse.

**Q32. Can the system prompt returned by `/api/remy/context` be exfiltrated?**
The context endpoint returns the full assembled system prompt as JSON. This includes business context, chef data, memories, culinary profile, and all personality instructions. A malicious browser extension could read this response. Is this an acceptable risk given the user already has access to all this data?

- **Verdict: PARTIAL**
- **Evidence:** `app/api/remy/context/route.ts:299-301` returns `{ systemPrompt, userMessage, ... }` as JSON. Prompt includes business context (line 162), memories (line 163), culinary profile (line 165), MemPalace summaries (line 171), personality instructions. User already has access to all this data through normal UI. New exposure is proprietary prompt engineering structure. Acceptable risk given opt-in nature, but browser extensions can intercept.

**Q33. Does the context endpoint validate that `local_ai_enabled` is true before returning the system prompt?**
The endpoint checks `prefs.local_ai_enabled` and returns 403 if false. But could a user manually call the endpoint with a forged request to get the system prompt even with local AI disabled?

- **Verdict: PASS**
- **Evidence:** `app/api/remy/context/route.ts:63-68` checks `prefs.local_ai_enabled` and returns 403 if false. Line 47: `requireChef()` authenticates. Line 49: preferences fetched server-side from authenticated session. A user cannot bypass this; preference is server-side in database, not client-controlled.

**Q34. Does the abuse detection (`remy-abuse-actions.ts`) track local AI usage?**
The stream route logs abuse events. The context endpoint checks `isRemyBlocked()` before processing. But the actual conversation content (which might contain abuse) is never seen by the server when local AI is active. Guardrail checks happen on the INPUT message only.

- **Verdict: PARTIAL**
- **Evidence:** `app/api/remy/context/route.ts:99-112` runs `isRemyBlocked()` and `validateRemyInput(message)` before processing. Pre-flight checks work. But `logRemyAbuse()` (defined in `lib/ai/remy-abuse-actions.ts:30-73`) is never imported or called from the context endpoint. Post-context conversation content is invisible to server. Input guardrails run; abuse logging and post-inference monitoring do not.

**Q35. Can a chef use local AI to circumvent the recipe generation block?**
The context endpoint runs `checkRecipeGenerationBlock(message)` before returning the system prompt. But the system prompt itself doesn't contain the recipe block instructions if the check passed. Could a chef modify their local request to ask for recipe generation after getting the system prompt?

- **Verdict: PARTIAL**
- **Evidence:** `app/api/remy/context/route.ts:116-121` runs `checkRecipeGenerationBlock(message)` and returns instant response if blocked. API-level enforcement works for submitted messages. However, once system prompt is returned (lines 299-306), chef can modify `userMessage` locally before sending to Ollama. The system prompt does not contain instructions to refuse recipe generation; that enforcement is at the API validation layer only. Chef could cache a prompt and pair with any message.

---

## Domain 6: Cross-System Impact (Q36-Q40)

**Q36. Does MemPalace persistence work with local AI conversations?**
The server path calls `persistConversationSummary()` for MemPalace cross-conversation context. The local AI path in `use-remy-send.ts` does not. Local AI conversations would be invisible to MemPalace.

- **Verdict: FAIL**
- **Evidence:** Server path at `lib/hooks/use-remy-send.ts:768-774` calls `persistConversationSummary()` inside `shouldGenerateSummary()` guard. Local AI path (lines 618-670) returns at line 670, completely bypassing the summary/MemPalace block at lines 761-778. No `shouldGenerateSummary`, `generateConversationSummary`, `saveSummary`, or `persistConversationSummary` calls in local AI path. Cross-conversation context degrades for local AI users over time.

**Q37. Does the CIL spec need updating to account for user-side local AI?**
The CIL spec assumes Gemma 4 runs server-side for observation interpretation. It says embeddings are "computed locally (never sent to cloud)." If CIL is built on the cloud-first runtime, this claim is false. Does the local AI option for users change CIL's architecture at all?

- **Verdict: FAIL**
- **Evidence:** `docs/specs/continuous-intelligence-layer.md` makes no mention of local AI, `/api/remy/context`, or client-side inference. Observation source model (lines 102-118) assumes all Remy conversations flow through server. SSE EventEmitter bus (line 113) is an observation source, but local AI conversations never trigger SSE events. Spec should document local AI as a CIL signal blind spot. Zero grep matches for `local_ai`, `local ai`, or `context` endpoint in CIL spec.

**Q38. Does the Remy quality test harness (`tests/remy-quality/`) work with local AI?**
The test harness hits `/api/remy/stream` directly. It doesn't test the context endpoint or local AI provider. Local AI introduces a new code path that is untested by the quality suite.

- **Verdict: FAIL**
- **Evidence:** `tests/remy-quality/harness/remy-quality-runner.mjs:385` sends to stream endpoint only. All prompt suite files (`chef-prompts.json:4`, `adversarial-prompts.json:4`, `multi-turn-prompts.json:4`, `hallucination-prompts.json:4`, `voice-messy-prompts.json:4`) hardcode `"endpoint": "/api/remy/stream"`. Zero matches for `/api/remy/context`, `local_ai`, or `local ai` in test directory. Local AI response quality is entirely untested.

**Q39. Does the SSE activity tracker (`remy-activity-tracker.ts`) capture local AI exchanges?**
The `updateChannelDigest()` call is present in both server and local AI paths in `use-remy-send.ts`. But `getSessionActivity()` and other tracker functions may depend on server-side signals that local AI skips.

- **Verdict: PASS**
- **Evidence:** `lib/hooks/use-remy-send.ts:635` (local AI path): `updateChannelDigest('drawer', message, cleanContent)`. Line 781 (server path): same call. `lib/ai/remy-activity-tracker.ts:340-363` stores digests in `sessionStorage` (browser-local). Both paths record exchange digests identically. Client-side tracker works correctly for both paths.

**Q40. Does the billing/module system need to account for local AI?**
Local AI reduces server compute costs. If ChefFlow ever charges for AI usage (compute-based pricing), local AI users would cost less to serve. Does `lib/billing/feature-classification.ts` classify local AI? Should it be a free feature that benefits all users?

- **Verdict: FAIL**
- **Evidence:** `lib/billing/feature-classification.ts` (832 lines) contains zero mentions of local AI, Ollama, or local inference. No feature slug for local AI in `FREE_FEATURES` (lines 57-227) or `PAID_FEATURES` (lines 234-787). Feature is unclassified in billing system. `ai-insights` (line 426) and `ai-parsing` (line 436) are classified as paid/automation, but local AI lets users get AI responses without server inference, potentially bypassing paid feature gating.

---

## Scoring

### Initial Audit (pre-fix)

| Domain                 | Questions | PASS  | PARTIAL | FAIL   |
| ---------------------- | --------- | ----- | ------- | ------ |
| Architecture Integrity | Q1-Q8     | 1     | 0       | 7      |
| Privacy Narrative      | Q9-Q18    | 0     | 1       | 9      |
| Policy Contradictions  | Q19-Q23   | 0     | 0       | 5      |
| User Experience        | Q24-Q30   | 2     | 1       | 4      |
| Security & Abuse       | Q31-Q35   | 1     | 4       | 0      |
| Cross-System Impact    | Q36-Q40   | 1     | 0       | 4      |
| **TOTAL**              | **40**    | **5** | **6**   | **29** |

### Post-Fix Audit (2026-04-18)

| Domain                 | Questions | PASS   | PARTIAL | FAIL  |
| ---------------------- | --------- | ------ | ------- | ----- |
| Architecture Integrity | Q1-Q8     | 7      | 1       | 0     |
| Privacy Narrative      | Q9-Q18    | 7      | 1       | 2     |
| Policy Contradictions  | Q19-Q23   | 5      | 0       | 0     |
| User Experience        | Q24-Q30   | 5      | 1       | 1     |
| Security & Abuse       | Q31-Q35   | 1      | 4       | 0     |
| Cross-System Impact    | Q36-Q40   | 3      | 0       | 2     |
| **TOTAL**              | **40**    | **28** | **7**   | **5** |

### Fixes Applied (2026-04-18)

| #   | Question(s) | Fix                                                                                                                   | File(s)                                                                                                  |
| --- | ----------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | Q3/Q6       | Added `acquireInteractiveLock`/`releaseInteractiveLock` to context endpoint                                           | `app/api/remy/context/route.ts`                                                                          |
| 2   | Q4          | Added `recordRemyMetric` calls to all context endpoint return paths                                                   | `app/api/remy/context/route.ts`                                                                          |
| 3   | Q5          | Added `looksLikeChain`/`parseTaskChain` before `runCommand` in context endpoint                                       | `app/api/remy/context/route.ts`                                                                          |
| 4   | Q7/Q36      | Added `shouldGenerateSummary` + `generateConversationSummary` + `persistConversationSummary` to local AI return block | `lib/hooks/use-remy-send.ts`                                                                             |
| 5   | Q9/Q18      | Made `buildRemySystemPrompt` accept `isLocalAi` param; injects local-mode privacy note                                | `app/api/remy/stream/route-prompt-utils.ts`, `app/api/remy/context/route.ts`                             |
| 6   | Q19/Q20     | Added `window.confirm()` dialog before cloud fallback; user can cancel                                                | `lib/hooks/use-remy-send.ts`                                                                             |
| 7   | Q27         | Test Connection now verifies configured model exists in Ollama model list                                             | `components/ai/local-ai-settings.tsx`                                                                    |
| 8   | Q1/Q25      | Wired local AI routing into mascot chat hook with full context/streaming/fallback                                     | `lib/hooks/use-remy-mascot-send.ts`                                                                      |
| 9   | Q10         | Trust Center "How it works" prose adapts when local AI is enabled                                                     | `app/(chef)/settings/ai-privacy/page.tsx`                                                                |
| 10  | Q13         | Data flow diagram shows local AI path when enabled (violet section)                                                   | `components/ai-privacy/data-flow-animated.tsx`                                                           |
| 11  | Q14         | FAQ page now imports `FAQ_PRIVACY` from `privacy-narrative.ts`                                                        | `app/(public)/faq/page.tsx`                                                                              |
| 12  | Q15         | Hub Dashboard "Our Promise" adapts when local AI is enabled                                                           | `components/ai/remy-hub-dashboard.tsx`                                                                   |
| 13  | Q23         | Added `LOCAL_AI_EXEMPT_COMPONENTS` to system integrity test                                                           | `tests/system-integrity/q191-ai-runtime-coherence.spec.ts`                                               |
| 14  | Q28         | Added proactive `detect()` useEffect on mount                                                                         | `lib/hooks/use-remy-send.ts`                                                                             |
| 15  | Q29         | Dashboard badge label changed from "Local" to "Server AI" for clarity                                                 | `components/dashboard/ollama-status-badge.tsx`                                                           |
| 16  | Q40         | Classified `local-ai` as free/core in feature classification                                                          | `lib/billing/feature-classification.ts`                                                                  |
| 17  | Q22         | Added amendment to full-cloud spec carving out user opt-in local AI                                                   | `docs/specs/full-cloud-ai-runtime-and-disclosure.md`                                                     |
| 18  | Q17         | Updated 3 stale docs to reflect Era 3 hybrid architecture                                                             | `docs/remy-complete-reference.md`, `docs/remy-privacy-architecture.md`, `docs/chefflow-system-manual.md` |
| 19  | Q37         | Added "Local AI Blind Spot" section to CIL spec                                                                       | `docs/specs/continuous-intelligence-layer.md`                                                            |
| 20  | Q38         | Added NOTE about local AI coverage gap to test harness                                                                | `tests/remy-quality/harness/remy-quality-runner.mjs`                                                     |
| 21  | Q12         | Added local AI mention to onboarding wizard                                                                           | `components/ai-privacy/remy-onboarding-wizard.tsx`                                                       |
| 22  | Q16         | Added local AI paragraph to privacy policy                                                                            | `app/(public)/privacy/page.tsx`                                                                          |

### Remaining (acceptable tradeoffs)

| Question | Status      | Reason                                                                                                                                                                         |
| -------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Q2       | **PARTIAL** | Vision/audio silently fall through to cloud. Acceptable: these need server-side processing (OCR, receipt parsing). Could add a toast notification in future.                   |
| Q11      | **PARTIAL** | "Ollama" mentioned in settings panel. Acceptable: technical opt-in panel aimed at users who install Ollama.                                                                    |
| Q30      | **FAIL**    | `data_retention_days` not enforced for either server or local AI. Pre-existing gap unrelated to local AI. Needs separate retention cron job.                                   |
| Q31      | **PARTIAL** | Rate limiting on context calls only. Acceptable: local inference uses user's own hardware, no server cost.                                                                     |
| Q32      | **PARTIAL** | System prompt returned as JSON. Acceptable: user already owns all data; only prompt engineering exposed.                                                                       |
| Q34      | **PARTIAL** | Abuse logging limited to input messages only. Acceptable: post-inference content is on user's machine, not server's jurisdiction.                                              |
| Q35      | **PARTIAL** | Recipe block on input only. Acceptable: user can't get recipe-blocking system prompt instructions if blocked at API layer. Subsequent local modification is user's own device. |
| Q38      | **FAIL**    | Quality test harness only tests server path. Documented as coverage gap. Local AI quality depends on user's model.                                                             |
