# Remy Improvement Roadmap (Complete & Final)

> This is the COMPLETE list of everything that can make Remy better.
> Built from: line-by-line codebase audit + market research across r/LocalLLaMA, Hacker News,
> engineering blogs, arxiv papers, and production AI assistant case studies.
> If it's not on this list, it doesn't exist. No more "oh yeah, one more thing."
> Updated: 2026-03-08

---

## Hard Constraints (Can't Change)

- **Privacy** - Client data never leaves the machine. Ollama only. Non-negotiable.
- **Cost** - No paid API services. No subscriptions. No cloud LLMs. Non-negotiable.
- **Recipes** - AI never generates, suggests, or drafts recipes. Non-negotiable.
- **Model ceiling** - Local models are dumber than cloud models. Improves only when open-source community releases better small models.

---

## PHASE 1: Zero-Cost Wins (Do This Week)

These require no new infrastructure, no new dependencies, just code changes.

### 1.1 Swap to Better Models (FREE, immediate quality boost)

| Change | Current | New | Why |
|--------|---------|-----|-----|
| Fast tier | qwen2.5:4b | qwen3:4b | Qwen3 has native /think toggle; disable thinking for classification = faster + same quality |
| Standard tier | mistral:latest | qwen3:8b | Qwen3-8B dominates every business reasoning benchmark. Massive quality jump. Runs on your 128GB RAM via CPU |
| After GPU upgrade | N/A | qwen3:14b on GPU | 16GB VRAM fits 14B comfortably at ~51 tok/s. Significant intelligence upgrade |

**Research source:** r/LocalLLaMA benchmarks, Ollama community, Qwen3 release notes. Chain-of-thought prompting hurts models under 100B EXCEPT Qwen3's native /think mode which was specifically trained for small-model reasoning.

### 1.2 Use Ollama's Native Structured Output (FREE, reliability boost)

**Current:** Remy asks Ollama for JSON via prompt instructions, then tries to parse it, then runs a "repair pass" if it fails (~85-95% reliability).

**Better:** Use Ollama's `format` parameter with a JSON schema. This constrains token generation at the sampling level, giving ~98-99% valid JSON output. No repair pass needed.

**Files to change:** `lib/ai/parse-ollama.ts` (add `format` param to Ollama API calls)

### 1.3 Tune Ollama Parameters Per Task Type (FREE, quality boost)

**Current:** Same temperature/settings for all tasks.

**Better:**
| Task | temperature | top_p | num_predict | Why |
|------|------------|-------|-------------|-----|
| Classification | 0.0 | 1.0 | 50 | Deterministic, no creativity needed |
| Data extraction | 0.0 | 1.0 | 256 | Exact answers only |
| Draft generation | 0.5 | 0.9 | 512 | Some creativity for natural text |
| Complex reasoning | 0.2 | 0.95 | 1024 | Thoughtful but grounded |

**Files to change:** `lib/ai/parse-ollama.ts` (accept and pass task-specific params)

### 1.4 Enable/Disable Thinking Per Request (FREE, speed boost)

Qwen3 supports `/think` and `/no_think` prefixes per message.

- Classification: `/no_think` (speed, no reasoning needed)
- Intent parsing: `/no_think` (pattern matching, not reasoning)
- Response generation: `/think` (better quality answers)
- Complex analysis: `/think` (need reasoning chain)

**Files to change:** `lib/ai/parse-ollama.ts`, `lib/ai/remy-classifier.ts`, `lib/ai/command-intent-parser.ts`

### 1.5 Fix Classifier Bugs Found in Audit (FREE, accuracy boost)

Specific bugs found in deep scan:

| Bug | File:Line | Impact | Fix |
|-----|-----------|--------|-----|
| Low confidence (<0.6) from Ollama defaults to "question", erasing LLM's actual answer | remy-classifier.ts:270 | Commands misrouted as questions | Return LLM result, only default on crash |
| "Revenue report please" falls through to Ollama | remy-classifier.ts | Unnecessary Ollama call | Add pattern for "X report" format |
| "Don't send this" matches "send" pattern, ignores negation | remy-classifier.ts:99 | Negated commands treated as commands | Add negation prefix check before pattern match |
| Draft pattern captures too greedily ("for the Johnsons for being loyal" captures all) | command-intent-parser.ts:112 | Garbled executor input | Use non-greedy: `(.+?)(?:\s+for\s+|$)` |
| Route map hardcoded (26 routes), new pages require manual edit | command-intent-parser.ts:744 | New pages invisible to Remy | Load routes from nav-config dynamically |
| "ok" matches but "okay" doesn't | remy-classifier.ts:161 | Unnecessary Ollama call | Add "okay" to pattern |
| Injection sanitization wraps text in brackets instead of removing | remy-input-validation.ts:449 | LLM can still read bracketed injection | Replace with `[FILTERED]` |
| Newline collapse allows 3 newlines (still a delimiter attack) | remy-input-validation.ts:452 | Injection vector | Collapse to single newline |
| Missing cooking methods in recipe guard (pressure cook, sous vide, slow cook) | remy-input-validation.ts:223 | Recipe generation slips through | Add compound methods |
| "Does everyone have allergies?" matches single-client pattern | remy-classifier.ts:168 | False positive command routing | Add "everyone/all/any" exclusion |

### 1.6 Fix Storage Bugs Found in Audit (FREE, prevents data loss)

| Bug | File | Impact | Fix |
|-----|------|--------|-----|
| Pinned conversations deleted when auto-pruning exceeds 200 | remy-local-storage.ts:1214 | User loses important conversations | Never delete pinned conversations |
| Bookmark count not decremented when messages are trimmed | remy-local-storage.ts:1240 | Count mismatches reality | Check bookmark flag before deleting |
| Pending image not cleared when switching conversations | remy-drawer.tsx:108 | Image sent to wrong conversation | Clear pendingImageRef on conversation switch |
| Abort/cancel race condition (UI shows cancel but stream continues) | use-remy-send.ts:225 | Wasted compute, confusing UI | Dedup cancel calls with flag |

---

## PHASE 2: Architecture Improvements (1-2 Weeks Each)

### 2.1 RAG (Retrieval-Augmented Generation) - THE BIGGEST WIN

**What it is:** Instead of loading ALL context into the prompt, search for only the relevant pieces using semantic similarity.

**Why it matters:** Remy currently loads 51 DB queries per message. Most of that data is irrelevant to the question. RAG means: chef asks about Sarah, Remy retrieves only Sarah-related data. Smaller context = better answers from small models.

**How top companies do it (2026 state of art):**
1. Embed all business data (clients, events, conversations, emails) using `nomic-embed-text` via Ollama (free, local, private)
2. Store embeddings in Supabase `pgvector` (already in our stack, zero new dependencies)
3. On each message: embed the question, find top-10 most relevant chunks, inject only those into context
4. Hybrid search: BM25 keyword search + vector similarity + reranking for best results

**What changes:**
- New: Embedding pipeline that runs on data changes (client created, event updated, email received)
- New: Vector search function called before context loading
- Changed: Context loader becomes much smaller (only loads RAG results + always-fresh data like daily plan)
- Changed: 51 queries per message drops to ~5-8

**Estimated effort:** 1-2 weeks
**Impact:** Massive. Better answers, faster responses, less DB load.

### 2.2 Embedding-Based Intent Classification (Middle Layer)

**Current gap:** Remy jumps from regex patterns (0ms, 75% coverage) straight to a full Ollama LLM call (2-5s, remaining 25%). There's nothing in between.

**What top chatbots do (Rasa, Botpress, Intercom Fin):** Use embedding similarity as a middle layer. Embed the user message, compare to a library of example messages for each intent, route based on cosine similarity. Catches ~80% of the regex fallthrough in 15ms instead of 2-5s.

