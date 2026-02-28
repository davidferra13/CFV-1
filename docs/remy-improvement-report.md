# Remy Improvement Report

**Date:** 2026-02-28
**Author:** Claude Code (Lead Engineer)
**Scope:** Deep analysis of Remy's architecture, capabilities, and improvement opportunities

---

## Executive Summary

Remy is a sophisticated local-AI concierge with 50+ commands, 7 personality archetypes, tiered context loading, and strong safety guardrails. After a deep code review and initial eval run, here are the key findings and actionable improvements.

**Current Strengths:**

- Strong privacy architecture (Ollama-only, no cloud LLM for private data)
- Well-structured command routing with 3-tier safety (auto/confirm/held)
- Rich context loading with 5-minute caching
- Good personality system with 7 distinct archetypes
- Solid guardrails (recipe generation blocked, off-topic deflection, prompt injection defense)

**Key Weaknesses Found:**

- No feedback loop (no thumbs up/down, no quality tracking)
- Massive monolithic stream route (77KB, hard to maintain)
- Generic LLM model with no Remy-specific training
- No A/B testing infrastructure for prompt improvements
- System prompt is very large (~4000 tokens), eating into context window
- Some command routes returning 500 errors (found during eval)

---

## 1. Architecture Issues

### 1a. Monolithic Stream Route (`app/api/remy/stream/route.ts` — 77KB)

This single file handles auth, guardrails, classification, command routing, context loading, streaming, error handling, and response formatting. At 77KB, it's the largest file in the codebase and a maintenance risk.

**Recommendation:** Split into composable middleware:

- `remy-auth.ts` — session extraction
- `remy-guardrails.ts` — pre-processing safety checks
- `remy-router.ts` — intent-based routing logic
- `remy-stream.ts` — SSE streaming utilities

**Effort:** Medium (refactor, no behavior change)
**Impact:** Maintainability, testability, easier debugging

### 1b. Context Loading Weight

`remy-context.ts` (63KB) loads a massive context payload for every question. The 5-minute cache helps, but the full context dump still bloats the system prompt for simple queries like "Hey" or "Am I free Tuesday?"

**Recommendation:** Implement **adaptive context loading** — classify the query intent first (already done), then only load relevant context tiers:

- Greeting → minimal context (chef name, recent event count)
- Calendar query → events only
- Financial query → revenue + expenses + ledger
- Client query → client data + memories
- Draft → client data + communication history

**Effort:** Medium
**Impact:** Faster responses, lower token usage, more focused answers

### 1c. No Response Quality Feedback

There's no way for chefs to rate Remy's responses. No thumbs up/down, no "was this helpful?", no implicit quality signals. This means:

- No way to measure if prompt changes actually improve quality
- No training signal for fine-tuning
- No way to identify systematically bad responses

**Recommendation:** Add a lightweight feedback UI:

- Thumbs up/down on each Remy response
- Optional "what was wrong?" dropdown on thumbs down
- Store in `remy_feedback` table (conversation_id, message_index, rating, feedback_type)
- Use as training signal for fine-tuning and prompt iteration

**Effort:** Low
**Impact:** Critical for continuous improvement

---

## 2. Model Quality Issues

### 2a. Generic Model, No Domain Specialization

Remy uses `qwen3:30b` for responses — a general-purpose model with no ChefFlow-specific training. The personality comes entirely from the system prompt, which means:

- Every response burns ~4000 tokens on the system prompt
- The model has to "learn" Remy's personality from scratch each conversation
- Archetype differences may be subtle since the base model has its own voice

**Recommendation:** Fine-tune a Remy-specific model using QLoRA:

1. Use the generated training dataset (31 conversations, expandable to 500+)
2. Fine-tune `qwen3:4b` (fits in VRAM for fast inference)
3. The fine-tuned model already "knows" Remy's voice, reducing system prompt needs
4. Export to GGUF, load in Ollama as `remy:latest`

**Effort:** High (requires ML pipeline setup)
**Impact:** Better voice consistency, faster responses (shorter prompts), lower compute

### 2b. Classifier Accuracy

The intent classifier uses `qwen3:4b` with a fast pass. During eval, some commands that should route to Remy's command pipeline may be misclassified as questions (or vice versa). The 0.6 confidence threshold is conservative.

**Recommendation:**

- Build a classifier-specific eval (100+ labeled examples)
- Tune the confidence threshold based on precision/recall analysis
- Consider a fine-tuned classifier model (very small, fast, accurate)

**Effort:** Medium
**Impact:** Better command routing, fewer missed actions

---

## 3. Safety & Guardrails

### 3a. Recipe Guardrails — Working Well

