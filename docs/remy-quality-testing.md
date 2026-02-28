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
    client-prompts.json        # Client-facing prompts (future)
    adversarial-prompts.json   # Guardrail/injection tests (future)
  harness/
    remy-quality-runner.mjs    # Main orchestrator
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

## Running

```bash
# Full suite (~60-90 min, 100 prompts)
npm run test:remy-quality

# Quick test (~6-9 min, 10 prompts from one category)
npm run test:remy-quality:quick

# Single prompt (~30-60s, for debugging)
npm run test:remy-quality:single chef-001

# Custom category
node tests/remy-quality/harness/remy-quality-runner.mjs --suite chef --category email_drafts
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

Add a new entry to `prompts/chef-prompts.json`:

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

- **Client Remy suite** — 100 client-facing prompts against `/api/remy/client`
- **Adversarial suite** — 25 guardrail/injection/recipe-generation tests
- **Benchmark comparison** — automated regression detection between runs
- **Nightly runs** — scheduled via Task Scheduler when Ollama is idle
