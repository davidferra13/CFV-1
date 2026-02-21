# Sim-to-Real Loop — AI Quality Improvement

## What Is Sim-to-Real?

In robotics, "sim-to-real" means training a robot in a virtual simulation thousands of times, then deploying those learned behaviors in the real world. The simulation is cheap (no physical damage, fast iteration), and the behaviors transfer because the simulation closely matches reality.

For ChefFlow, this concept maps to:

| Robotics                | ChefFlow                                                       |
| ----------------------- | -------------------------------------------------------------- |
| Virtual simulation      | Ollama generates synthetic chef scenarios                      |
| Robot behavior          | ChefFlow's AI pipeline (parsing, drafting, allergen detection) |
| Thousands of iterations | Hundreds of simulated scenarios per run                        |
| Real-world deployment   | Actual chef/client interactions                                |
| Behavior improvement    | Better prompts based on simulation failures                    |

---

## The Four-Phase Loop

### Phase 1: Generate (Simulate)

Ollama acts as the "simulation engine." It generates diverse, realistic scenarios:

- Inquiry emails from potential clients (varied dietary needs, budgets, occasions)
- Client notes with PII patterns
- Event menus with tricky allergen combinations
- Multi-turn conversation contexts at each lifecycle stage

These are **synthetic** — no real client data is ever used.

### Phase 2: Execute (Run the Pipeline)

Each synthetic scenario runs through ChefFlow's **real AI functions**:

```
inquiry_parse    → same system prompt as parseInquiryFromText()
client_parse     → same system prompt as parseClientFromText()
allergen_risk    → same prompt logic as getEventAllergenRisk()
correspondence   → same lifecycle rules as agent-brain.ts
menu_suggestions → same constraints as suggestMenus()
quote_draft      → same pricing logic as draftQuote()
```

The code paths are **identical** to production. No shortcuts.

### Phase 3: Evaluate (Grade the Output)

Ollama grades each output against module-specific rubrics:

| Module             | Key rubric checks                                         |
| ------------------ | --------------------------------------------------------- |
| `inquiry_parse`    | All fields captured? No invented data?                    |
| `client_parse`     | PII correctly extracted? No hallucinated contact details? |
| `allergen_risk`    | Every conflict detected? Severe allergens flagged?        |
| `correspondence`   | Lifecycle rules obeyed? No forbidden content?             |
| `menu_suggestions` | Dietary restrictions respected? 3 distinct menus?         |
| `quote_draft`      | Pricing in reasonable range? Line items complete?         |

Score: 0–100. Passed: ≥70.

### Phase 4: Store and Surface

Results are stored in three tables:

- `simulation_runs` — metadata per batch
- `simulation_results` — per-scenario scores and failure reasons
- `fine_tuning_examples` — high-scoring results (≥90) saved for future model training

Failures surface in the simulation lab (`/dev/simulate`) with the specific scenario and failure reason.

---

## How to Improve Prompts

When a module has a low pass rate:

1. Go to `/dev/simulate` → click the module → see failure examples
2. Read the failure reason: e.g., "Parser returned null for event_date when the email clearly stated 'next Saturday'"
3. Find the corresponding prompt in the codebase:
   - `inquiry_parse` → `lib/simulation/pipeline-runner.ts` (case `inquiry_parse`) mirrors `lib/ai/parse-inquiry.ts`
   - `allergen_risk` → `lib/ai/allergen-risk.ts`
   - `correspondence` → `lib/ai/correspondence.ts` + `lib/ai/agent-brain.ts`
4. Adjust the system prompt to be more explicit about the failing case
5. Re-run the simulation — the pass rate should improve
6. If pass rate is stable above 85%, the fix transfers to real chef interactions automatically

---

## Fine-Tuning Pipeline (Phase 4 — Long-Term)

Every simulation result with score ≥ 90 is stored in `fine_tuning_examples`.
Real chef interactions where the chef approves AI output are also stored (source: `real`).

When the dataset reaches ~2000 examples, you can fine-tune a smaller, faster local model:

```bash
# Export from Supabase as JSONL
# (see lib/simulation/export-fine-tuning.ts — Phase 4 implementation)

# Fine-tune with Ollama
ollama create chefflow-v1 -f ./Modelfile

# Test the fine-tuned model
ollama run chefflow-v1 "Parse this inquiry: ..."
```

A fine-tuned `qwen2.5:7b` (7B params, ~5GB) would be significantly faster than `qwen3-coder:30b` while being purpose-built for ChefFlow's parsing patterns.

---

## Key Files

| File                                                       | Purpose                                 |
| ---------------------------------------------------------- | --------------------------------------- |
| `lib/simulation/types.ts`                                  | Shared TypeScript types                 |
| `lib/simulation/scenario-generator.ts`                     | Ollama-powered scenario generation      |
| `lib/simulation/pipeline-runner.ts`                        | Runs scenarios through real AI prompts  |
| `lib/simulation/quality-evaluator.ts`                      | Ollama-powered output grading           |
| `lib/simulation/simulation-actions.ts`                     | Server actions (start/read runs)        |
| `app/(chef)/dev/simulate/page.tsx`                         | Simulation control panel                |
| `components/simulation/simulation-results-panel.tsx`       | Results display with failure drill-down |
| `supabase/migrations/20260321000001_simulation_tables.sql` | Database schema                         |

---

## Design Constraints

From `CLAUDE.md` and `docs/AI_POLICY.md`:

1. **AI output is draft-only** — simulation never writes canonical state
2. **Ledger is immutable** — simulation never touches `ledger_entries`
3. **Synthetic data only** — simulation never uses real client PII
4. **Non-blocking** — simulation failures never affect the main app
5. **Tenant-scoped** — all results scoped to the running chef's tenant
6. **Chef approval required** — real interactions only become fine-tuning examples after chef explicitly approves the AI output

---

## Phase Roadmap

| Phase                        | Status      | Description                                                 |
| ---------------------------- | ----------- | ----------------------------------------------------------- |
| 1 — Always-On Ollama         | Complete    | Windows service, watchdog integration, health badge         |
| 2 — Stress-Test Loop         | Complete    | Generate → run → evaluate → surface failures                |
| 3 — User Behavior Simulation | Planned     | Simulate full client journeys (inquiry → event) through FSM |
| 4 — Fine-Tuning Dataset      | In progress | Accumulating examples — export/training pipeline TBD        |