**How to implement:**
1. Create a library of 10-20 example messages per intent (draft.thank_you, client.search, etc.)
2. Pre-embed all examples using `nomic-embed-text`
3. On each message that fails regex: embed it, find nearest intent, route if similarity > 0.85
4. Only fall through to Ollama if similarity < 0.85

**Estimated effort:** 2-3 days
**Impact:** High. Eliminates most Ollama classification calls. Faster + more accurate.

### 2.3 Proactive Alerts (Remy Speaks First)

**Current:** Remy only responds when spoken to.

**What best assistants do (2026):** Surface actionable information without being asked.

**Examples for ChefFlow:**
- "The Henderson inquiry is 48 hours old with no response"
- "You have 3 unpaid invoices totaling $4,200"
- "Sarah's event is in 3 days and the menu isn't finalized"
- "Your food cost ratio this month is 38%, above your 35% target"

**Key design principle:** The TRIGGER logic is 100% deterministic (Formula > AI). Check database conditions on drawer open. Only use Ollama to compose the natural-language message if needed (or just use templates).

**Estimated effort:** 1 week
**Impact:** High. Makes Remy feel like a real assistant, not a search box.

### 2.4 Memory System Overhaul

**Current problems found in audit:**
- Memories not injected into classifier (routing blind to history)
- Memory extraction is fire-and-forget (can silently fail)
- No deduplication (3 identical memories stored)
- Correction matching is naive (word overlap, hardcoded names)
- 4 separate DB queries to load memories per message
- No expiration (stale memories forever)
- Importance scoring by LLM is subjective and inconsistent

**What best systems do (Letta/MemGPT, Zep, Mem0):**
- **Tiered memory:** Core facts always in context, conversation summaries searchable, entity extraction automatic
- **Deterministic importance:** Allergies/dietary = 10 (always). Preferences = 6. One-time mentions = 2. No LLM needed.
- **Single query with UNION/CTE** instead of 4 separate queries
- **Memory consolidation:** Periodically merge similar memories into single entries
- **Semantic search for retrieval:** Embed memories, retrieve by relevance to current message (not just importance score)

**Estimated effort:** 1 week
**Impact:** High. Remy actually remembers and uses what it's told.

### 2.5 Context Loading Optimization

**Current problem:** 51 parallel DB queries on every message. At 12 concurrent users = 612 queries. This is why stress tests fail.

**Fixes:**
1. Move deterministic aggregations (pattern analysis, counts, distributions) to DB views updated on write, not per-request
2. Use RAG (2.1) to replace most queries with a single vector search
3. Cache aggressively with different TTLs: revenue/goals (1 hour), calendar (5 min), profile (24 hours)
4. Partial failure handling: if 1 query fails, use partial context instead of failing entirely
5. Track which fields are stale and tell the model: "Revenue data may be up to 5 minutes old"

**Estimated effort:** 3-5 days
**Impact:** High. Performance + reliability under load.

---

## PHASE 3: Quality Improvements (Ongoing)

### 3.1 Per-Mode System Prompts

**Current:** One 400+ line system prompt for everything. Instructions conflict (e.g., "you're a draft machine" vs "never promise to send").

**Better:** Separate prompts for:
- Command mode: structured output, task-focused, concise
- Question mode: conversational, contextual, personalized
- Memory mode: extraction-focused, fact-oriented
- Draft mode: creative, tone-aware, client-specific

### 3.2 Better Few-Shot Examples

Small models learn heavily from examples. Current examples are outdated and don't cover all command types.

Need: 3-5 examples per major command category showing exact input/output format. Refresh quarterly.

### 3.3 Draft Quality (Context-Enriched)

**Current problem found in audit:** Draft generators receive only client name + event name. No context about the chef's tone, the actual menu served, client preferences, or relationship history.

