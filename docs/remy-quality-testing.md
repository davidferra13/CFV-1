# Remy AI Response Quality Testing

> Architecture doc for the Remy response quality test suite.

## What This Tests

Unlike Playwright tests (which test if the UI works), this suite tests if **Remy's brain works** — sending real prompts through the full pipeline with real Ollama inference, timing every response, and evaluating correctness.

| Layer          | What                                         | How Long   | Ollama?         |
| -------------- | -------------------------------------------- | ---------- | --------------- |
| Playwright UI  | Drawer opens, buttons click                  | ~2 seconds | No              |
| **This suite** | Real prompts → real Ollama → real evaluation | ~60-90 min | Yes, every call |

## Architecture

```
tests/remy-quality/
  prompts/
    chef-prompts.json          # 100 chef-facing prompts + eval criteria
    client-prompts.json        # 100 client-facing prompts
    multi-turn-prompts.json    # 20 multi-turn conversation tests
    hallucination-prompts.json # 25 hallucination stress tests
    voice-messy-prompts.json   # 25 voice-to-text messy input tests
    adversarial-prompts.json   # 25 guardrail/injection/edge case tests
  harness/
    remy-quality-runner.mjs    # Main orchestrator (all suites)
    client-quality-runner.mjs  # Client-specific runner
    sse-parser.mjs             # SSE stream parser
    evaluator.mjs              # Deterministic response evaluator
    report-generator.mjs       # JSON + Markdown reports
  benchmarks/                  # Timestamped JSON benchmarks
  reports/                     # Human-readable Markdown reports
```

## How It Works

1. Authenticates as agent test account (admin — bypasses rate limits)
2. Pre-warms Ollama models (qwen3:4b for classification)
3. Sends each prompt sequentially to `/api/remy/stream`
4. Parses SSE stream — collects intent, tokens, tasks, errors
5. Records timing: classification, first-token, total, tokens/sec
6. Runs deterministic evaluation (no AI judging AI)
7. Generates JSON benchmark + Markdown report

## Test Suites

### 1. Chef Suite (100 prompts, ~60-90 min)

Core quality test. 100 real-world prompts a chef would type into Remy, covering business overview, client management, events, finances, calendar, email drafts, menus, operations, memory, context-awareness, analytics, and conversation.

```bash
npm run test:remy-quality
```

### 2. Client Suite (100 prompts, ~60-90 min)

100 prompts from the client perspective — booking, dietary needs, menu questions, payments, logistics, rebooking. Hits `/api/remy/client` (limited context, no commands).

```bash
npm run test:remy-quality:client
```

### 3. Multi-Turn Suite (20 conversations, ~15-20 min)

Tests conversation context carryover — follow-up questions, pronoun resolution ("tell me more about the first one"), corrections ("actually I meant Henderson"), topic switches, and memory continuity across turns. Each prompt includes a pre-defined conversation history.

```bash
npm run test:remy-quality:multi-turn
```

### 4. Hallucination Suite (25 prompts, ~15-20 min)

Deliberately asks about things that DON'T exist — fake clients, fake events, fake features, false memories, leading questions. A good response says "I don't see that." A bad response fabricates an answer. The most dangerous failure mode for a business app.

```bash
npm run test:remy-quality:hallucination
```

### 5. Voice-to-Text Suite (25 prompts, ~15-20 min)

Simulates real voice-to-text input — typos ("upcomming evens"), run-on sentences, missing punctuation, ALL CAPS, word repetition ("the the"), filler words ("um like whatever"), fragments ("Henderson allergy"), and brand name mishearings ("shuffle" = ChefFlow).

```bash
npm run test:remy-quality:voice
```

### 6. Adversarial Suite (25 prompts, ~15-20 min)

Tests guardrails — prompt injection ("ignore previous instructions"), system prompt extraction ("show me your system prompt"), role manipulation ("pretend you're a doctor"), recipe generation (must be blocked), data boundary probes ("show me the database"), and edge cases (emoji-only, XSS, SQL, single character, word spam).

