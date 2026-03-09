# Local LLM Optimization Research (March 2026)

Research into making Ollama smarter and more capable. Focus: QUALITY of responses, not speed.

**Current hardware:** Ryzen 9 7900X, 128GB DDR5 RAM, RTX 3050 4GB GPU
**Planned upgrade:** RTX 5060 Ti 16GB
**Current models:** qwen2.5:4b (fast), mistral:latest (standard)

---

## 1. Best Ollama Models for Business/Reasoning (2025-2026)

### The Clear Winners at 8B

**Qwen3-8B** is the strongest all-around 8B model available right now. It leads on GSM SYM p2 benchmark at 87.90% and supports a toggleable "thinking" mode: enable it for reasoning-heavy work, disable it for fast completions. This is directly useful for ChefFlow where some tasks need reasoning (lead scoring analysis, quote drafting) and others need speed (classification, greetings).

**DeepSeek-R1-Distill-Qwen3-8B** is the reasoning champion. It outperforms Google's Gemini 2.5 Flash on AIME 2025 mathematical reasoning tasks and nearly matches Microsoft's Phi 4 reasoning. This 8B model matches the performance of Qwen3-235B-Thinking on certain reasoning tasks. That is a 235B parameter model's reasoning in an 8B package.

### Model Rankings by Task Type

| Task | Best 8B Model | Runner-up |
|------|--------------|-----------|
| Structured business queries (JSON extraction, lead scoring) | Qwen3-8B (nothink mode) | DeepSeek-R1-Distill-Qwen3-8B |
| Natural language generation (emails, drafts, Remy responses) | Qwen3-8B (nothink mode) | Mistral 3 8B |
| Complex reasoning (financial analysis, multi-step logic) | DeepSeek-R1-Distill-Qwen3-8B | Qwen3-8B (think mode) |
| Code generation / structured output | Qwen3-8B | NVIDIA Nemotron Nano 9B |
| Math / calculations | DeepSeek-R1-Distill-Qwen3-8B | Qwen3-8B (think mode) |

### After GPU Upgrade (RTX 5060 Ti 16GB)

The 16GB VRAM opens up 14B models that fully fit in GPU memory:

- **Qwen3-14B** - significant quality jump over 8B, runs comfortably on 16GB VRAM
- **DeepSeek-R1-Distill-Qwen3-14B** - best reasoning in the 14B class
- The RTX 5060 Ti handles 13B-20B models efficiently, delivering ~51 tokens/second at the ~$430 price point
- Performance is approximately 80-85% of RTX 3090 24GB
- 40% faster tokens/sec compared to RTX 4060 Ti 16GB

### Immediate Action Items

1. **Replace `mistral:latest` with `qwen3:8b`** as the standard model. Qwen3-8B beats Mistral on every benchmark that matters for business use.
2. **Replace `qwen2.5:4b` with `qwen3:4b`** as the fast model (or use `qwen3:8b` with nothink mode for fast tasks).
3. **After GPU upgrade:** Move to `qwen3:14b` as standard model, keep `qwen3:8b` (nothink) as fast model.

---

## 2. Fine-Tuning Ollama Models

### Is It Worth It?

Fine-tuning is appropriate when prompt engineering hits a wall: when the knowledge is too deep, too nuanced, or too structural to convey in a system prompt. For ChefFlow, this likely applies to:

- Private chef industry terminology and workflows
- Event management patterns (8-state FSM knowledge)
- Food cost calculations and pricing patterns
- Client communication tone (professional but warm, not corporate)

### Tools

**Unsloth** is the clear winner for consumer hardware fine-tuning:
- 2x faster training, 70% less VRAM than alternatives
- Supports QLoRA (4-bit quantization during training)
- Works with RTX 30-series and up (CUDA Capability 7.0+)
- Supports Qwen3, Llama, Mistral, DeepSeek, Gemma

### Hardware Reality Check

**Current RTX 3050 (4GB VRAM):**
- Can fine-tune ~1B parameter models only (peak VRAM ~2.9GB for 1B)
- A 4B model in 4-bit = ~2GB weights, but training overhead pushes it past 4GB
- A 7B model in 4-bit = ~3.5GB weights, definitely won't fit with training overhead
- **Verdict: Fine-tuning on the 3050 is impractical for useful models**

