# State of the Art: AI Assistants in 2025-2026

## What the Best Teams Are Doing That We're NOT Doing

Research conducted March 2026. Focused on actionable techniques for Remy (local Ollama, 4B-8B models, private chef business domain).

---

## 1. RAG (Retrieval-Augmented Generation)

### What the best teams are doing

**Hybrid Search (BM25 + Vector Embeddings + Reranking)** is now the production standard. Pure vector search or pure keyword search alone is considered outdated. The winning formula:

1. **BM25** for exact keyword matches (fast, handles proper nouns like client names perfectly)
2. **Vector embeddings** for semantic similarity (understands "revenue" and "income" mean the same thing)
3. **Reranking** with a cross-encoder model that rescores the merged results for precision

Precision improves from ~0.68 (BM25 alone) to ~0.87 (hybrid). Companies like Vespa, Weaviate, and Meilisearch have this built in.

**Context Window Reality Check:** Research from arxiv (2509.21361) found most models have severe accuracy degradation by 1000 tokens in context, falling far short of their advertised maximums. RAG accuracy can reach near 100% if you stay under the maximum *effective* context window, but *worsens* performance when exceeding it. For small models like Qwen3 4B, this means aggressive chunking and retrieval precision matters more than stuffing context.

**Granularity-Aware Retrieval:** Top systems optimize retrieval unit size. LongRAG retrieves compressed long-context chunks. FILCO filters irrelevant spans from passages before feeding them to the model. The key insight: retrieve less, but retrieve better.

### What Remy is missing

Remy has ZERO RAG capability. When a chef asks "How much has the Johnson family spent?", Remy calls a server action that queries the database directly. This works for structured queries but completely fails for:
- "What did I tell Sarah about her allergies last month?" (needs conversation history search)
- "Show me events similar to the Henderson wedding" (needs semantic similarity)
- "What's my policy on cancellations?" (needs document/note search)
- Any query across unstructured data (notes, emails, past conversations)

### Recommendation: Implement Local RAG

**Difficulty:** Medium (2-3 days for basic, 1-2 weeks for production-grade)
**Works with Ollama:** Yes, fully