The recipe generation block is implemented at multiple layers:

- Input validation (`remy-input-validation.ts`)
- System prompt guardrails
- Restricted actions registry
- Command parser rules

This is well-architected. No changes needed.

### 3b. Prompt Injection Defense

The `REMY_ANTI_INJECTION` system exists but relies entirely on prompt-level instructions. For a local model, this is acceptable, but could be strengthened with:

- Pattern-based pre-screening of common injection formats
- Structured output parsing that strips unexpected content
- Rate limiting on rapid message sequences

**Effort:** Low
**Impact:** Low (risk is already minimal with local-only model)

---

## 4. Eval Results & Findings

### Initial Eval Run (2026-02-28)

**Infrastructure Working:**

- Seed data: 15 clients, 25 events, 21 ledger entries, 13 expenses, 5 quotes, 8 recipes, 4 menus, 5 inquiries, 4 staff, 15 memories, 5 reviews — all seeded successfully
- SSE streaming capture: fixed and working
- LLM grading: working with qwen3:4b (using `/no_think` prefix)
- Auth flow: working via e2e agent account

**Test data-01 (Revenue Query):** PASSED 5/5

- Remy cited real revenue numbers from the ledger
- Used authentic chef voice with emojis
- Provided actionable insights

**Test data-02 (Client Lookup):** FAILED — 500 Error

- "Tell me about the Henderson family" causes a server error
- This is likely a command routing issue in the stream route
- Needs investigation in the command orchestrator

_(Full eval results will be appended when the 33-test suite completes)_

---

## 5. Recommended Improvement Roadmap

### Phase 1 — Quick Wins (1-2 sessions)

1. **Fix 500 errors** found during eval (command routing issues)
2. **Add feedback UI** (thumbs up/down on Remy responses)
3. **Create `remy_feedback` table** for storing quality signals
4. **Expand test cases** based on eval failures

### Phase 2 — Quality (2-4 sessions)

5. **Adaptive context loading** (load only relevant context per query type)
6. **Expand training dataset** to 500+ conversations
7. **Classifier eval** and threshold tuning
8. **Split monolithic stream route** into composable modules

### Phase 3 — Fine-Tuning (1-2 sessions + compute time)

9. **Set up QLoRA pipeline** (Unsloth on WSL2 or direct Windows)
10. **Fine-tune remy:4b** on the training dataset
11. **A/B test** fine-tuned vs base model using eval harness
12. **Deploy** winning model as `remy:latest` in Ollama

### Phase 4 — Continuous Improvement (ongoing)

13. **Weekly eval runs** to track quality over time
14. **Feedback-driven training** — incorporate thumbs-down responses into training data
15. **Prompt regression testing** — ensure prompt changes don't degrade quality
16. **Archetype differentiation scoring** — measure if archetypes actually sound different

---

## 6. Files Created This Session

| File                                                  | Purpose                                                                                                               |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `scripts/remy-eval/seed-remy-test-data.ts`            | Seeds 15 clients + 25 events + full financial/operational data for the agent test account                             |
| `scripts/remy-eval/test-cases.ts`                     | 33 test cases across 8 categories (data accuracy, commands, safety, voice, drafts, allergy, mixed intent, edge cases) |
| `scripts/remy-eval/eval-harness.ts`                   | Automated eval loop: auth → send query → capture SSE → rule-based grading → LLM grading → report                      |
| `scripts/remy-eval/run-full-pipeline.sh`              | One-command runner (pre-flight checks → seed → eval)                                                                  |
| `scripts/remy-eval/generate-training-data.ts`         | Generates ShareGPT-format training conversations across all 7 archetypes                                              |
| `scripts/remy-eval/training-data/remy-sharegpt.jsonl` | 31 seed training conversations                                                                                        |
| `scripts/remy-eval/reports/eval-*.json`               | Eval run results (timestamped)                                                                                        |

---

## 7. How to Run Everything

```bash
# 1. Seed test data
npx tsx scripts/remy-eval/seed-remy-test-data.ts --clean

# 2. Run full eval
npx tsx scripts/remy-eval/eval-harness.ts --verbose

# 3. Run single category
npx tsx scripts/remy-eval/eval-harness.ts --category=safety --verbose

# 4. Run single test
npx tsx scripts/remy-eval/eval-harness.ts --id=data-01 --verbose

# 5. Generate training data
npx tsx scripts/remy-eval/generate-training-data.ts

# 6. One-command pipeline
bash scripts/remy-eval/run-full-pipeline.sh
```

Prerequisites: Dev server on port 3100, Ollama running.

---

_This report will be updated with full eval results and additional findings as the improvement work continues._