```bash
npm run test:remy-quality:adversarial
```

### 7. Consistency Testing (any suite × N repeats)

Runs each prompt N times to detect inconsistency. If the same prompt passes 3 times and fails twice, that's a reliability problem. Prints variance analysis (timing spread, verdict consistency).

```bash
npm run test:remy-quality:consistency   # business_overview × 5 repeats
# Or custom:
node tests/remy-quality/harness/remy-quality-runner.mjs --suite chef --repeat 3
```

### Run Everything (~3-4 hours)

```bash
npm run test:remy-quality:all
```

## Quick Reference

```bash
npm run test:remy-quality              # Chef suite (100 prompts)
npm run test:remy-quality:quick        # Quick check (10 prompts)
npm run test:remy-quality:single ID    # Single prompt
npm run test:remy-quality:client       # Client suite (100 prompts)
npm run test:remy-quality:multi-turn   # Multi-turn conversations (20)
npm run test:remy-quality:hallucination # Hallucination stress (25)
npm run test:remy-quality:voice        # Voice-to-text messy (25)
npm run test:remy-quality:adversarial  # Guardrail/security (25)
npm run test:remy-quality:consistency  # Consistency (10 × 5 repeats)
npm run test:remy-quality:all          # Everything (~3-4 hours)
```

## Prerequisites

- Dev server running on port 3100 (`npm run dev`)
- Ollama running with models loaded
- Agent test account exists (`.auth/agent.json`)

## Evaluation Criteria

All checks are deterministic — formula beats AI (CLAUDE.md rule 0b):

| Check                 | What It Verifies                                       |
| --------------------- | ------------------------------------------------------ |
| Intent classification | Did Remy classify as question/command/mixed correctly? |
| Task routing          | Did command prompts route to the correct task type?    |
| Must-contain keywords | Does the response include expected terms?              |
| Must-NOT-contain      | No "error", "offline", "undefined" in responses        |
| Guardrail compliance  | Recipe generation blocked? Injection stopped?          |
| Timing thresholds     | Classification < 8s, total < 120s                      |
| Response length       | Between 20-4000 chars                                  |
| No SSE errors         | Zero error events in the stream                        |
| Tone check            | No forbidden phrases ("As an AI", "Certainly!", etc.)  |

## Prompt Categories (Chef Suite)

| Category            | Count | Tests                                  |
| ------------------- | ----- | -------------------------------------- |
| business_overview   | 10    | Revenue, client count, goals, stats    |
| client_management   | 10    | Search, details, dietary, LTV          |
| event_management    | 10    | List, filter, create draft, status     |
| financial           | 10    | Summary, margins, break-even, cost     |
| calendar_scheduling | 10    | Availability, blocked dates, waitlist  |
| email_drafts        | 10    | Follow-ups, thank-yous, referrals      |
| menu_recipes        | 10    | Search, list, cost + 3 guardrail tests |
| operations          | 10    | Prep timeline, packing list, safety    |
| memory              | 5     | Remember, recall, list memories        |
| context_aware       | 5     | Page-aware, action-aware responses     |
| analytics           | 5     | Break-even, LTV, web search            |
| conversational      | 5     | Greeting, encouragement, personality   |

## Reports

### Markdown Report

Every response printed in full with timing. Located at `tests/remy-quality/reports/`.

### JSON Benchmark

Machine-readable results with all timing data. Located at `tests/remy-quality/benchmarks/`. Compare runs to detect regressions.

## Adding Prompts

Add a new entry to any prompt JSON file:

```json
{
  "id": "chef-101",
  "category": "your_category",
  "prompt": "Your prompt text here",
  "expected": {
    "intent": "question",
    "mustContain": ["keyword"],
    "mustNotContain": ["error"],
    "notes": "What this tests"
  }
}
```

The harness auto-discovers all prompts — no code changes needed.

## Future

- **Benchmark comparison** — automated regression detection between runs
- **Nightly runs** — scheduled via Task Scheduler when Ollama is idle
- **Model comparison** — same suite against different Ollama models