**After RTX 5060 Ti (16GB VRAM):**
- Can fine-tune 8B models comfortably with QLoRA (4-bit model = ~4GB + training overhead)
- Can likely fine-tune 14B models with aggressive optimization
- **This is where fine-tuning becomes viable**

**CPU-only option (128GB RAM):**
- Unsloth doesn't support CPU training, but other tools (Axolotl, LLaMA Factory) can use CPU
- Extremely slow: days instead of hours for the same job
- Not recommended unless desperate

### Training Data Requirements

- **Minimum useful dataset:** 100-1,000 QA pairs (quality matters more than quantity)
- **Sweet spot:** 500-2,000 carefully curated examples
- **1,000 carefully curated examples > 10,000 mediocre ones**
- Format: instruction/input/output (or question/answer pairs)

### The Fine-Tuning Pipeline

1. Generate synthetic training data using Claude (on non-private data) - see Section 9
2. Curate and clean the dataset (remove garbage, fix formatting)
3. Fine-tune with Unsloth + QLoRA on the 5060 Ti
4. Export to GGUF format (Ollama's native format)
5. Create an Ollama Modelfile pointing to the GGUF
6. Test against the base model on your actual use cases
7. Iterate (adjust data, retrain)

### Time Estimates (RTX 5060 Ti 16GB)

- 8B model, 1,000 examples, QLoRA: ~1-3 hours
- 14B model, 1,000 examples, QLoRA: ~3-6 hours
- Each iteration (tweak data + retrain): same time window

---

## 3. RAG with Ollama

### Architecture Recommendation for ChefFlow

RAG is likely MORE valuable than fine-tuning for ChefFlow because:
- Chef data changes constantly (new clients, events, recipes)
- Fine-tuning bakes knowledge into weights (static)
- RAG retrieves current data at query time (dynamic)

### Embedding Models (Run on Ollama)

| Model | Dimensions | MTEB Retrieval Score | Speed | Best For |
|-------|-----------|---------------------|-------|----------|
| snowflake-arctic-embed | 1024 | 55.98 | Medium | Highest accuracy retrieval |
| mxbai-embed-large | 1024 | 54.39 | Medium | Context-heavy, long questions |
| nomic-embed-text | 768 | 52.81 | Fast | Short/direct questions, large docs |

**Recommendation:** Start with `nomic-embed-text` for speed and simplicity. Move to `snowflake-arctic-embed` if retrieval quality needs improvement.

### Vector Database

**LanceDB is the best fit for ChefFlow:**
- Embedded (no separate server process, like SQLite for vectors)
- Written in Rust (fast, low resource usage)
- Queries directly from disk at near-in-memory speeds (memory-mapped files)
- 100x faster than Parquet on vector queries
- Can search 1 billion vectors in under 100ms
- Works great for desktop/edge applications
- Native JavaScript/TypeScript SDK

**ChromaDB** is the popular default but requires a separate server process. Overkill for a single-user local setup.

**SQLite-vec** is interesting because ChefFlow already uses SQLite-compatible patterns, but it's less mature and has fewer features than LanceDB.

### Chunking Strategy for Business Data

```
Default chunk size: 1024 tokens
Overlap: 200 tokens
```

For ChefFlow specifically:
- **Client profiles:** One chunk per client (name, dietary restrictions, preferences, history)
- **Events:** One chunk per event (details, menu, financials, notes)
- **Recipes:** One chunk per recipe (ingredients, instructions, notes)
- **Financial data:** Chunk by time period (monthly summaries)
- **Conversations:** Chunk by conversation thread

Key insight: "Chunking is where most RAG systems fail silently. Too big retrieves irrelevant paragraphs, too small loses necessary context."

### Implementation Path

1. Install LanceDB (`npm install @lancedb/lancedb`)
2. Pull `nomic-embed-text` on Ollama (`ollama pull nomic-embed-text`)
3. Build an indexing pipeline that embeds and stores business data
4. At query time: embed the question, retrieve top-K chunks, inject into prompt
5. The LLM answers with real, current data instead of hallucinating

---

## 4. Structured Output from Small Models

### Ollama's Native Structured Output

Ollama now supports structured outputs natively via the `format` parameter. You pass a JSON schema and the model is constrained to output valid JSON matching that schema.

```javascript
// Ollama API example
const response = await ollama.chat({
  model: 'qwen3:8b',
  messages: [...],
  format: {
    type: 'object',
    properties: {
      intent: { type: 'string', enum: ['command', 'question', 'greeting'] },
      confidence: { type: 'number' },
      entities: { type: 'array', items: { type: 'string' } }
    },
    required: ['intent', 'confidence']
  }
})
```

This is constrained generation at the token level. The model literally cannot output tokens that would violate the schema. This is a massive improvement over "please output JSON" in the prompt.

### Reliability Numbers

- With schema enforcement: ~98-99% valid structured output
- Without schema enforcement (prompt-only): ~85-95% depending on model
- For the remaining 1-2% failures: retry once, or fall back to a deterministic parser

### Best Practices

1. **Always use the `format` parameter** for JSON extraction. Do not rely on prompt instructions alone.
2. **Keep schemas simple** for small models. Deeply nested objects with many optional fields confuse 4B models.
3. **Set temperature to 0** for structured output tasks (deterministic = reliable).
4. **Use enum constraints** wherever possible (limits the output space).
5. **Combine with few-shot examples** in the prompt to show the model what good output looks like.

### Outlines Library (Alternative)

Outlines converts regex/grammar into token-level constraints using a DFA (deterministic finite automaton). More flexible than JSON schema (can enforce any regex pattern), but requires Python. For Ollama's built-in `format` parameter, this is unnecessary. Outlines is for when you need custom grammars beyond JSON.

---

## 5. Multi-Model Pipelines

### What Ollama Supports Today

Ollama can load multiple models concurrently:
- `OLLAMA_MAX_LOADED_MODELS` controls max loaded models (default: 3 for CPU, 3x GPUs for GPU)
- `OLLAMA_NUM_PARALLEL` controls parallel requests per model (default: auto, 1 or 4)
- Models stay loaded in memory for 5 minutes after last use (configurable via `OLLAMA_KEEP_ALIVE`)

### Current Setup (RTX 3050 4GB + 128GB RAM)

With 4GB VRAM, GPU can only hold one small model. But with 128GB RAM, CPU inference is viable:

**Recommended pipeline:**
- **GPU (4GB):** `qwen3:4b` (Q4_K_M) - fast classification, routing, structured extraction
- **CPU (128GB RAM):** `qwen3:8b` - generation, drafting, complex reasoning

Both can be loaded simultaneously. The fast model handles quick tasks on GPU, the smart model handles complex tasks on CPU. This is exactly what ChefFlow already does with the fast/standard model split.

### After GPU Upgrade (RTX 5060 Ti 16GB)

- **GPU:** `qwen3:14b` (Q4_K_M, ~8-10GB VRAM) - primary model for everything
- **GPU (concurrent):** `qwen3:8b` (Q4_K_M, ~5GB VRAM) - can coexist if VRAM allows
- **CPU fallback:** Any model, using 128GB RAM

With 16GB VRAM, you might fit two models simultaneously:
- 14B Q4 (~8GB) + 8B Q4 (~5GB) = ~13GB, fits in 16GB VRAM
- Both run on GPU = both are fast

### Orchestration Pattern

```
User message -> Classifier (small/fast model, GPU)
  |-> greeting -> instant response (no LLM needed)
  |-> command -> Intent parser (small/fast) -> Executor -> Response generator (large model)
  |-> question -> RAG retrieval -> Response generator (large model)
  |-> complex -> Large model with thinking enabled
```

This is essentially what `remy-classifier.ts` + `command-intent-parser.ts` + `command-orchestrator.ts` already do. The improvement is using better models in each slot.

---

## 6. Prompt Optimization for Small Models

### Critical Finding: Chain-of-Thought Hurts Small Models

**Chain-of-thought prompting only yields performance gains with models ~100B+ parameters.** Smaller models (4B-8B) may write illogical chains of thought that lead to WORSE accuracy than standard prompting.

**Exception:** Qwen3 and DeepSeek-R1 with built-in thinking modes. These were specifically trained for chain-of-thought at small sizes. Use their native `/think` toggle, not manual "let's think step by step" prompts.

### What Works for 4B-8B Models

**1. XML tags for structure (YES, use these)**
```xml
<context>
Client: John Smith, 4 guests, severe nut allergy
Event: Anniversary dinner, $200/person budget
</context>
<task>Draft a menu proposal email</task>
<rules>
- Professional but warm tone
- Mention allergy accommodations prominently
- Include 3 course options
</rules>
```
XML tags help small models identify distinct parts of the prompt. More effective than markdown headers for structured input.

**2. Few-shot examples (YES, 2-3 examples)**
Small models benefit more from few-shot than large models. 2-3 examples of input/output pairs dramatically improve output quality. More than 5 examples starts eating context window with diminishing returns.

**3. System prompt length**
Keep system prompts under 500 tokens for 4B models, under 1000 tokens for 8B models. Longer system prompts degrade output quality as the model loses focus. Put variable context in the user message, not the system prompt.

**4. Be explicit about format**
Small models are bad at inferring format. State exactly what you want:
- "Respond with exactly 3 bullet points"
- "Output a JSON object with keys: intent, confidence, reason"
- "Write exactly 2 sentences"

**5. Avoid ambiguity**
Small models cannot handle "use your judgment." Give clear criteria:
- BAD: "Determine if this is a high-priority lead"
- GOOD: "Score 1-10. Budget over $5000 = +3. Event within 2 weeks = +2. Repeat client = +2. Group over 10 = +1."

### What Hurts Small Models

- Long system prompts (>1000 tokens)
- Manual chain-of-thought ("let's think step by step") on non-thinking models
- Vague instructions ("be creative," "use your best judgment")
- Multiple competing instructions in one prompt
- Asking for both structured output AND natural language in one call

---

## 7. Ollama Configuration Tuning

### Recommended Settings for Business Assistant

**For structured/extraction tasks (classification, JSON output, scoring):**
```
temperature: 0.0-0.1
top_p: 0.85
top_k: 40
repeat_penalty: 1.1
num_ctx: 4096
num_predict: 512
```
Low temperature = deterministic, reliable output. Ideal for Remy classification, intent parsing, lead scoring.

**For generation tasks (email drafts, responses, natural language):**
```
temperature: 0.4-0.6
top_p: 0.9
top_k: 50
repeat_penalty: 1.15
num_ctx: 4096
num_predict: 1024
```
Slightly higher temperature for variety without randomness. Higher repeat_penalty to avoid the repetitive patterns small models fall into.

**For reasoning tasks (analysis, multi-step logic):**
```
temperature: 0.2
top_p: 0.9
top_k: 40
repeat_penalty: 1.1
num_ctx: 8192
num_predict: 2048
```
Longer context window for complex reasoning. Low temperature for accuracy.

### Mirostat (Advanced)

Mirostat dynamically adjusts sampling to maintain consistent "surprise" (perplexity). When using Mirostat:
- Set `mirostat: 2` (Mirostat v2, more stable)
- Set `mirostat_tau: 5.0` (target perplexity, 5.0 is balanced)
- Set `mirostat_eta: 0.1` (learning rate)
- **Disable other samplers:** `top_p: 1.0`, `top_k: 0`, `min_p: 0.0`

Mirostat can produce more coherent long-form text than fixed temperature. Worth testing for Remy's longer responses.

### Context Window (num_ctx)

- Default: 2048 tokens
- **Every doubling of num_ctx roughly doubles VRAM/RAM usage**
- 4096 is the sweet spot for most business tasks
- 8192 for complex reasoning with lots of context
- With 128GB RAM on CPU: you can go to 16384+ if needed
- With RTX 3050 4GB: stick to 2048-4096 for GPU inference

### num_predict

Controls max tokens in the response. Set this explicitly to prevent rambling:
- Classification: 50-100
- JSON extraction: 200-500
- Short responses: 256
- Email drafts: 512-1024
- Long analysis: 1024-2048

---

## 8. Speculative Decoding / Model Cascading

### Speculative Decoding

Uses a small "draft" model to generate candidate tokens, then a larger "verifier" model checks them in parallel. When the draft model guesses correctly (which it does ~70-90% of the time), you get the large model's quality at the small model's speed.

**Ollama status:** Not natively supported as of early 2026. There are open GitHub issues (#5800, #9216) requesting it. llama.cpp (which Ollama wraps) does support speculative decoding.

**vLLM** supports speculative decoding natively and is more mature here. But vLLM is overkill for single-user local inference.

**Practical alternative:** Model cascading (see below).

### Model Cascading (Available Now)

This is what ChefFlow already does with fast/standard models, but can be more aggressive:

```
1. Try with small/fast model first
2. If confidence is low or output is poor, retry with large model
3. If still poor, retry with large model + thinking mode
```

Implementation:
```typescript
// Pseudo-code for cascading
async function smartQuery(prompt: string, schema: JSONSchema) {
  // Level 1: Fast model
  const fast = await ollama.chat({ model: 'qwen3:4b', ... })
  if (fast.confidence > 0.9) return fast

  // Level 2: Standard model
  const standard = await ollama.chat({ model: 'qwen3:8b', ... })
  if (standard.confidence > 0.8) return standard

  // Level 3: Standard model with thinking
  const deep = await ollama.chat({ model: 'qwen3:8b', think: true, ... })
  return deep
}
```

This gives you fast responses 80% of the time and quality responses when needed, without speculative decoding support.

---

## 9. Knowledge Distillation

### The Concept

Use Claude/GPT-4 to generate high-quality training data, then fine-tune your local model on that data. The local model learns to mimic the large model's behavior on your specific domain.

### What's Legal/Allowed

- **OpenAI (GPT-4):** Terms of service explicitly prohibit using outputs to train competing models. Gray area.
- **Anthropic (Claude):** Similar restrictions. However, using Claude to generate *synthetic examples* (not direct output copying) for internal use is generally accepted.
- **Best practice:** Use Claude/GPT-4 to generate *training data templates and patterns*, not to directly produce the fine-tuning dataset verbatim.

### The Pipeline for ChefFlow

**Step 1: Define your domain tasks** (50-100 task templates)
```
- "Given this client profile, draft a follow-up email"
- "Given this event brief, extract structured fields"
- "Given this inquiry, score the lead 1-100"
- "Given this financial summary, identify anomalies"
```

**Step 2: Generate synthetic examples using Claude** (non-private data only)
- Use Claude to generate 10-20 high-quality examples per task template
- Use fictional but realistic client names, events, menus
- Total: 500-2,000 training examples

**Step 3: Format as instruction-tuning dataset**
```json
{
  "instruction": "Draft a follow-up email for this inquiry",
  "input": "Client: Jane Doe, Event: Wedding reception for 50, Budget: $150/person, Date: June 15, Dietary: 3 vegetarian, 1 gluten-free",
  "output": "Hi Jane,\n\nThank you for reaching out about your wedding reception..."
}
```

**Step 4: Fine-tune with Unsloth** (after GPU upgrade)
- QLoRA on Qwen3-8B or 14B
- ~1,000 examples, ~2-4 hours on RTX 5060 Ti

**Step 5: Test and iterate**
- Compare fine-tuned model output against base model on real tasks
- If quality improved, deploy; if not, add more/better training data

### Expected Quality Improvement

Research shows 1,500 synthetic training samples (generated by Claude) can significantly improve a small model's domain performance. The key is quality and diversity of examples, not raw volume.

---

## 10. Ollama Alternatives and Complements

### Should You Switch from Ollama?

**No.** Ollama remains the best choice for ChefFlow's use case.

| Engine | Best For | Why Not for ChefFlow |
|--------|----------|---------------------|
| **Ollama** | Development, single-user, simplicity | **Current choice. Keep it.** |
| **vLLM** | High-throughput production (100+ concurrent users) | Overkill. Designed for multi-user API serving. Complex setup. |
| **llama.cpp** | Maximum control, edge devices, custom builds | Ollama wraps it already. Going direct = more work for no gain. |
| **LocalAI** | Multi-modal orchestration, enterprise middleware | Too heavy for single-user. |
| **LM Studio** | Beginners, GUI-first users | GUI-only, not API-first. |
| **Jan.ai** | Consumer chat interface | Not designed for programmatic integration. |

### When to Consider vLLM

Only if ChefFlow scales to multi-tenant with many concurrent Remy users hitting the same server. At that point, vLLM's PagedAttention and continuous batching would matter. For a single developer's PC running one chef's Remy, Ollama is perfect.

### Ollama's Key Advantages

1. **One-command model management:** `ollama pull qwen3:8b` and you're running
2. **OpenAI-compatible API:** Drop-in replacement, easy integration
3. **Auto-quantization:** Handles GGUF format, quantization variants automatically
4. **Concurrent model loading:** Run classifier and generator simultaneously
5. **Native structured output:** JSON schema enforcement at token level
6. **Active development:** Thinking mode, structured output, multi-GPU all added in 2025

### What Ollama Lacks (and Workarounds)

| Missing Feature | Workaround |
|----------------|-----------|
| Speculative decoding | Use model cascading (Section 8) |
| Built-in RAG | Build with LanceDB + nomic-embed-text (Section 3) |
| Fine-tuning | Use Unsloth externally, import GGUF (Section 2) |
| Token-level streaming metadata | Parse thinking blocks manually (already done in ChefFlow) |

---

## Priority Action Plan

### Immediate (This Week, Zero Cost)

1. **Pull and test `qwen3:8b`** - `ollama pull qwen3:8b`
2. **Pull and test `deepseek-r1:8b`** - `ollama pull deepseek-r1:8b`
3. **Benchmark both against current models** on actual Remy test suite
4. **Switch standard model** from `mistral:latest` to whichever wins
5. **Switch fast model** from `qwen2.5:4b` to `qwen3:4b` (or `qwen3:8b --nothink`)
6. **Tune Ollama parameters** per Section 7 recommendations
7. **Enable structured output** via `format` parameter where ChefFlow currently uses prompt-based JSON extraction

### Short-Term (After GPU Upgrade)

8. **Pull `qwen3:14b`** and test as primary model
9. **Run dual-model on GPU:** 14B (primary) + 8B (fast) simultaneously
10. **Set up RAG pipeline:** LanceDB + nomic-embed-text + business data indexing
11. **Begin synthetic data generation** using Claude for fine-tuning dataset

### Medium-Term (1-2 Months After GPU)

12. **Fine-tune Qwen3-8B or 14B** on ChefFlow domain data using Unsloth + QLoRA
13. **A/B test fine-tuned vs base model** on Remy test suite
14. **Implement model cascading** for automatic quality escalation
15. **Build RAG index** for client profiles, event history, recipe book

---

## Sources

- [Best Ollama Models 2025: Complete Performance Guide](https://collabnix.com/best-ollama-models-in-2025-complete-performance-comparison/)
- [Best Open Source LLM 2026 Rankings](https://whatllm.org/blog/best-open-source-models-january-2026)
- [Qwen3: Best Open-Sourced LLM](https://medium.com/data-science-in-your-pocket/qwen3-best-open-sourced-llm-beats-deepseek-r1-llama4-fd6c93d722c7)
- [Top 10 Open-source Reasoning Models in 2026](https://www.clarifai.com/blog/top-10-open-source-reasoning-models-in-2026)
- [Unsloth Fine-tuning Guide](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide)
- [How to Fine-Tune LLMs on RTX GPUs With Unsloth (NVIDIA)](https://blogs.nvidia.com/blog/rtx-ai-garage-fine-tuning-unsloth-dgx-spark/)
- [Fine-Tuning an LLM on 4GB VRAM](https://hasankirtas.medium.com/fine-tuning-an-llm-on-4gb-vram-four-attempts-two-crashes-one-working-model-d0e31e082909)
- [QLoRA Fine-Tuning with Unsloth: Complete Guide](https://medium.com/@matteo28/qlora-fine-tuning-with-unsloth-a-complete-guide-8652c9c7edb3)
- [Qwen3.5 Fine-tuning Guide (Unsloth)](https://unsloth.ai/docs/models/qwen3.5/fine-tune)
- [Local RAG Without the Cloud](https://www.sitepoint.com/local-rag-private-documents/)
- [Building a Private RAG System with Ollama](https://markaicode.com/ollama-rag-private-documents/)
- [SQLite-vec for Fast Local Vector Search](https://dev.to/aairom/embedded-intelligence-how-sqlite-vec-delivers-fast-local-vector-search-for-ai-3dpb)
- [13 Best Embedding Models in 2026](https://elephas.app/blog/best-embedding-models)
- [Best Ollama Embedding Models for RAG](https://www.arsturn.com/blog/picking-the-perfect-partner-a-guide-to-choosing-the-best-embedding-models-in-ollama)
- [LanceDB vs ChromaDB Comparison](https://zilliz.com/comparison/chroma-vs-lancedb)
- [Vector Databases: Lance vs Chroma](https://medium.com/@patricklenert/vector-databases-lance-vs-chroma-cc8d124372e9)
- [Ollama Structured Outputs Blog](https://ollama.com/blog/structured-outputs)
- [Structured Outputs Documentation](https://docs.ollama.com/capabilities/structured-outputs)
- [Constraining LLMs with Structured Output: Ollama, Qwen3 & Python](https://www.glukhov.org/post/2025/09/llm-structured-output-with-ollama-in-python-and-go/)
- [Reliable Structured Output from Local LLMs](https://markaicode.com/ollama-structured-output-pipeline/)
- [Ollama vs vLLM vs LM Studio: Best Way to Run LLMs Locally in 2026](https://www.glukhov.org/post/2025/11/hosting-llms-ollama-localai-jan-lmstudio-vllm-comparison/)
- [Ollama vs vLLM: Deep Dive Performance Benchmarking (Red Hat)](https://developers.redhat.com/articles/2025/08/08/ollama-vs-vllm-deep-dive-performance-benchmarking)
- [Complete Guide to Ollama Alternatives 2026](https://localllm.in/blog/complete-guide-ollama-alternatives)
- [How Ollama Handles Parallel Requests](https://www.glukhov.org/llm-performance/ollama/how-ollama-handles-parallel-requests/)
- [Optimizing Ollama Performance on Windows](https://medium.com/@kapildevkhatik2/optimizing-ollama-performance-on-windows-hardware-quantization-parallelism-more-fac04802288e)
- [Ollama FAQ: Concurrent Models](https://docs.ollama.com/faq)
- [Speculative Decoding Ollama Issue #5800](https://github.com/ollama/ollama/issues/5800)
- [SpecBundle & SpecForge: Production-Ready Speculative Decoding](https://lmsys.org/blog/2025-12-23-spec-bundle-phase-1/)
- [LLM Distillation Demystified (Snorkel AI)](https://snorkel.ai/blog/llm-distillation-demystified-a-complete-guide/)
- [Teaching Local Models to Call Tools Like Claude](https://tomtunguz.com/distilling-claude-into-local-models/)
- [Prompt Engineering for Small LLMs: LLaMA 3B, Qwen 4B, Phi-3 Mini](https://maliknaik.medium.com/prompt-engineering-for-small-llms-llama-3b-qwen-4b-and-phi-3-mini-de711d38a002)
- [Chain-of-Thought Prompting Guide](https://www.promptingguide.ai/techniques/cot)
- [LLM Sampling Parameters Guide](https://smcleod.net/2025/04/llm-sampling-parameters-guide/)
- [Ollama Modelfile Reference](https://docs.ollama.com/modelfile)
- [Setting Parameters in Ollama Models](https://www.tspi.at/2025/08/10/ollamaparams.html)
- [Ollama Thinking Mode Documentation](https://docs.ollama.com/capabilities/thinking)
- [Best Local LLMs for RTX 50 Series GPU](https://apxml.com/posts/best-local-llms-for-every-nvidia-rtx-50-series-gpu)
- [RTX 5060 Ti LocalScore Benchmarks](https://www.localscore.ai/accelerator/860)
- [RTX 5060 Ollama Benchmarks](https://www.databasemart.com/blog/ollama-gpu-benchmark-rtx5060)
- [Dual RTX 5060 Ti vs RTX 3090 for Local LLMs](https://www.hardware-corner.net/guides/dual-rtx-5060-ti-16gb-vs-rtx-3090-llm/)