**Fix:** Pass full context (client profile, event details, loyalty tier, recent interactions) to all draft generators. A thank-you email that mentions "the braised short ribs you loved" is 10x better than "thank you for the lovely evening."

### 3.4 Mixed Path Integration

**Current problem found in audit:** When both command and question are detected, they run in parallel but the conversational response never sees command results. Chef asks "What should I charge Sarah?" - command finds Sarah is Gold tier, but the question response gives generic pricing advice.

**Fix:** Run command first, then pass results into the question prompt as context.

### 3.5 Error Specificity

**Current:** Any non-Ollama error becomes "Remy ran into an issue. Please try again."

**Better:** "Couldn't load your recent events" / "Connection issue, try again" / "That query is taking too long" based on actual error type.

### 3.6 Confidence-Based Clarification

**Current:** Low-confidence classifications (0.4) are treated same as high-confidence (0.95).

**Better:** If confidence < 0.7, ask "Did you mean X or Y?" instead of guessing wrong.

---

## PHASE 4: After GPU Upgrade (RTX 5060 Ti 16GB)

### 4.1 Move to qwen3:14b as Primary Model
16GB VRAM fits 14B comfortably. Significant intelligence jump over 8B. ~51 tok/s on GPU.

### 4.2 Dual-Model on GPU
Run 14B (primary, ~8GB) + 8B (fast, ~5GB) = ~13GB simultaneously on GPU. No CPU fallback needed.

### 4.3 Fine-Tune with Unsloth + QLoRA
Train a custom model on chef/food industry data. Needs: 1,000 curated examples (synthetic data generated from non-private templates), ~2-4 hours training on 5060 Ti. Not viable on current 3050 (4GB too small).

### 4.4 RAG Embedding Pipeline on GPU
Embedding generation moves from CPU to GPU. Faster indexing of new data.

---

## PHASE 5: Streaming & UI Fixes

| Fix | File | Impact |
|-----|------|--------|
| Vision calls (receipt scan, dish photo) have no timeout, can hang 5+ min | api/remy/stream/route.ts:202 | User waits forever |
| Tasks can arrive before text is complete (confusing UI) | api/remy/stream/route.ts | Task card before explanation |
| Intent sent before first token (animation mismatch) | api/remy/stream/route.ts | Remy animates wrong |
| Kitchen mode doesn't auto-stop on error | use-kitchen-mode.ts | User talks to dead system |
| Elapsed timer doesn't reset on error | use-remy-send.ts:154 | Wrong time shown |
| Messages can appear out of order in rapid fire | remy-drawer.tsx:250 | Message loss on refresh |
| Auto-scroll doesn't fire on conversation switch | remy-drawer.tsx:249 | Manual scroll needed |
| Voice input can append to stale textarea | remy-drawer.tsx:200 | Input corruption |
| Timeout error says "Ollama offline" instead of "Ollama slow" | parse-ollama.ts:57 | Confusing error |
| Cache key doesn't include model (wrong cached results if model changes) | parse-ollama.ts:103 | Wrong responses |
| Cache TTL is infinite (never expires) | ollama-cache.ts | Stale responses forever |

---

## PHASE 6: Testing & Observability

| Item | What | Why |
|------|------|-----|
| Unit tests per component | Separate tests for classifier, parser, each executor | Current integration tests can't pinpoint failures |
| Abort/cancel tests | Test sending request then cancelling | Race conditions undetected |
| Streaming timing tests | Verify tokens arrive incrementally | Buffer bugs undetected |
| Auth token refresh in long tests | Token expires after 1 hour, subsequent tests fail | False failures |
| Failure categorization | Separate network/logic/timeout/auth failures | Can't diagnose from current pass/fail |
| Misclassification logging | Log every Ollama fallthrough + what it returns | Data to improve patterns |
| Latency metrics per stage | Track classifier/parser/executor time separately | Find real bottlenecks |
| Conversation analytics | Track what chefs ask most, what fails | Prioritize improvements with data |
| Regression tracking | Detect when a change makes Remy worse | Prevent regressions |