**Implementation plan:**
1. **Embedding model:** `nomic-embed-text` via Ollama (768 dimensions, outperforms OpenAI ada-002, runs locally, free)
2. **Vector storage:** SQLite-vec (30MB memory footprint, runs anywhere, no Docker needed, pure C with no dependencies). Alternatively, store vectors in Supabase's pgvector extension (already available).
3. **Hybrid search:** BM25 keyword search (use Supabase's built-in full-text search) + vector similarity search + merge with Reciprocal Rank Fusion (RRF)
4. **Index these data sources:**
   - Client notes and conversation summaries
   - Event descriptions and AAR (After Action Report) summaries
   - Recipe names and descriptions
   - Email threads (already in Supabase from GOLDMINE)
   - Chef's own business notes/preferences

**What NOT to do:** Don't use ChromaDB, Pinecone, Qdrant, or any external vector DB. They add infrastructure complexity. SQLite-vec or Supabase pgvector keeps everything local and simple.

**Key architecture decision:** Embed at write time (when data is created/updated), not at query time. This means embedding calls happen in the background when a chef saves a note, creates an event, or receives an email. Queries stay fast.

---

## 2. Small Model Optimization

### What the best teams are doing

**Quantization is table stakes.** Everyone running local models uses Q4_K_M or Q5_K_M quantization. This reduces model size by ~75% with minimal quality loss. Ollama handles this automatically.

**The real gains come from:**

1. **Model selection matters more than optimization.** Qwen3-4B outperforms Qwen2.5-7B on most benchmarks. The tiny Qwen3-4B rivals Qwen2.5-72B-Instruct on reasoning tasks. Model architecture improvements (2025-2026) have made small models dramatically more capable.

2. **Thinking mode control.** Qwen3 has a dual-mode system: thinking mode (generates `<think>...</think>` blocks for complex reasoning) and non-thinking mode (fast, direct responses). For Qwen3.5 small models (0.8B-9B), reasoning is disabled by default. You can toggle per-request with `/think` and `/no_think` in the prompt.

3. **Structured output via GBNF grammar.** Ollama v0.5+ supports JSON schema constraints during generation. The grammar masks invalid tokens during sampling, guaranteeing valid JSON output. This eliminates parsing failures and actually speeds up generation (fewer tokens generated).

4. **Ollama 0.17 performance gains.** Released Feb 2026: 40% faster prompt processing, 18% faster token generation on NVIDIA GPUs. Improved tensor parallelism for multi-GPU setups. Better concurrent request handling.

### What Remy is missing

- Remy already uses Qwen3:4b for fast tasks and a larger model for complex tasks. This is good.
- Remy already uses structured JSON output via Zod schemas. This is good.
- **Missing:** Thinking mode control. Remy should explicitly disable thinking for classification/routing (speed) and enable it for complex analysis (revenue breakdowns, scheduling conflicts). Currently, Remy has a ThinkingBlockFilter that strips think tags post-generation, but doesn't control whether thinking happens in the first place.

### Recommendation: Add Thinking Mode Control

**Difficulty:** Easy (1-2 hours)
**Works with Ollama:** Yes

Add `/no_think` to system prompts for:
- Intent classification (remy-classifier.ts)
- Simple lookups and greetings
- Conversational responses

Add `/think` to system prompts for:
- Financial analysis questions
- Scheduling conflict detection
- Multi-step planning (event logistics)
- Recipe scaling calculations

---

## 3. Fine-Tuning Local Models on Domain Data

### What the best teams are doing

**Tools:**
- **Unsloth** (recommended for beginners, 2x faster, 70% less VRAM than Flash Attention 2)
- **Axolotl** (recommended for flexibility, sensible defaults, strong community)
- **LlamaFactory** (ACL 2024 paper, 100+ model support)

**Key facts:**
- QLoRA (4-bit quantized base + LoRA adapters) lets you fine-tune 8B models on a single GPU with 8GB VRAM
- Trainable parameters: only 0.3% of the original model
- Training time: 15 minutes to 15 hours depending on dataset size and hardware
- Dataset requirements: as few as 100-1000 high-quality examples for preference alignment; 1000-10000 for domain adaptation
- Qwen3-8B fine-tuning fits in 8GB VRAM with batch size 1 and LoRA rank 32

**What companies fine-tune for:**
- Domain terminology (private chef jargon: "covers", "mise en place", "plating", "family style")
- Response style (matching the chef's brand voice)
- Task-specific accuracy (better at extracting event details from natural language)
- Tool-calling reliability (ensuring the model picks the right function)

### What Remy is missing

Remy uses off-the-shelf Qwen3 models. No domain adaptation. The model doesn't know what a "cover" is in chef context, doesn't understand typical event pricing structures, and doesn't have chef-specific business vocabulary.

### Recommendation: Create a Fine-Tuning Dataset (Not Fine-Tune Yet)

**Difficulty:** Medium (dataset creation is the hard part, ~1 week to curate)
**Works with Ollama:** Yes (export GGUF, import to Ollama)

**Phase 1 (do now):** Start collecting training data. Every time Remy gets something wrong, log the input, wrong output, and correct output. Build a dataset of 500+ examples covering:
- Chef business queries and correct responses
- Intent classification edge cases (the ones regex misses)
- Tool-calling examples (input -> correct tool + parameters)
- Chef-specific terminology mappings

**Phase 2 (when dataset reaches 500+ examples):** Fine-tune Qwen3-8B using Unsloth + QLoRA on a consumer GPU. Export as GGUF. Import to Ollama as a custom model.

**Phase 3 (optional):** Fine-tune a small (1.7B-4B) model specifically for intent classification, making it faster and more accurate than the general-purpose model.

**Why not fine-tune now:** The dataset doesn't exist yet. Fine-tuning with bad data produces a worse model. Data quality > data quantity > model size.

---

## 4. Intent Classification

### What the best teams are doing

The industry has split into two camps:

**Camp 1: Embedding-based classification (Rasa, enterprise chatbots)**
- Train a small classifier model on labeled intent data
- Use sentence embeddings (all-MiniLM-L6-v2 or similar) to convert user messages to vectors
- Compare against intent vectors using cosine similarity
- Extremely fast (14.7ms per classification), highly accurate for known intents
- Requires a labeled dataset of 50-200 examples per intent

**Camp 2: LLM-based classification (Botpress, newer systems)**
- Send the message to an LLM with intent descriptions
- Zero-shot or few-shot classification
- More flexible (handles new intents without retraining)
- Slower (100ms-2s depending on model)

**Camp 3 (best practice): Hybrid cascade**
1. Regex/keyword patterns for obvious cases (instant, 0ms)
2. Embedding similarity for moderate confidence cases (15ms)
3. LLM fallback for truly ambiguous cases (1-3s)

**Rasa's evolution (2025):** Moved from pure intent-based ML to LLM-augmented conversation design (CALM). The key insight: traditional intent classification breaks down with open-ended user input. The future is "semantic routing" where messages are embedded and routed to the nearest handler based on vector similarity.

### What Remy has

Remy already implements a hybrid approach:
1. **Regex patterns** (COMMAND_PATTERNS, QUESTION_PATTERNS, QUESTION_SHAPED_COMMANDS) for deterministic classification
2. **Ollama LLM fallback** for ambiguous messages

This is decent but has a gap: there's no middle layer. Messages that don't match regex go straight to a 30B model call (slow, expensive). An embedding-based classifier in the middle would catch 90% of the remaining cases in 15ms instead of 2-5 seconds.

### Recommendation: Add Embedding-Based Intent Classification Layer

**Difficulty:** Medium (2-3 days)
**Works with Ollama:** Yes (use nomic-embed-text for embeddings)

**Implementation:**
1. Create a set of ~200 example messages labeled with intents (pull from test-remy-sample.mjs test cases)
2. Pre-compute embeddings for all examples using nomic-embed-text via Ollama
3. At classification time: embed the user message, find nearest examples by cosine similarity
4. If similarity > 0.85: use that intent (skip LLM call entirely)
5. If similarity 0.7-0.85: use as hint, confirm with LLM
6. If similarity < 0.7: full LLM classification

**Expected result:** Reduces LLM classification calls by ~80%, making most responses 2-5 seconds faster.

---

## 5. Conversation Memory and Context Management

### What the best teams are doing

**The MemGPT/Letta approach (OS-inspired memory hierarchy):**

| Memory Tier | Description | Analogy | In Context? |
|-------------|-------------|---------|-------------|
| Core Memory | Key facts about user, always present | RAM | Always |
| Conversation Memory | Recent message history (FIFO queue) | L2 Cache | Always (truncated) |
| Recall Memory | Searchable past conversations | Hard Drive | On demand |
| Archival Memory | Long-term knowledge base | Cold Storage | On demand |

The model manages its own memory through tool calls: writing to core memory, searching archival memory, and recalling past conversations. This requires strong instruction-following capability. GPT-4 handles it well; small open models may struggle.

**Zep's approach (temporal knowledge graph):**
- Stores facts with timestamps
- Marks earlier facts as outdated when superseded
- Builds a graph of entities and relationships
- Very close to how humans remember conversations

**Mem0's approach (self-hosted, Ollama-compatible):**
- Pluggable vector store (Qdrant, pgvector, Chroma)
- Local Ollama for embeddings and LLM
- Simple API: `m.add("fact", user_id="chef")` and `m.get_all(user_id="chef")`
- Can run fully self-hosted with Docker (pgvector + Neo4j for graph)

**LangMem (LangChain's answer):**
- Three memory types: semantic (facts), procedural (how-to), episodic (past experiences)
- SDK focused on agent memory management

### What Remy has

Remy stores conversations in browser IndexedDB (privacy-first, no server). This means:
- Conversations are lost when the browser is cleared
- No cross-device memory
- No searchable history
- No entity extraction or knowledge graph
- No "remember that Sarah is allergic to shellfish" persistence
- Each conversation starts from zero context

### Recommendation: Implement Tiered Memory with Mem0

**Difficulty:** High (1-2 weeks)
**Works with Ollama:** Yes (Mem0 fully supports local Ollama)

**Architecture:**
1. **Core Memory** (always in prompt): Chef profile, top 5 clients, active events, business preferences. Stored in Supabase, loaded at conversation start. Updated via explicit "remember this" commands or automatic entity extraction.

2. **Conversation Summary Memory**: After each conversation, summarize key facts and decisions using Ollama. Store summaries in Supabase. Load relevant summaries based on current conversation context.

3. **Entity Memory**: Extract entities (client names, dates, amounts, preferences) from conversations. Store in a structured format. When a chef mentions "Sarah", automatically retrieve: last event, allergies, outstanding balance, conversation history.

4. **Searchable Archive**: Vector-embed all conversation summaries. When context is needed, retrieve the most relevant past conversations via similarity search.

**Simpler alternative (start here):** Skip Mem0. Just implement conversation summaries + entity extraction using Ollama, stored in Supabase. This gets 80% of the value with 20% of the complexity.

---

## 6. Agentic AI Patterns

### What the best teams are doing

**LangGraph (recommended for complex workflows):**
- Graph-first architecture: nodes = actions, edges = conditional routing
- State machine with explicit state management
- Supports loops, branching, error recovery
- Traceable and debuggable

**CrewAI (recommended for role-based task splitting):**
- Lean, standalone framework (no LangChain dependency)
- Optimized for speed and minimal resource usage
- Well-defined agent roles

**Key patterns that work:**

1. **Plan-Execute-Reflect loop:** The agent plans steps, executes them, reflects on results, replans if needed. Prevents blind tool-calling.

2. **Tool use with structured schemas:** Define tools as typed functions with JSON schema inputs. The model generates function calls that are validated before execution.

3. **State persistence:** Agent state survives across requests. The agent "remembers" what it was doing and can resume multi-step tasks.

4. **Human-in-the-loop gates:** For destructive actions (sending emails, creating events), pause and ask for confirmation before executing.

5. **Observability-driven development:** Log every agent decision, tool call, and result. Build evaluation datasets from production logs.

### What Remy has

Remy has a basic agentic pattern:
1. Classify intent (classifier)
2. Parse task type (command-intent-parser)
3. Execute via handler (command-orchestrator)

This is a single-step pipeline. No planning, no reflection, no multi-step execution, no state persistence between messages.

### Recommendation: Add Plan-Execute Pattern for Complex Queries

**Difficulty:** Medium-High (1 week)
**Works with Ollama:** Yes, but requires a model with good instruction-following (Qwen3-8B minimum)

**For simple queries** (80% of traffic): Keep the current single-step pipeline. It's fast and works.

**For complex queries** (multi-step, requiring multiple data sources):
1. **Planning step:** Given the query, generate a plan of 2-5 steps (which tools to call, in what order)
2. **Execute steps sequentially:** Call each tool, collect results
3. **Synthesize:** Combine all results into a final response
4. **Example:** "Compare my revenue this month to last month and identify my top 3 clients" requires: (a) get this month's revenue, (b) get last month's revenue, (c) get client list sorted by spend, (d) synthesize comparison

**Don't overcomplicate this.** The plan doesn't need to be dynamic. A simple deterministic decision tree based on query type would work for most cases. Save the LLM planning for genuinely novel multi-step requests.

---

## 7. Prompt Engineering for Small Models

### What the best teams are doing

**Chain-of-Thought (CoT) has a critical limitation:** It achieves performance gains primarily with models of ~100B+ parameters. Smaller models may produce illogical chains that *reduce* accuracy. This is counterintuitive but well-documented.

**What DOES work for small models:**

1. **Role assignment + constraints:** "You are a private chef business assistant. You ONLY answer questions about the chef's business. You respond in 1-3 sentences unless more detail is requested."

2. **Few-shot examples in the prompt:** Show 3-5 examples of input/output pairs. Small models are much better at pattern matching from examples than following abstract instructions.

3. **Structured output format instructions:** "Return JSON with keys: answer, confidence, sources" works better than "explain your reasoning step by step."

4. **Negative constraints:** "Do NOT make up data. Do NOT suggest recipes. Do NOT use em dashes." Small models respond well to explicit prohibitions.

5. **ReAct (Reasoning + Acting) with caution:** Works for tool-calling scenarios but requires careful prompt design. For Qwen3 specifically, Hermes-style tool use is recommended over ReAct because the model may output stop words in think sections that break tool call parsing.

### What Remy has

Remy's prompts are decent but could be improved:
- The classifier prompt is well-structured with examples
- Command/question routing uses few-shot patterns
- Some prompts are verbose (waste tokens on small context windows)

### Recommendation: Optimize Prompts for Small Models

**Difficulty:** Easy (half a day)
**Works with Ollama:** Yes

1. **Replace verbose instructions with few-shot examples.** Instead of explaining what a "command" is in 20 lines, show 5 examples.
2. **Add explicit output format constraints** to every prompt that expects structured data.
3. **Remove chain-of-thought prompting** from any prompt targeting the 4B model. Add it only for the 8B+ model on complex tasks.
4. **Use Hermes-style tool calling** for Qwen3 instead of custom tool-call formats.
5. **Minimize system prompt size.** Every token in the system prompt reduces the space available for user context. Aim for < 500 tokens for classification prompts, < 1000 tokens for response generation.

---

## 8. Evaluation and Testing

### What the best teams are doing

**DeepEval** is the leading open-source LLM evaluation framework (think "pytest for LLMs"):
- 50+ evaluation metrics with research backing
- Supports RAG, agents, and chatbots
- Regression testing: run model A vs model B on 1000 prompts, get comparison reports
- CI/CD integration: catch regressions before deployment
- Multi-turn conversation evaluation

**Key metrics that matter:**
- **Answer relevancy:** Does the response address the question?
- **Faithfulness:** Is the response grounded in provided context (not hallucinated)?
- **Contextual precision:** Did the retrieval system find the right documents?
- **Latency:** Time to first token, total response time
- **Task completion rate:** Did the assistant successfully complete the requested action?

**Production monitoring:**
- Log every interaction with input, output, latency, and user feedback
- Build evaluation datasets from production data
- Run weekly regression suites against the latest model
- A/B test prompt changes before rolling out

### What Remy has

Remy has a good testing foundation:
- `test-remy-sample.mjs` (30 tests, ~10 min)
- `test-remy-full.mjs` (100 tests, 50-100 min)
- JSON test reports in `docs/remy-daily-reports/`
- Tests measure: correct intent classification, correct tool routing, response quality

### Recommendation: Add Automated Regression Testing

**Difficulty:** Medium (3-5 days)
**Works with Ollama:** Yes

1. **Formalize the test suite** into a structured format: input, expected_intent, expected_tool, expected_output_contains, max_latency_ms
2. **Add a "golden dataset"** of 200+ test cases covering every known edge case (pull from existing test scripts + production failures)
3. **Run on every model change:** When switching from Qwen3:4b to a new model, run the full suite and compare pass rates
4. **Track metrics over time:** Pass rate, average latency, classification accuracy. Store in a JSON file or simple DB. Visualize trends.
5. **Consider DeepEval** for more sophisticated metrics (faithfulness, relevancy scoring) but only if the simpler metrics plateau.

---

## 9. Local/Private AI Deployments

### What the best teams are doing

**Apple Intelligence (the gold standard for privacy-first AI):**
- ~3B parameter on-device model for local tasks
- Dynamic LoRA adapter loading: tiny adapters (~10MB) are swapped on the fly to specialize the model for different tasks (summarization, writing, classification)
- Private Cloud Compute (PCC) for complex tasks: end-to-end encrypted, data never stored, cryptographically verified nodes
- Key insight: **use task-specific adapters instead of one general model**

**The quality gap is closing:**
- Qwen3-4B rivals Qwen2.5-72B on reasoning benchmarks
- Model architecture improvements (2024-2026) have been dramatic
- For domain-specific tasks, a fine-tuned small model often beats a general-purpose large model

**Privacy infrastructure patterns:**
- Data never leaves the device for simple tasks
- Complex tasks use encrypted compute enclaves
- No data is stored after processing
- Audit logs prove no data was retained

### What Remy has

Remy is already privacy-first:
- All AI runs through Ollama locally
- OllamaOfflineError hard-fails (never falls back to cloud)
- Conversation data in browser IndexedDB (never on server)
- Private data categories are documented and enforced

### Recommendation: Implement Dynamic LoRA Adapter Loading

**Difficulty:** Hard (2-4 weeks, requires fine-tuning infrastructure first)
**Works with Ollama:** Partially (Ollama supports custom models but not dynamic adapter swapping yet)

**Long-term vision:** Instead of one Qwen3:8B model for everything, have:
- Base Qwen3:8B model
- `remy-classifier` adapter: tuned specifically for intent classification
- `remy-chef-chat` adapter: tuned for conversational chef business responses
- `remy-data-extract` adapter: tuned for extracting structured data from text
- `remy-email-draft` adapter: tuned for professional email drafting

Each adapter is ~10MB. Swap at request time based on the task. This is exactly what Apple does with Apple Intelligence.

**Short-term (do now):** Skip adapter swapping. Just use different Ollama model names for different tasks (you already do this with modelTier 'fast' vs 'complex'). Document which tasks use which model so you can fine-tune task-specific models later.

---

## 10. Proactive AI Assistants

### What the best teams are doing

**The shift from reactive to proactive (2025-2026):**
- AI assistants with persistent memory now offer suggestions, reminders, and next steps based on stored context
- Proactive insights are triggered by events, not user queries
- The key challenge: being helpful without being annoying

**Patterns that work:**

1. **Event-driven triggers:** When data changes (new inquiry, payment received, event tomorrow), check if the chef should know about it
2. **Anomaly detection with context:** Don't just flag "revenue is down 20%", explain "Revenue is down 20% this month compared to the same month last year, primarily because you had 3 fewer events. Your average event revenue is actually up."
3. **Grouped alerts:** 5 similar anomalies = 1 grouped notification, not 5 separate pings
4. **Time-aware suggestions:** "Good morning" triggers a daily briefing. "End of month" triggers a financial summary. "Day before event" triggers a prep checklist.
5. **Confidence thresholds:** Only surface proactive insights above a confidence threshold. Low-confidence observations go to a "maybe" queue the chef can review later.

**Enterprise trends (Gartner):** 75%+ of enterprises will operationalize AI-driven business analytics by 2026. The gap is between AI generating insights and teams acting on them.

### What Remy has

Remy already has some proactive features:
- Morning briefing on "Good morning"
- Some financial analysis capabilities
- Temperature log anomaly detection

But these are reactive (chef must ask). True proactive behavior would be:
- Push notification when an inquiry hasn't been responded to in 24 hours
- Alert when an event is 3 days away and no menu is finalized
- Monthly revenue summary auto-generated on the 1st
- Warning when a regular client hasn't booked in 6 months

### Recommendation: Add Event-Driven Proactive Alerts

**Difficulty:** Medium (1 week)
**Works with Ollama:** Partially (triggers are deterministic, AI generates the message content)

**Implementation:**
1. **Define trigger conditions** (all deterministic, no AI needed):
   - Inquiry age > 24 hours without response
   - Event in < 72 hours with no finalized menu
   - Client hasn't booked in > 180 days
   - Revenue this month < 80% of same month last year
   - Payment overdue by > 7 days

2. **Run a scheduled check** (cron job or on-login scan) that evaluates all triggers

3. **Generate human-friendly messages** using Ollama: "Hey, the Henderson inquiry from Tuesday is still waiting for a response. Want me to draft a reply?"

4. **Surface in Remy's greeting:** When the chef opens Remy, show proactive alerts at the top before the chat input

5. **Respect "snooze":** Let chefs dismiss alerts. Don't re-show dismissed alerts.

---

## Priority Matrix: What to Implement First

| Priority | Feature | Effort | Impact | Why |
|----------|---------|--------|--------|-----|
| 1 | Thinking mode control (/think, /no_think) | 2 hours | Medium | Free speed boost, zero risk |
| 2 | Prompt optimization for small models | 4 hours | Medium | Immediate quality improvement |
| 3 | Embedding-based intent classification | 2-3 days | High | Eliminates 80% of slow LLM classification calls |
| 4 | Proactive event-driven alerts | 1 week | High | Biggest UX improvement, mostly deterministic |
| 5 | Basic RAG (vector search on client data) | 1-2 weeks | Very High | Unlocks entirely new query categories |
| 6 | Conversation summary memory | 1 week | High | Remy gets persistent context |
| 7 | Automated regression test suite | 3-5 days | Medium | Prevents quality regressions |
| 8 | Fine-tuning dataset collection | Ongoing | Future High | Foundation for all future model improvements |
| 9 | Full tiered memory (Mem0-style) | 2 weeks | Very High | Remy becomes truly personalized |
| 10 | Plan-Execute agentic pattern | 1 week | Medium | Only needed for complex multi-step queries |
| 11 | Dynamic LoRA adapters | 2-4 weeks | High | Requires fine-tuning infrastructure first |

---

## Technology Stack Recommendations

### Embedding Model
**nomic-embed-text** via Ollama
- 768 dimensions, outperforms OpenAI text-embedding-ada-002
- Runs locally, zero cost
- Long context support (up to 8192 tokens)
- `ollama pull nomic-embed-text`

### Vector Storage
**Option A: Supabase pgvector** (recommended, already in stack)
- Zero new infrastructure
- SQL queries for hybrid search
- Already have the Supabase connection

**Option B: SQLite-vec** (for fully local, zero-dependency RAG)
- 30MB memory, pure C, no Docker
- Good for client-side or embedded scenarios

### Fine-Tuning
**Unsloth** (when ready)
- 2x faster, 70% less VRAM than alternatives
- Qwen3-8B fits in 8GB VRAM
- Export to GGUF for Ollama import

### Evaluation
**Custom test suite first** (extend existing test-remy-sample.mjs)
- DeepEval when custom metrics plateau

### Memory
**Start simple:** Supabase table for entity memory + conversation summaries
- Mem0 when you need graph-based relationships

---

## Key Insights the Research Surfaced

1. **The biggest gap is RAG.** Remy can query structured data (database) but cannot search unstructured data (notes, conversations, emails by content). This is the single highest-impact improvement.

2. **Intent classification is already good, but the middle layer is missing.** The jump from regex (0ms) to LLM (2-5s) is too large. An embedding similarity layer in between would handle most of the gap cases in 15ms.

3. **Fine-tuning is premature without data.** Start collecting training data now. Every Remy failure is a training example. In 2-3 months, you'll have enough to fine-tune.

4. **Memory is the multiplier.** A chef who has to re-explain context every conversation will stop using Remy. Persistent memory (even just conversation summaries) transforms the experience.

5. **Proactive > Reactive.** The best assistants in 2026 don't wait to be asked. They surface the right information at the right time. The trigger logic is deterministic (cheap), only the message generation uses AI.

6. **Small models have closed the gap dramatically.** Qwen3-4B is genuinely competitive with 72B models from 2024. The quality ceiling for local AI is much higher than most people realize.

---

## Sources

### RAG Best Practices
- [The 2025 Guide to RAG](https://www.edenai.co/post/the-2025-guide-to-retrieval-augmented-generation-rag)
- [Enhancing RAG: A Study of Best Practices (arxiv)](https://arxiv.org/abs/2501.07391)
- [RAG in 2026: Bridging Knowledge and Generative AI](https://squirro.com/squirro-blog/state-of-rag-genai)
- [Long Context vs. RAG for LLMs (arxiv)](https://arxiv.org/abs/2501.01880)
- [Maximum Effective Context Window (arxiv)](https://arxiv.org/pdf/2509.21361)
- [From RAG to Context - 2025 Review](https://ragflow.io/blog/rag-review-2025-from-rag-to-context)

### Hybrid Search
- [Optimizing RAG with Hybrid Search & Reranking](https://superlinked.com/vectorhub/articles/optimizing-rag-with-hybrid-search-reranking)
- [Hybrid Search RAG That Actually Works (Towards AI)](https://pub.towardsai.net/hybrid-search-rag-that-actually-works-bm25-vectors-reranking-in-python-0c02ade0799d)
- [Hybrid RAG: Graphs, BM25, and the End of Black-Box Retrieval](https://community.netapp.com/t5/Tech-ONTAP-Blogs/Hybrid-RAG-in-the-Real-World-Graphs-BM25-and-the-End-of-Black-Box-Retrieval/ba-p/464834)

### Small Model Optimization
- [Small Language Models 2026 Guide](https://localaimaster.com/blog/small-language-models-guide-2026)
- [Qwen3: Think Deeper, Act Faster](https://qwenlm.github.io/blog/qwen3/)
- [Qwen3 Benchmarks and Comparisons](https://dev.to/best_codes/qwen-3-benchmarks-comparisons-model-specifications-and-more-4hoa)
- [Ollama 0.17 Performance Gains](https://www.webanditnews.com/2026/02/22/ollama-0-17-arrives-with-massive-performance-gains-and-a-new-architecture-that-could-reshape-local-ai-deployment/)
- [Local LLM Reddit Community Insights](https://www.aitooldiscovery.com/guides/local-llm-reddit)

### Fine-Tuning
- [Fine-Tuning LLM with Unsloth: Practical Guide for Qwen3 8B](https://medium.com/@acarismailkagan/fine-tuning-llm-with-unsloth-a-practical-guide-to-training-models-like-qwen3-8b-on-a-consumer-gpu-4116088a207c)
- [How to Fine-Tune LLMs on RTX GPUs with Unsloth (NVIDIA)](https://blogs.nvidia.com/blog/rtx-ai-garage-fine-tuning-unsloth-dgx-spark/)
- [Comparing Fine-Tuning Frameworks: Axolotl, Unsloth, Torchtune](https://blog.spheron.network/comparing-llm-fine-tuning-frameworks-axolotl-unsloth-and-torchtune-in-2025)
- [Best Frameworks for Fine-Tuning LLMs 2025 (Modal)](https://modal.com/blog/fine-tuning-llms)
- [Fine-Tune Llama 3.1 with Unsloth (Hugging Face)](https://huggingface.co/blog/mlabonne/sft-llama3)
- [Unsloth Documentation](https://unsloth.ai/docs/get-started/fine-tuning-llms-guide)

### Intent Classification
- [Intent Classification: 2025 Techniques](https://labelyourdata.com/articles/machine-learning/intent-classification)
- [Botpress vs Other AI Agent Platforms](https://dev.to/albert_ed/botpress-vs-other-ai-agent-platforms-what-sets-it-apart-1mlk)
- [Best Chatbot Development Tools 2025](https://www.refontelearning.com/blog/best-chatbot-development-tools-and-frameworks-in-2025-dialogflow-rasa-gpt-botpress)

### Conversation Memory
- [Top 10 AI Memory Products 2026](https://medium.com/@bumurzaqov2/top-10-ai-memory-products-2026-09d7900b5ab1)
- [Survey of AI Agent Memory Frameworks](https://www.graphlit.com/blog/survey-of-ai-agent-memory-frameworks)
- [MemGPT: Towards LLMs as Operating Systems (arxiv)](https://arxiv.org/abs/2310.08560)
- [AI Memory Systems Benchmark: Mem0 vs OpenAI vs LangMem](https://guptadeepak.com/the-ai-memory-wars-why-one-system-crushed-the-competition-and-its-not-openai/)
- [Letta Documentation](https://docs.letta.com/concepts/memgpt/)
- [Mem0 Self-Hosted AI Companion with Ollama](https://docs.mem0.ai/cookbooks/companions/local-companion-ollama)
- [Mem0 with Qdrant + Ollama Locally](https://loze.hashnode.dev/fixing-mem0-local-ollama-and-openclaw-mem0-with-qdrant-ollama-locally)

### Agentic AI Patterns
- [Top AI Agent Frameworks 2025 (Codecademy)](https://www.codecademy.com/article/top-ai-agent-frameworks-in-2025)
- [CrewAI vs LangGraph vs AutoGen (DataCamp)](https://www.datacamp.com/tutorial/crewai-vs-langgraph-vs-autogen)
- [Top 5 Agentic AI Frameworks 2026](https://futureagi.substack.com/p/top-5-agentic-ai-frameworks-to-watch)
- [Best AI Agent Frameworks 2025 (Maxim)](https://www.getmaxim.ai/articles/top-5-ai-agent-frameworks-in-2025-a-practical-guide-for-ai-builders/)

### Prompt Engineering
- [Ultimate Guide to Prompt Engineering 2026 (Lakera)](https://www.lakera.ai/blog/prompt-engineering-guide)
- [ReAct Prompting (Width.ai)](https://www.width.ai/post/react-prompting)
- [Prompt Engineering Techniques: Top 6 for 2026](https://www.k2view.com/blog/prompt-engineering-techniques/)

### Evaluation & Testing
- [LLM Evaluation: Frameworks, Metrics, Best Practices 2026](https://futureagi.substack.com/p/llm-evaluation-frameworks-metrics)
- [LLM Testing 2026: Top Methods (Confident AI)](https://www.confident-ai.com/blog/llm-testing-in-2024-top-methods-and-strategies)
- [DeepEval Framework](https://deepeval.com/)
- [AI Evaluation Metrics 2026 (Master of Code)](https://masterofcode.com/blog/ai-agent-evaluation)

### Privacy-First AI
- [Apple Foundation Models Research](https://machinelearning.apple.com/research/introducing-apple-foundation-models)
- [Apple Foundation Models 2025 Updates](https://machinelearning.apple.com/research/apple-foundation-models-2025-updates)
- [Private Cloud Compute (Apple Security)](https://security.apple.com/blog/private-cloud-compute/)
- [How Apple Intelligence Runs AI Locally](https://powergentic.beehiiv.com/p/how-apple-intelligence-runs-ai-locally-on-device-architecture-comparisons-and-privacy-explained)

### Proactive AI
- [Proactive AI in 2026: Moving Beyond the Prompt](https://www.alpha-sense.com/resources/research-articles/proactive-ai/)
- [AI Agents in Analytics: 11 Enterprise Use Cases 2026](https://www.ampcome.com/post/ai-agents-in-analytics)
- [Year-Ender 2025: AI Assistants from Reactive to Proactive](https://www.business-standard.com/technology/tech-news/year-ender-2025-ai-assistants-rise-alexa-siri-google-assistant-chatgpt-meta-gemini-125122200324_1.html)

### Vector Storage
- [SQLite-vec: Fast Local Vector Search](https://dev.to/aairom/embedded-intelligence-how-sqlite-vec-delivers-fast-local-vector-search-for-ai-3dpb)
- [Local-First RAG Using SQLite for AI Agent Memory](https://www.pingcap.com/blog/local-first-rag-using-sqlite-ai-agent-memory-openclaw/)
- [Building a RAG on SQLite](https://blog.sqlite.ai/building-a-rag-on-sqlite)
- [Zvec: Embedded Vector Database (Alibaba)](https://dataforcee.us/2026/02/10/alibaba-open-sources-zvec-an-embedded-vector-database-bringing-sqlite-like-simplicity-and-high-performance-to-the-rag-device-at-the-edge-application/)

### Embedding Models
- [Best Ollama Embedding Models for RAG](https://www.arsturn.com/blog/picking-the-perfect-partner-a-guide-to-choosing-the-best-embedding-models-in-ollama)
- [13 Best Embedding Models 2026](https://elephas.app/blog/best-embedding-models)
- [Comparing Local Embedding Models: MiniLM, Nomic, OpenAI](https://medium.com/@jinmochong/comparing-local-embedding-models-for-rag-systems-all-minilm-nomic-and-openai-ee425b507263)

### Structured Output
- [Ollama Structured Outputs Documentation](https://docs.ollama.com/capabilities/structured-outputs)
- [Reliable Structured Output from Local LLMs](https://markaicode.com/ollama-structured-output-pipeline/)
- [Constrained Decoding Guide](https://www.aidancooper.co.uk/constrained-decoding/)

### Local Deployment
- [Local LLM Hosting: Complete 2025 Guide](https://medium.com/@rosgluk/local-llm-hosting-complete-2025-guide-ollama-vllm-localai-jan-lm-studio-more-f98136ce7e4a)
- [HN: Who's Running Local AI Workstations in 2026](https://news.ycombinator.com/item?id=46560663)
- [Ollama GitHub Repository](https://github.com/ollama/ollama)
