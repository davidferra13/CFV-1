# Remy Fine-Tuning Roadmap — Making Him Smarter

> **Purpose:** The testing roadmap measures how good Remy is. This roadmap makes him better. Testing = the exam. Fine-tuning = the education.
>
> **Last updated:** 2026-03-01
>
> **Current model:** `qwen3:30b` (MoE, 3.3B active params) — base, no fine-tuning
>
> **Target model:** `remy:4b` — fine-tuned, chef-specialized, voice-trained

---

## The Honest Assessment

### What fine-tuning CAN fix

- **Voice consistency** — Remy should always sound like a kitchen vet, not a generic AI. Fine-tuning bakes this into the weights instead of relying on a system prompt the model sometimes ignores.
- **Task understanding** — "Check if March 15 is free" should always route to calendar, not general Q&A. Fine-tuning teaches the model what each command looks like.
- **Response format** — Always lead with the answer, use emojis naturally, keep it short. Stop saying "That's a great question!"
- **Domain knowledge** — What a "cover" is, what "86'd" means, what "on the rail" means. Chef vocabulary baked in.
- **Guardrail internalization** — "Never generate recipes" becomes part of the model's behavior, not just a system prompt rule it might forget.

### What fine-tuning CANNOT fix

- **Reasoning ability** — A 4B model can't do complex math, multi-step logic, or synthesize data across 5 sources. No amount of training data changes the parameter count.
- **Context window** — The model's attention span is fixed by architecture. Fine-tuning doesn't expand it.
- **Knowledge** — Fine-tuning teaches behavior, not facts. Remy won't "know" your clients — that comes from the context loader at runtime.
- **Speed** — Fine-tuning doesn't make inference faster. GPU upgrade does that.

### What this means practically

After fine-tuning, Remy should:

- Sound right 95%+ of the time (vs ~80% today)
- Route commands correctly 95%+ of the time (vs ~75% today)
- Refuse recipe generation 100% of the time (vs ~95% today — sometimes the system prompt isn't enough)
- Handle the fast tier (classification, simple Q&A) without needing the 30B model at all

After fine-tuning, Remy will still:

- Need the 30B model for complex queries (multi-step, data synthesis, long drafts)
- Need good context loading to answer data questions (the plumbing still matters)
- Struggle with compound requests ("do X and also Y") — that's a reasoning limitation

---

## Prerequisites — Before You Start

### Hardware Check

| Component | Your Setup          | Minimum for QLoRA                       | Status           |
| --------- | ------------------- | --------------------------------------- | ---------------- |
| GPU       | RTX 3050, 6 GB VRAM | 6 GB (tight for 4B, impossible for 8B+) | Marginal         |
| RAM       | 128 GB DDR5         | 16 GB                                   | More than enough |
| Storage   | 2 TB NVMe           | 50 GB free                              | Fine             |
| CUDA      | 12.6                | 11.8+                                   | Fine             |
| OS        | Windows 11          | Windows (WSL2) or Linux                 | Fine             |

**The GPU reality:**

- **4B model QLoRA:** ~5-6 GB VRAM. Your 3050 can do it, but it'll be tight. Close everything else. No browser, no Ollama running, nothing.
- **8B model QLoRA:** ~8-10 GB VRAM. Won't fit. Don't try.
- **Cloud alternative:** RunPod ($0.50/hr for an A100), Lambda Labs, or Google Colab Pro. Fine-tune in the cloud, download the result, run locally.

**Recommendation:** Try local first with 4B. If OOM, use cloud. The fine-tuned model runs locally regardless — you only need the big GPU for training, not inference.

### Software Setup

```bash
# Option A: Local (WSL2 on Windows)
# Install WSL2 if not already
wsl --install

# Inside WSL2:
pip install unsloth
pip install transformers peft trl datasets
pip install bitsandbytes  # for 4-bit quantization

# Option B: Cloud (RunPod / Colab)
# Use Unsloth's pre-built Docker image
# All dependencies pre-installed
```

### What You Already Have

| Asset                                       | Location                                              | Status                     |
| ------------------------------------------- | ----------------------------------------------------- | -------------------------- |
| 31 training conversations (ShareGPT format) | `scripts/remy-eval/training-data/remy-sharegpt.jsonl` | Generated, needs expansion |
| Training data generator                     | `scripts/remy-eval/generate-training-data.ts`         | Working                    |
| 7 archetype system prompts                  | In `generate-training-data.ts`                        | Defined                    |
| 248-test eval harness                       | `scripts/remy-eval/`                                  | Ready to measure results   |
| Thumbs up/down feedback table               | `remy_feedback` in Supabase                           | Collecting data (new)      |

---

## Phase 1: Training Data (the most important part)

> **This is where 80% of fine-tuning quality comes from.** Bad data = bad model. No amount of hyperparameter tuning fixes garbage training data.

### 1A. Audit Existing Training Data

**Current state:** 31 synthetic conversations generated by `generate-training-data.ts`.

**Problems with 31 conversations:**

- Not enough. QLoRA on 4B needs 200-500 minimum for meaningful improvement. 1000+ is better.
- All synthetic — generated by a script, not from real interactions. Synthetic data teaches patterns but misses the messy reality of how chefs actually talk.
- No negative examples — the model needs to see "bad" requests and learn to refuse them.
- No multi-turn conversations — all are single exchanges or short chains.

### 1B. Expand to 500+ Conversations

**Target: 500 conversations minimum. 1000 is the goal.**

| Source                      | Count   | How to Get Them                                                        | Priority            |
| --------------------------- | ------- | ---------------------------------------------------------------------- | ------------------- |
| **Synthetic (script)**      | 200     | Expand `generate-training-data.ts` with more scenarios                 | Do first            |
| **Curated golden examples** | 100     | Manually write ideal Remy responses to common queries                  | Do second           |
| **Real feedback**           | 100-500 | Export thumbs-up conversations from `remy_feedback` table              | As data accumulates |
| **Failure cases**           | 50      | Take eval failures, write the correct response                         | Do third            |
| **Safety/refusal examples** | 50      | Recipe requests, injection attempts, off-topic — with correct refusals | Do second           |

### 1C. Training Data Categories

Every category needs representation. Imbalanced data = model that's great at one thing, terrible at others.

| Category              | Target Count | What It Teaches                                                    |
| --------------------- | ------------ | ------------------------------------------------------------------ |
| **Safety refusals**   | 50+          | Recipe generation block, injection resistance, off-topic redirect  |
| **Data lookups**      | 80+          | Revenue queries, client searches, event details, calendar checks   |
| **Draft writing**     | 60+          | Payment reminders, thank-yous, referral requests, all 13 templates |
| **Voice/personality** | 70+          | 10 per archetype — celebration, empathy, advice, greetings         |
| **Command routing**   | 50+          | Correct intent classification for each task type                   |
| **Allergy/dietary**   | 30+          | Always flag allergies prominently, never downplay severity         |
| **Edge cases**        | 30+          | Missing data, non-existent clients, partial states, empty input    |
| **Multi-turn**        | 40+          | Context retention, pronoun resolution, follow-up handling          |
| **Messy input**       | 30+          | Voice-to-text errors, typos, fragments, run-on sentences           |
| **Memory operations** | 20+          | Save, recall, correct category assignment                          |
| **Mixed intent**      | 20+          | Compound requests handled step by step                             |
| **Client-facing**     | 30+          | Different tone, limited scope, no actions                          |
| **Landing page**      | 20+          | Product education, no data access, rate limit handling             |

**Total: ~530 conversations across 13 categories.**

### 1D. Training Data Quality Rules

Every training conversation MUST follow these rules:

1. **Remy's response is the "gold standard"** — it's exactly what you want the model to say. If it's not perfect, don't include it.
2. **System prompt is included** — the model learns to follow the system prompt, not just mimic responses.
3. **No hallucinated data** — if the response references revenue of $4,550, that number must be plausible for the seed data context.
4. **Voice is consistent with the archetype** — a veteran response should sound different from a hype response.
5. **Refusals are warm, not robotic** — "That's your creative domain, chef" not "I cannot generate recipes."
6. **Format: ShareGPT** — `{ conversations: [{ from: "system", value: "..." }, { from: "human", value: "..." }, { from: "gpt", value: "..." }] }`

### 1E. Data Validation Checklist

Before training, run these checks:

- [ ] At least 500 conversations
- [ ] No category has fewer than 20 examples
- [ ] Safety/refusal examples are at least 10% of the dataset
- [ ] All 7 archetypes represented (at least 10 conversations each)
- [ ] Multi-turn conversations are at least 15% of the dataset
- [ ] No duplicate conversations (deduplicate by content hash)
- [ ] All responses pass the eval harness rules (mustContain, mustNotContain, refusal checks)
- [ ] Manual spot-check: read 20 random conversations, verify quality

---

## Phase 2: Base Model Selection

### The Options

| Model             | Size | Active Params | Fits in 6GB VRAM? | QLoRA in 6GB?                            | Quality                                            |
| ----------------- | ---- | ------------- | ----------------- | ---------------------------------------- | -------------------------------------------------- |
| `qwen3:1.7b`      | 1.7B | 1.7B (dense)  | Yes, easily       | Yes                                      | Low — too small for quality responses              |
| `qwen3:4b`        | 4B   | 4B (dense)    | Yes               | Tight but possible                       | **Best option** — good balance of size and quality |
| `qwen3:8b`        | 8B   | 8B (dense)    | No (needs 5GB+)   | No                                       | Better quality but can't train or run efficiently  |
| `qwen3-coder:30b` | 30B  | 3.3B (MoE)    | Inference: Yes    | Training: No (MoE QLoRA is experimental) | Current model — can't easily fine-tune MoE         |

### Recommendation: `qwen3:4b`

**Why:**

- Fits in 6GB VRAM for both training AND inference
- Dense model (not MoE) — straightforward QLoRA
- Already used as the classifier — inference pipeline already handles it
- After fine-tuning, it should handle 60-80% of queries without needing the 30B model
- The 30B model stays as the fallback for complex tasks

**The plan:**

```
User query → Classifier (remy:4b fine-tuned) → Simple? → remy:4b handles it directly
                                               → Complex? → qwen3:30b handles it
```

After fine-tuning, the fast model handles more queries, so fewer requests need the slow 30B model. Response times drop dramatically.

---

## Phase 3: Fine-Tuning Process

### 3A. QLoRA Configuration

```python
# Unsloth QLoRA config for qwen3:4b on RTX 3050 (6GB)

from unsloth import FastLanguageModel

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/Qwen3-4B",        # Base model
    max_seq_length=4096,                    # Context window
    dtype=None,                             # Auto-detect (float16 on 3050)
    load_in_4bit=True,                      # 4-bit quantization (critical for 6GB)
)

model = FastLanguageModel.get_peft_model(
    model,
    r=16,                                   # LoRA rank (16 is standard, 8 if OOM)
    lora_alpha=32,                          # LoRA alpha (2x rank is common)
    lora_dropout=0.05,                      # Small dropout
    target_modules=[                        # Which layers to fine-tune
        "q_proj", "k_proj", "v_proj",       # Attention
        "o_proj",                           # Output projection
        "gate_proj", "up_proj", "down_proj" # MLP
    ],
    bias="none",
    use_gradient_checkpointing="unsloth",   # Saves VRAM
)
```

### 3B. Training Parameters

```python
from trl import SFTTrainer
from transformers import TrainingArguments

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    args=TrainingArguments(
        output_dir="./remy-4b-lora",
        num_train_epochs=3,                 # 3 epochs for 500+ conversations
        per_device_train_batch_size=1,      # 1 for 6GB VRAM (increase on cloud)
        gradient_accumulation_steps=8,      # Effective batch size = 8
        learning_rate=2e-4,                 # Standard QLoRA LR
        lr_scheduler_type="cosine",         # Cosine decay
        warmup_ratio=0.1,                   # 10% warmup
        logging_steps=10,
        save_strategy="epoch",
        fp16=True,                          # Float16 (3050 doesn't have bf16)
        optim="adamw_8bit",                 # 8-bit optimizer (saves VRAM)
        max_grad_norm=1.0,
        seed=42,
    ),
    max_seq_length=4096,
    dataset_text_field="text",
)
```

### 3C. Training Steps

```
1. Prepare data      → Load ShareGPT JSONL, format for Unsloth
2. Load base model   → qwen3:4b in 4-bit
3. Apply LoRA        → Attach low-rank adapters
4. Train             → 3 epochs, ~30-60 min on 3050 (or ~10 min on cloud A100)
5. Save LoRA weights → ./remy-4b-lora/
6. Merge weights     → Combine LoRA + base into single model
7. Export to GGUF    → Convert for Ollama
8. Register in Ollama → ollama create remy:4b -f Modelfile
9. Test              → Run eval harness against remy:4b
```

### 3D. Expected Timeline

| Step                                   | Time (Local, RTX 3050) | Time (Cloud, A100) |
| -------------------------------------- | ---------------------- | ------------------ |
| Data preparation                       | 1-2 hours              | 1-2 hours          |
| Training (500 conversations, 3 epochs) | 30-60 min              | 5-10 min           |
| Merge + GGUF export                    | 10-15 min              | 5 min              |
| Ollama registration                    | 2 min                  | 2 min              |
| Eval run (Phase 1 safety)              | 30 min                 | 30 min             |
| Eval run (full 248 tests)              | 60-90 min              | 60-90 min          |
| **Total per iteration**                | **~3-4 hours**         | **~2-3 hours**     |

---

## Phase 4: Evaluation Loop (This Is Where the Testing Roadmap Comes In)

### The Loop

```
Train model v1
    ↓
Run Phase 1 (Safety) → 100%?
    ↓ No → REJECT. Fix training data. Retrain.
    ↓ Yes
Run Phase 2 (Read) → 90%+?
    ↓ No → Analyze failures. Add training examples for failing categories. Retrain.
    ↓ Yes
Run Phase 3 (Write) → 85%+?
    ↓ No → Analyze failures. Add training examples. Retrain.
    ↓ Yes
Run Phase 4 (Voice) → Avg voice >= 4.0?
    ↓ No → Add more archetype-differentiated examples. Retrain.
    ↓ Yes
SHIP IT → Register as remy:latest in Ollama
```

### Failure Analysis Process

When a test fails after fine-tuning:

1. **Read the response.** What did the model actually say?
2. **Categorize the failure:**
   - **Wrong route** → needs more intent classification examples
   - **Wrong data** → needs more data lookup examples with correct answers
   - **Wrong tone** → needs more voice examples for that archetype
   - **Hallucination** → needs more "I don't have that data" examples
   - **Missed refusal** → needs more safety/refusal examples
   - **Formatting** → needs more examples with correct response structure
3. **Write 5-10 training conversations** that demonstrate the correct behavior
4. **Add them to the dataset**
5. **Retrain** (full retrain, not incremental — it's fast enough)

### How Many Iterations?

Expect **3-5 training iterations** before hitting targets. Each iteration:

- Analyze failures from previous run
- Add 20-50 targeted training examples
- Retrain (30-60 min)
- Re-evaluate (30-60 min)

**Total calendar time:** 2-4 days of focused work across 3-5 iterations.

---

## Phase 5: Deployment

### 5A. Create Ollama Modelfile

```dockerfile
# Modelfile for remy:4b
FROM ./remy-4b-Q5_K_M.gguf

PARAMETER temperature 0.7
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.1
PARAMETER num_ctx 4096

SYSTEM """You are Remy, a seasoned kitchen veteran AI concierge for ChefFlow..."""
```

### 5B. Register in Ollama

```bash
# From the directory containing the GGUF and Modelfile
ollama create remy:4b -f Modelfile

# Verify
ollama list | grep remy
ollama run remy:4b "Good morning, chef!"
```

### 5C. Update Application Code

```typescript
// lib/ai/providers.ts — update the fast tier
export const OLLAMA_MODELS = {
  fast: 'remy:4b', // Was: 'qwen3:4b'
  standard: 'qwen3-coder:30b', // Unchanged
  complex: 'qwen3:30b', // Unchanged
}
```

### 5D. Update Warmup

```typescript
// app/api/remy/warmup/route.ts — warm the fine-tuned model
const model = 'remy:4b' // Was: 'qwen3:4b'
```

### 5E. Rollback Plan

If the fine-tuned model regresses:

```typescript
// Instant rollback — change one line
fast: 'qwen3:4b',  // Revert to base model
```

The base model is still installed. Rollback takes 10 seconds.

---

## Phase 6: Continuous Improvement (Ongoing)

### 6A. Feedback-Driven Retraining

```
Weekly:
1. Export thumbs-down conversations from remy_feedback table
2. Write correct responses for each
3. Add to training dataset
4. Monthly: retrain with expanded dataset
```

### 6B. Eval Regression Checks

```
After every retrain:
1. Run Phase 1 (Safety) — must be 100%
2. Run Phase 2 sample (10 random tests) — must be 90%+
3. Compare overall score to previous version
4. If worse → don't deploy, investigate
```

### 6C. Model Versioning

Keep every version:

```
scripts/remy-eval/models/
  remy-4b-v1.gguf    # First fine-tune
  remy-4b-v2.gguf    # After feedback round 1
  remy-4b-v3.gguf    # After feedback round 2
  ...
```

Each version has a corresponding eval report. You can always compare and rollback.

### 6D. When to Retrain

| Trigger                          | Action                                            |
| -------------------------------- | ------------------------------------------------- |
| 50+ new feedback entries         | Retrain with expanded data                        |
| Model update (new qwen3 release) | Re-fine-tune on new base, compare                 |
| New feature added to Remy        | Add training examples for new capability, retrain |
| Eval score drops below 85%       | Investigate, add corrective examples, retrain     |
| GPU upgrade (24GB)               | Consider fine-tuning 8B base instead of 4B        |

---

## Phase 7: Hardware Upgrade Path (Future)

### With RTX 3090 (24GB VRAM)

| What Changes                 | Before (3050, 6GB) | After (3090, 24GB)           |
| ---------------------------- | ------------------ | ---------------------------- |
| Base model for fine-tune     | qwen3:4b only      | qwen3:8b or qwen3:14b        |
| Training batch size          | 1                  | 4-8                          |
| Training time (500 examples) | 30-60 min          | 10-15 min                    |
| LoRA rank                    | 16 (constrained)   | 32-64 (better quality)       |
| Models loaded simultaneously | 1                  | 2-3 (no swap delays)         |
| Inference speed              | 40-60 tok/s (4b)   | 30-40 tok/s (8b, still fast) |

**The 3090 unlocks:**

- Fine-tuning on 8B base → much smarter model
- Higher LoRA rank → better adaptation quality
- Bigger batch size → faster training
- Multi-model inference → no more 50-60s swap delays
- The jump from 4B to 8B is the biggest quality improvement per dollar you can buy

### Cost-Benefit

| Investment                  | Cost               | Impact                             |
| --------------------------- | ------------------ | ---------------------------------- |
| Fine-tuning (QLoRA, local)  | $0 (your hardware) | Voice +20%, routing +15%           |
| Fine-tuning (cloud, RunPod) | ~$5-10 per run     | Same, faster                       |
| Training data curation      | Time only          | Biggest quality driver             |
| RTX 3090 (used)             | ~$700-800          | 8B base model + no swap delays     |
| RTX 4090 (new)              | ~$1,600-2,000      | 24GB + faster + newer architecture |

---

## Definition of Done — When Is Fine-Tuning Complete?

### First Fine-Tune (v1) — Done When:

- [ ] Training data: 500+ conversations, all categories represented
- [ ] Base model: `qwen3:4b`
- [ ] Training completed without OOM
- [ ] Registered in Ollama as `remy:4b`
- [ ] Phase 1 (Safety): **100%** — no regressions from base model
- [ ] Phase 2 (Read): **90%+** — improvement over base model's ~80%
- [ ] Phase 3 (Write): **85%+** — improvement over base model's ~60%
- [ ] Phase 4 (Voice): **avg voice >= 4.0/5** — sounds like Remy, not generic AI
- [ ] Overall LLM-graded: **90%+** — up from 75.8% on base model
- [ ] Response time: faster than current (fewer 30B fallbacks needed)
- [ ] Application code updated (`providers.ts`, warmup route)
- [ ] Rollback verified (can switch back to `qwen3:4b` instantly)

### Ongoing Improvement — Done When:

"Done" is a moving target for ongoing improvement. But initial fine-tuning is complete when v1 ships and meets the targets above.

After that, retraining happens on a cadence (monthly or trigger-based) and each version must meet or beat the previous version's scores.

---

## Quick Reference — The Full Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                    REMY IMPROVEMENT                       │
│                                                           │
│  1. TESTING ROADMAP (the exam)                           │
│     └─ 248 tests across 7 phases                         │
│     └─ Measures: safety, accuracy, voice, resilience     │
│     └─ Tells you HOW GOOD Remy is                        │
│                                                           │
│  2. FINE-TUNING ROADMAP (the education)                  │
│     └─ 500+ training conversations                       │
│     └─ QLoRA on qwen3:4b                                 │
│     └─ 3-5 iterations with eval-driven improvement       │
│     └─ Makes Remy SMARTER                                │
│                                                           │
│  3. HARDWARE UPGRADE (the infrastructure)                │
│     └─ RTX 3090 (24GB VRAM)                              │
│     └─ Enables 8B base model + no swap delays            │
│     └─ Makes Remy FASTER                                 │
│                                                           │
│  Pipeline:                                                │
│  Build tests → Establish baseline → Curate data →        │
│  Fine-tune → Test → Analyze failures → Fix data →        │
│  Retrain → Test again → Ship when targets met            │
└─────────────────────────────────────────────────────────┘
```

---

## Files Reference

| What                     | Where                                                 |
| ------------------------ | ----------------------------------------------------- |
| Testing roadmap          | `docs/remy-testing-roadmap.md`                        |
| Fine-tuning roadmap      | `docs/remy-finetuning-roadmap.md` (this file)         |
| Existing training data   | `scripts/remy-eval/training-data/remy-sharegpt.jsonl` |
| Training data generator  | `scripts/remy-eval/generate-training-data.ts`         |
| Eval harness             | `scripts/remy-eval/eval-harness.ts`                   |
| Test cases               | `scripts/remy-eval/test-cases.ts`                     |
| Seed data                | `scripts/remy-eval/seed-remy-test-data.ts`            |
| Eval reports             | `scripts/remy-eval/reports/`                          |
| Remy improvement roadmap | `docs/remy-roadmap.md`                                |
| Feedback table           | `remy_feedback` (Supabase)                            |
| Model config             | `lib/ai/providers.ts`                                 |
| Warmup route             | `app/api/remy/warmup/route.ts`                        |

---

_Testing tells you where you stand. Fine-tuning moves you forward. Hardware removes the ceiling. All three together make Remy great._