---

## PHASE 7: Orchestrator & Executor Improvements

| Fix | Current Problem | Impact |
|-----|----------------|--------|
| Parallel task execution | Tasks with no deps run sequentially | Slower than necessary |
| Per-task timeouts | One hung task blocks everything | Reliability |
| Input validation on tasks | Task inputs aren't validated before execution | Garbage in, garbage out |
| Web search caching | Same query can be searched 100 times | Wasted compute |
| Duplicate data loading | calendar.availability and event.list_upcoming both query events table | Double DB load |
| Agent action tier flexibility | All agent actions return tier 2; "create todo" should be tier 0, "send $5K invoice" should be tier 3 | Wrong approval levels |
| Dependency validation before execution | Dependencies checked after some tasks run, not before | Confusing error when tasks skip |
| Task executor abstraction | 150+ copy-paste executor functions | Hard to maintain |
| Route map auto-sync | 26 hardcoded routes in intent parser, must manually sync with nav-config | New pages invisible to Remy |
| Missing entity types in exclusion list | "circles", "experience" not excluded from client search | "Show my circles" searches for client named "circles" |

---

## What We've Already Done (Reference)

- Fixed classifier routing (60% to 100% on sample tests)
- 70 deterministic classifier patterns (13 command, 9 question, 29 hybrid, + more)
- 133 deterministic intent parser patterns
- 85 guardrail patterns (recipe, out-of-scope, dangerous, injection)
- ThinkingBlockFilter for clean streaming
- Switched classifier + streaming to fast model
- 3-layer pipeline (guardrails, classifier, parser)
- Tiered approval system (tier 1 auto, tier 2/3 require approval)
- Memory system with importance scoring + categories
- Seasonal/sentiment/workload awareness
- Passed 30/30 sample tests (100%)

---

## Priority Order (What Makes Remy Smarter, Fastest)

**Immediate (this week, zero new deps):**
1. Swap to qwen3:8b for standard tier (free quality boost)
2. Fix the 10 classifier/parser bugs from audit (free accuracy boost)
3. Fix the 4 storage bugs (prevent data loss)
4. Tune Ollama params per task type (free quality boost)
5. Enable/disable thinking per request (free speed boost)
6. Use Ollama native structured output (free reliability boost)

**Short-term (next 2-4 weeks):**
7. RAG with pgvector + nomic-embed-text (biggest single improvement)
8. Embedding-based intent classification middle layer
9. Proactive alerts (Remy speaks first)
10. Memory system overhaul
11. Context loading optimization

**Medium-term (1-2 months):**
12. Per-mode system prompts
13. Draft quality (context-enriched)
14. Mixed path integration
15. Streaming & UI fixes
16. Testing & observability

**After GPU upgrade:**
17. qwen3:14b as primary model
18. Dual-model on GPU
19. Fine-tune with Unsloth + QLoRA
20. RAG embedding pipeline on GPU

---

## Research Sources

- r/LocalLLaMA (model benchmarks, fine-tuning guides, Ollama optimization)
- r/ollama (configuration tuning, model comparisons)
- Hacker News (RAG architecture discussions, local AI deployments)
- LangChain/LlamaIndex docs (RAG best practices, chunking strategies)
- Letta/MemGPT, Zep, Mem0 (memory management patterns)
- Rasa, Botpress, Intercom Fin (intent classification architecture)
- Qwen3 release notes (thinking mode, model capabilities)
- Unsloth, QLoRA, Axolotl docs (fine-tuning on consumer hardware)
- Ollama API docs (format parameter, structured output)
- Supabase pgvector docs (embedding storage, similarity search)

---

## How This List Gets Updated

When we work on Remy and discover something new:
1. Add it to the appropriate phase above
2. Don't create a separate doc
3. Don't mention it in passing and forget it

This is the single source of truth. If it's not here, it's not real.
