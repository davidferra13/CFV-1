# UX8: Offline and Edge AI for Mobile Devices

**Research Date:** 2026-03-15
**Scope:** What AI capabilities could work on a chef's phone when they're offline?
**Context:** ChefFlow uses Ollama (local AI on the developer's PC) for privacy. Chefs work from their phone between clients, often without reliable internet. This research explores what AI can run directly on the phone.

---

## 1. On-Device AI Models: Current State (2025-2026)

### 1.1 Apple Intelligence (iOS 26+)

Apple's on-device model is a compact ~3 billion parameter model running on Apple silicon. With iOS 26 (fall 2025), Apple released the **Foundation Models framework**, giving third-party developers direct API access to this on-device LLM.

**What developers get (free, no subscription):**

- Text summarization
- Entity extraction (names, dates, amounts from unstructured text)
- Text understanding and refinement
- Guided generation (structured output, not random freeform)
- Tool calling (the model can invoke app-defined functions)
- Multi-turn conversation memory
- Works entirely offline, no cloud dependency

**Key advantage for ChefFlow:** Apple won't charge for access to core Apple Intelligence models. The LLM is built into the OS, so apps don't need to bundle a model (smaller app size). Developers can integrate with as few as three lines of Swift code via Xcode Playgrounds.

**Limitation:** Only available on iPhone 15 Pro and later (A17 Pro chip minimum). Only works in native Swift apps, not in PWAs or web views.

Sources:

- [Apple Foundation Models Framework](https://www.apple.com/newsroom/2025/09/apples-foundation-models-framework-unlocks-new-intelligent-app-experiences/)
- [Foundation Models Tech Report 2025](https://machinelearning.apple.com/research/apple-foundation-models-tech-report-2025)
- [Why Apple's Foundation Models Framework Matter](https://www.computerworld.com/article/4008276/why-apples-foundation-models-framework-matter.html)

### 1.2 Google Gemini Nano (Android)

Google's on-device model ships via Android's AICore system service. The latest version runs on Pixel 10 and select Samsung/other flagships.

**On-device capabilities (no internet required):**

- Summarization of articles or conversations (bulleted list output)
- Proofreading (grammar, spelling fixes)
- Rewriting (transform tone/style)
- Image description
- Smart replies (context-aware response suggestions)
- Streaming and non-streaming output modes

**Developer access:** ML Kit GenAI APIs handle model distribution and updates automatically. Developers don't manage model downloads or memory budgets; AICore handles it.

**Limitation:** Only available on recent flagship devices. Not accessible from PWAs or web views directly.

Sources:

- [Gemini Nano Developer Guide](https://developer.android.com/ai/gemini-nano)
- [ML Kit GenAI APIs](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html)
- [Gemini Nano Multimodal on Pixel](https://store.google.com/intl/en/ideas/articles/gemini-nano-offline/)

### 1.3 Samsung Galaxy AI

Samsung's on-device AI uses Qualcomm's Hexagon processor and Samsung's neural engines, delivering 12 TOPS (trillion operations per second).

**Features that work offline (on-device processing enabled):**

- Live Translate (real-time translation)
- Chat Translation
- Style and grammar correction
- Interpreter
- Voice recorder: transcription + translation
- Samsung Internet: translate

**Features that require cloud:** Generative Edit, Composer, Google Gemini-powered tools.

**Key note:** Samsung confirmed default on-device features (Live Translate, Note Assist, Audio Eraser) will remain free indefinitely, though advanced cloud features may move to subscription.

Sources:

- [Samsung Galaxy AI Offline Features](https://insiderbits.com/technology/samsung-galaxy-ai/)
- [S24 AI Features Offline List](https://r2.community.samsung.com/t5/Galaxy-S/S24-AI-features-Here-s-a-list-of-features-that-work-offline/td-p/15451740)

### 1.4 Microsoft Phi Models (Edge-Optimized)

Microsoft's Phi family targets resource-constrained environments explicitly.

| Model                      | Parameters | Key Feature                                  | Mobile Deployment                        |
| -------------------------- | ---------- | -------------------------------------------- | ---------------------------------------- |
| Phi-4-mini                 | 3.8B       | 128K context, function calling, multilingual | ONNX Runtime on iPhone, Android, Windows |
| Phi-4-multimodal           | 5.6B       | Speech + vision + text simultaneously        | Heavier, better for tablets              |
| Phi-4-mini-reasoning       | 3.8B       | Math/logic reasoning (middle school to PhD)  | Good for calculations                    |
| Phi-4-mini-flash-reasoning | ~3.8B      | 10x throughput, 2-3x latency reduction       | Explicitly designed for edge/mobile      |

**Deployment path:** Microsoft Olive + ONNX GenAI Runtime enables cross-platform deployment on Windows, iPhone, Android.

Sources:

- [Phi-4 Family Announcement](https://azure.microsoft.com/en-us/blog/empowering-innovation-the-next-generation-of-the-phi-family/)
- [Phi-4-mini-flash-reasoning](https://azure.microsoft.com/en-us/blog/reasoning-reimagined-introducing-phi-4-mini-flash-reasoning/)

### 1.5 Meta Llama 3.2 (1B and 3B)

Meta's Llama 3.2 was designed explicitly for on-device mobile use, with 1B and 3B text-only variants optimized for ARM, Qualcomm, and similar mobile processors.

**Benchmark numbers (quantized, on Android phones):**

- **Prefill speed:** 350+ tokens/second (1B quantized)
- **Decode speed:** 40+ tokens/second (1B quantized)
- **Speedup from quantization:** 2-4x over original format
- **Model size reduction:** 56% smaller with quantization
- **Tested devices:** OnePlus 12, Samsung S24+, Samsung S22

**Quantization methods:** QLoRA (Quantization-Aware Training with LoRA) and SpinQuant (post-training). Both maintain quality while dramatically cutting size and increasing speed.

**Inference framework:** ExecuTorch (recommended for mobile production).

Sources:

- [Meta Llama 3.2 Quantized Models](https://ai.meta.com/blog/meta-llama-quantized-lightweight-models/)
- [ExecuTorch Mobile Inference](https://pytorch.org/blog/unleashing-ai-mobile/)

### 1.6 What Size Models Can Run on a Modern Smartphone?

**Hardware reality:**

- Modern flagships have 8-12GB RAM total, but only ~4GB is typically available to a single app after OS overhead
- Memory bandwidth is the real bottleneck: mobile devices have 50-90 GB/s vs data center GPUs at 2-3 TB/s (a 30-50x gap)
- LLM decode is memory-bound, so compute units sit idle waiting for memory

**Practical model size limits:**

| Model Size                         | RAM Needed (quantized 4-bit) | Feasibility on Phone                           |
| ---------------------------------- | ---------------------------- | ---------------------------------------------- |
| 135M-500M (SmolLM2, Gemma tiny)    | <1 GB                        | Easy, fast, limited quality                    |
| 1B-1.7B (Llama 3.2 1B, SmolLM2)    | 1-2 GB                       | Comfortable, good for specific tasks           |
| 3B-3.8B (Llama 3.2 3B, Phi-4-mini) | 2-3 GB                       | Feasible on flagships, tight on older devices  |
| 7B+                                | 4-6 GB                       | Impractical on most phones, thermal throttling |

**Inference speed benchmarks:**

- 125M model: ~50 tokens/second on iPhone
- 1B quantized: 40+ tokens/second decode on Android flagships
- 3B quantized: ~15-25 tokens/second decode (estimated from benchmarks)
- Sub-20ms per token latency for short context lengths
- Cloud round-trips add 200-500ms before first token (on-device eliminates this)

**Battery and thermal considerations:** Sustained inference drains batteries fast. A model that triggers thermal throttling is impractical regardless of speed. Short bursts (single query/response) are fine; continuous streaming chat sessions are problematic.

Sources:

- [On-Device LLMs: State of the Union 2026](https://v-chandra.github.io/on-device-llms/)
- [LLM Phone Research](https://www.aussieai.com/research/llm-phone-models)
- [Local LLMs on Mobile: Reality Check](https://www.callstack.com/blog/local-llms-on-mobile-are-a-gimmick)

---

## 2. WebAssembly and Browser-Based AI

### 2.1 Can Small LLMs Run in a Browser/PWA?

**Yes, with caveats.** Three main approaches exist:

**WebLLM (MLC-AI)**

- High-performance in-browser LLM inference engine using WebGPU
- OpenAI-compatible API
- Retains up to 80% of native performance on the same device
- Supports Llama, Phi, Gemma, Mistral, and others
- Models are cached in the browser after first download

**ONNX Runtime Web**

- Runs ONNX models in browsers via WASM (CPU), WebGL, WebGPU, or WebNN backends
- Supports NPU acceleration on devices with neural processing units
- Production-grade, maintained by Microsoft

**Transformers.js (Hugging Face)**

- Higher-level API built on ONNX Runtime
- One-line calls: `pipeline('sentiment-analysis')` or `pipeline('feature-extraction')`
- Good for embeddings, classification, summarization
- Recommended embedding model: `all-MiniLM-L6-v2` (40MB, 384-dimensional vectors)

Sources:

- [WebLLM Documentation](https://webllm.mlc.ai/docs/)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)
- [Mozilla: WebLLM + WASM + WebWorkers](https://blog.mozilla.ai/3w-for-in-browser-ai-webllm-wasm-webworkers/)

### 2.2 WebGPU Support on Mobile Browsers (Current State)

| Browser | Platform    | WebGPU Status (as of late 2025)                    |
| ------- | ----------- | -------------------------------------------------- |
| Chrome  | Android 12+ | Supported (Chrome 121+), requires Qualcomm/ARM GPU |
| Safari  | iOS 26+     | Supported (Safari 26), requires latest OS          |
| Firefox | Android     | Behind a flag, expected 2026                       |
| Edge    | Android     | Follows Chrome (Chromium-based)                    |

**The fragmentation problem:** WebGPU works on recent hardware with recent OS versions. Older phones (even 2-3 years old) may lack support. For a PWA targeting all chefs, you cannot depend on WebGPU being available.

**WASM fallback:** ONNX Runtime Web and Transformers.js can fall back to WASM (CPU-only) when WebGPU is unavailable. Slower, but universal.

Sources:

- [WebGPU Browser Support](https://caniuse.com/webgpu)
- [WebGPU Critical Mass](https://www.webgpu.com/news/webgpu-hits-critical-mass-all-major-browsers/)
- [Safari 26 WebGPU](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/)

### 2.3 Practical Model Sizes for Browser Inference

**Browser tab memory limit:** ~4GB hard limit in most browsers, with practical ceiling around 4-6GB before crashes.

| Model             | Size (quantized) | Browser Feasibility             |
| ----------------- | ---------------- | ------------------------------- |
| SmolLM2 135M-360M | ~100-200 MB      | Easy, runs on any device        |
| TinyLlama 1.1B    | ~600 MB          | Good, most devices              |
| Phi-1.5 1.3B      | ~800 MB          | Good, most devices              |
| Llama 3.2 1B (Q4) | ~700 MB          | Good, most devices              |
| Llama 3.2 3B (Q4) | ~2-3 GB          | Flagship phones only            |
| Llama 3-8B        | 4+ GB            | Will crash most mobile browsers |

**Realistic sweet spot for PWA:** Models under 1GB (sub-2B parameters, 4-bit quantized). Larger models work on desktops but are unreliable on phones.

### 2.4 Latency and Quality Tradeoffs

| Factor               | Small (135M-500M)      | Medium (1B-3B)           | Cloud API             |
| -------------------- | ---------------------- | ------------------------ | --------------------- |
| First token latency  | <50ms                  | 100-500ms                | 200-500ms (network)   |
| Decode speed         | 50+ tok/s              | 15-40 tok/s              | 30-100 tok/s          |
| Quality (reasoning)  | Basic pattern matching | Moderate, specific tasks | High, general purpose |
| Quality (extraction) | Good with fine-tuning  | Good                     | Excellent             |
| Privacy              | Perfect (local)        | Perfect (local)          | Depends on provider   |
| Offline              | Yes                    | Yes                      | No                    |
| Cost per query       | $0                     | $0                       | $0.001-0.01           |

**The honest assessment:** Small on-device models "still struggle with long chains of reasoning, novel problem types, and tasks requiring broad world knowledge." They excel at well-defined, narrow tasks: extraction, classification, template completion, similarity search.

### 2.5 Production Apps Using Browser-Based AI Today

Real apps shipping with client-side AI inference (as of 2025-2026):

- Code assistants that run offline
- Privacy-first note-taking tools
- Educational apps for low-connectivity regions
- Google's MediaPipe running 7B+ models in Chrome

This is early but real. The technology "isn't just a toy demo anymore."

Sources:

- [WebLLM GitHub](https://github.com/mlc-ai/web-llm)
- [Google AI Edge MediaPipe in Browser](https://research.google/blog/unlocking-7b-language-models-in-your-browser-a-deep-dive-with-google-ai-edges-mediapipe/)
- [SLMs in Browser with JS](https://medium.com/@fanbyprinciple/slms-with-js-running-smol-llms-entirely-in-your-browser-4cbc8b164940)

---

## 3. What AI Tasks Could Work Offline on a Phone

### 3.1 Tasks That Work Well Offline

**Template-based text generation (HIGH VALUE)**

- Fill merge fields in email/message templates with client data from cache
- Suggest wording variations for common responses (confirmation, follow-up, thank you)
- No LLM needed for basic templates; small LLM adds natural variation
- Implementation: pre-built templates + cached client data + simple string interpolation

**Cached data lookup with fuzzy matching (HIGH VALUE)**

- "What are the Johnson's allergies?" from cached client profiles
- Embedding-based semantic search across cached data
- Pre-compute embeddings while online, store in IndexedDB, search with cosine similarity offline
- Performance: ~8ms for vector search, ~15ms for embedding generation (with cached model)

**Recipe search across cached database (HIGH VALUE)**

- Pre-embed all recipes while connected to Ollama
- Store embeddings + recipe metadata in IndexedDB
- Fuzzy search: "something with shrimp and no dairy" finds relevant recipes
- HNSW indexing via hnswlib-wasm for fast approximate nearest neighbor search

**Simple classification (MEDIUM VALUE)**

- Categorize an expense (ingredients, equipment, travel, labor)
- Tag a photo (plated dish, kitchen setup, ingredient, receipt)
- Small classifier model (even 135M) handles this well
- Alternative: decision tree with AI-generated branches (built offline from online AI)

**Dietary conflict detection (HIGH VALUE)**

- Cached client profiles (allergies, restrictions) + cached recipe ingredients
- Pure deterministic logic: ingredient list vs restriction list
- No AI needed for exact matches; small model for fuzzy matching ("contains milk" vs "dairy-free")
- This is a safety feature; deterministic is actually better than AI here

**Sentiment/tone analysis of draft messages (LOW-MEDIUM VALUE)**

- Check if a message sounds too formal/informal before sending
- Small classification model (sentiment analysis pipeline via Transformers.js)
- 40MB model, runs in browser, fast inference

### 3.2 Tasks That Cannot Work Offline

| Task                                | Why It Fails Offline                                                     |
| ----------------------------------- | ------------------------------------------------------------------------ |
| Full conversational AI (Remy-style) | Requires large model (7B+), too much RAM, poor quality with small models |
| Web search / real-time data         | Obviously requires internet                                              |
| Image generation                    | Requires large diffusion models, too slow/large for phone                |
| Complex multi-step reasoning        | Small models fail at novel problem types and long reasoning chains       |
| Cross-referencing external data     | Needs access to databases, APIs, external sources                        |
| Training or fine-tuning             | Computationally prohibitive on mobile                                    |

### 3.3 The "Good Enough" Line

For ChefFlow, the question is not "can AI run on a phone?" but "can it run well enough to be useful without being misleading?" The Zero Hallucination Rule applies here: if offline AI gives wrong dietary information, that's a safety hazard. Better to show cached data with a clear "offline, last synced 2 hours ago" label than to have a small model guess.

---

## 4. Offline-First AI Architecture Patterns

### 4.1 Pre-Compute and Cache

**Pattern:** While connected to Ollama (on the PC or via WiFi), generate and cache responses for predictable queries.

**Implementation:**

1. When chef opens the app on WiFi, background-sync pre-computes:
   - Client summary cards (dietary needs, preferences, last event, next event)
   - Common email response drafts for upcoming events
   - Recipe suggestions based on upcoming event menus
   - Pricing benchmarks for common event types
2. Store pre-computed responses in IndexedDB with expiration timestamps
3. Serve from cache when offline
4. Mark cached data with "Last updated: [timestamp]" in the UI

**Advantage:** Full Ollama quality (7B+ model) with zero latency when offline. The chef gets "AI responses" that were actually computed hours ago.

**Limitation:** Only works for predictable queries. Novel questions get a "connect to sync for AI assistance" message.

### 4.2 Embedding-Based Search

**Pattern:** Pre-compute vector embeddings for all client data, recipes, and documents. Store embeddings in IndexedDB. Run similarity search offline using cosine distance.

**Technical stack:**

- Embedding model: `all-MiniLM-L6-v2` via Transformers.js (40MB, runs in browser)
- Vector storage: IndexedDB with Float32Array embeddings
- Index: hnswlib-wasm for approximate nearest neighbor (88ms query time)
- Sync: queue-based, background sync via Service Worker

**Architecture (from real implementation):**

| Operation               | Local Performance | Remote Performance |
| ----------------------- | ----------------- | ------------------ |
| Embedding generation    | ~15ms             | ~180ms             |
| Vector search (ANN)     | ~8ms              | ~50ms              |
| Cold start (model load) | ~2000ms           | 0ms                |
| Cost per 1M tokens      | $0.00             | ~$0.13             |

**Storage management:** LRU eviction with 50MB hard limit for vector cache. Track access time per record, delete least recently used when approaching quota. IndexedDB QuotaExceededError is a real constraint on mobile.

**Multi-tenant isolation:** Every query scoped by tenantId (matches ChefFlow's existing pattern).

Sources:

- [Offline-First AI Web Apps: IndexedDB Architecture](https://markaicode.com/offline-first-ai-web-app-indexeddb/)

### 4.3 Decision Trees with AI-Generated Branches

**Pattern:** Use online AI (Ollama) to build offline decision logic. The AI generates the decision tree once; the tree runs deterministically forever after.

**Example for ChefFlow:**

1. Online: Ask Ollama to classify 500 expense descriptions into categories
2. Build a keyword-based decision tree from the results
3. Offline: New expense "bought salmon at Whole Foods" matches "bought [protein] at [store]" pattern, auto-categorizes as "Ingredients"
4. No AI needed at runtime; the tree is pure string matching

**This is the "Formula > AI" principle applied to offline:** deterministic code that was originally trained by AI.

### 4.4 Sync-on-Reconnect

**Pattern:** Queue AI requests while offline. Process them when connectivity returns. Push results back to the device.

**Implementation:**

1. Chef drafts a complex email reply while offline
2. App queues: "Polish this draft for client [name]" with the draft text
3. Chef continues working (the draft is saved locally as-is)
4. When WiFi reconnects, Service Worker sends queued requests to Ollama
5. Polished version arrives; chef gets a notification: "Your draft has been refined"
6. Chef reviews and sends (or keeps original)

**Key principle:** The app is always functional. AI enhancement is asynchronous. The chef never waits for AI.

### 4.5 The "AI with Training Wheels" Pattern

**Pattern:** Deterministic logic with AI-style UX. The user experience feels intelligent, but the backend is rules and templates.

**Examples:**

- "Smart reply" suggestions that are actually template strings with merge fields
- "AI-generated" event summaries that are actually structured data formatted into sentences
- "Intelligent" dietary conflict alerts that are actually ingredient-list intersection checks
- "Personalized" follow-up reminders that are actually date-math on last contact

**Why this works:** Users don't care whether AI or a formula generated the output. They care whether it's correct and useful. Deterministic logic is correct 100% of the time. A 1B parameter model is correct 80-90% of the time. For a chef managing client allergies, 100% beats 90% every time.

---

## 5. Privacy Considerations for On-Device AI

### 5.1 Does On-Device AI Satisfy ChefFlow's Privacy Requirements?

**Yes, fully.** ChefFlow's privacy model requires that client PII, financials, allergies, and business data never leave the local machine. On-device AI processing meets this requirement by definition: data never leaves the device.

| Privacy Requirement        | Ollama (Current)  | On-Device Phone AI | Cloud AI |
| -------------------------- | ----------------- | ------------------ | -------- |
| Data stays local           | Yes (PC)          | Yes (phone)        | No       |
| No external network calls  | Yes               | Yes                | No       |
| Works offline              | Yes (if PC is on) | Yes                | No       |
| No third-party data access | Yes               | Yes                | Depends  |
| GDPR-compatible            | Yes               | Yes                | Complex  |

### 5.2 Apple Private Cloud Compute (PCC)

For tasks too complex for the on-device model, Apple routes to Private Cloud Compute servers with these guarantees:

- Data is processed only to fulfill the request, then deleted
- Apple itself cannot access the data (no SSH, no remote shells, no debug tools on PCC nodes)
- Independent security researchers can audit the system at any time
- No data retention after processing

**However:** Apple won't disclose the physical location of PCC nodes. For strict data sovereignty requirements, this is a gap. For ChefFlow's purposes (not HIPAA, not defense), PCC is acceptable as a fallback for complex queries.

**For ChefFlow's strictest privacy features** (client allergies, financials): use on-device only, never PCC. PCC is acceptable for generic tasks (writing style suggestions, general knowledge queries).

Sources:

- [Apple Private Cloud Compute](https://security.apple.com/blog/private-cloud-compute/)
- [Apple Intelligence Privacy](https://support.apple.com/guide/iphone/apple-intelligence-and-privacy-iphe3f499e0e/ios)

### 5.3 Regulatory Advantages

On-device processing provides clear regulatory advantages:

- **GDPR:** Data never crosses borders, no data processing agreements needed for AI inference
- **HIPAA-adjacent:** While ChefFlow isn't healthcare, dietary restrictions and allergies are health-related. On-device processing eliminates the data handling chain entirely
- **No vendor lock-in risk:** If your AI provider changes their privacy policy, on-device models are unaffected
- **Audit simplicity:** "The data never left the device" is the easiest privacy claim to prove

---

## 6. Practical Recommendations for ChefFlow

### 6.1 What's Buildable Today vs What Requires Waiting

**Buildable today (2026):**

| Feature                          | Technology                                    | Effort | Value              |
| -------------------------------- | --------------------------------------------- | ------ | ------------------ |
| Pre-computed client summaries    | Ollama + IndexedDB cache                      | Low    | Very High          |
| Offline recipe search (semantic) | Transformers.js embeddings + IndexedDB        | Medium | High               |
| Dietary conflict detection       | Deterministic logic (ingredient intersection) | Low    | Very High (safety) |
| Template-based message drafts    | String templates + cached client data         | Low    | High               |
| Expense auto-categorization      | Decision tree (AI-generated offline)          | Low    | Medium             |
| Sync-on-reconnect AI queue       | Service Worker + background sync              | Medium | High               |

**Requires waiting (2027+):**

| Feature                       | Blocker                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------- |
| Full Remy on phone            | Models too large, quality too low for conversational AI                                           |
| Native Apple/Google AI in PWA | Foundation Models framework is Swift-only, Gemini Nano is Android SDK-only; no PWA/web access yet |
| WebGPU on all phones          | iOS requires Safari 26 (iOS 26), Firefox Android still behind flag                                |
| Voice-to-text with AI context | On-device speech models need more optimization for real-time use                                  |

### 6.2 The Minimum Viable Offline AI: Top 3 Features

If ChefFlow builds only three offline AI features, these deliver the most value:

**1. Pre-Computed Client Intelligence Cards**

- While on WiFi, Ollama generates a summary card for each client: allergies, preferences, last event, notes
- Stored in IndexedDB, available offline
- Chef checks their phone between gigs: "What did the Hendersons want last time?"
- Implementation: background sync task, ~2 days of work
- Why it's #1: Chefs check client info constantly. This is the most-accessed data.

**2. Offline Dietary Conflict Checker**

- Cache all client profiles + recipe ingredient lists
- Deterministic intersection check: "This recipe contains shellfish. The Morrison family has a shellfish allergy."
- No AI model needed; pure logic with cached data
- Implementation: ~1 day of work
- Why it's #2: Safety feature. Wrong dietary info is the highest-stakes failure mode.

**3. Draft Message Queue with Sync-on-Reconnect**

- Chef writes a message or email reply while offline
- App saves it locally
- When WiFi returns, Ollama polishes the draft (tone, grammar, professional language)
- Chef gets notification: "Your draft to the Hendersons has been refined. Review?"
- Implementation: Service Worker queue + Ollama integration, ~3 days
- Why it's #3: Chefs communicate constantly between gigs. This lets them work offline and get AI polish later.

### 6.3 Cost and Complexity of On-Device AI in a PWA

**The PWA constraint is the biggest factor.** ChefFlow is a PWA, not a native app. This means:

| Approach                | PWA-Compatible? | Notes                                              |
| ----------------------- | --------------- | -------------------------------------------------- |
| Apple Foundation Models | No              | Swift-only, requires native app                    |
| Google Gemini Nano      | No              | Android SDK, requires native app                   |
| Samsung Galaxy AI       | No              | Samsung SDK, requires native app                   |
| WebLLM (WebGPU)         | Partially       | Works in Chrome Android, Safari 26+, not universal |
| Transformers.js (WASM)  | Yes             | Works everywhere, CPU-only fallback                |
| ONNX Runtime Web        | Yes             | Works everywhere, multiple backends                |
| Pre-computed cache      | Yes             | No model needed, just IndexedDB                    |
| Deterministic logic     | Yes             | No model needed, just code                         |

**Recommendation:** For a PWA, the most reliable path is:

1. **Pre-compute with Ollama while online** (full quality, zero mobile constraints)
2. **Cache results in IndexedDB** (works everywhere, no model download)
3. **Use Transformers.js for lightweight tasks** (embeddings, classification) as progressive enhancement
4. **Never depend on WebGPU or native APIs** for core functionality

### 6.4 The Hybrid Approach: Heavy AI on PC, Light AI on Phone

This is the architecture that matches ChefFlow's existing setup:

```
                    ONLINE (WiFi / Home)              OFFLINE (Between Gigs)
                    ==================              =======================

PC (Ollama 7B+)  ──► Full AI Processing           [Not accessible]
                      │
                      ▼
Phone (PWA)       ──► Sync: download pre-computed   ──► Serve from cache
                      results, embeddings, cards         Deterministic logic
                      │                                  Embedding search
                      ▼                                  Template drafts
                   IndexedDB cache                       Queue requests
                   (client cards,                        for later sync
                    recipe embeddings,
                    draft templates)
```

**The key insight:** The phone doesn't need to run a large model. It needs to be a smart cache for a large model that runs elsewhere. Ollama on the PC does the heavy lifting. The phone stores the results and serves them when offline.

**This matches ChefFlow's privacy model perfectly:**

- Ollama processes everything locally on the PC (existing setup, no change)
- Pre-computed results are synced to the phone (data stays on chef's devices)
- No cloud AI services involved at any point
- The phone is an offline-capable read cache + request queue, not an inference engine

### 6.5 Progressive Enhancement Roadmap

**Phase 1 (buildable now):** Pre-computed cache + deterministic logic

- Client intelligence cards via Ollama, cached in IndexedDB
- Dietary conflict detection (pure logic)
- Message draft queue with sync-on-reconnect
- No on-device AI model required

**Phase 2 (when WebGPU matures):** Add lightweight browser AI

- Embed Transformers.js for semantic search across cached recipes/clients
- Add sentiment check for draft messages
- Expense auto-categorization via small classifier
- Progressive enhancement: works without WebGPU (falls back to WASM), faster with it

**Phase 3 (when native APIs open to PWAs):** Tap platform AI

- If Apple/Google expose Foundation Models or Gemini Nano to web apps, integrate
- Until then, native app wrappers (Capacitor/Tauri) could bridge the gap
- Monitor WebNN standard for NPU access from browsers

---

## Appendix: Key Numbers at a Glance

| Metric                                     | Value                               |
| ------------------------------------------ | ----------------------------------- |
| Apple on-device model size                 | ~3B parameters                      |
| Gemini Nano                                | On-device, size not disclosed       |
| Llama 3.2 1B quantized decode speed        | 40+ tokens/second (Android)         |
| Llama 3.2 1B quantized model size          | ~700MB (4-bit)                      |
| Browser tab memory limit                   | ~4GB                                |
| Practical browser model limit              | <1GB (sub-2B parameters)            |
| MiniLM embedding model size                | 40MB                                |
| Embedding generation latency (local)       | ~15ms                               |
| Vector search latency (HNSW)               | ~8ms                                |
| Cloud API first-token latency              | 200-500ms                           |
| Offline-first apps functionality retention | 89% vs 23% (server-dependent)       |
| Mobile memory bandwidth                    | 50-90 GB/s (vs 2-3 TB/s datacenter) |

---

## Sources

### On-Device Models

- [Apple Foundation Models Framework](https://www.apple.com/newsroom/2025/09/apples-foundation-models-framework-unlocks-new-intelligent-app-experiences/)
- [Apple Foundation Models Tech Report 2025](https://machinelearning.apple.com/research/apple-foundation-models-tech-report-2025)
- [Why Apple's Foundation Models Matter](https://www.computerworld.com/article/4008276/why-apples-foundation-models-framework-matter.html)
- [Gemini Nano Developer Guide](https://developer.android.com/ai/gemini-nano)
- [ML Kit GenAI APIs](https://android-developers.googleblog.com/2025/08/the-latest-gemini-nano-with-on-device-ml-kit-genai-apis.html)
- [Phi-4 Family](https://azure.microsoft.com/en-us/blog/empowering-innovation-the-next-generation-of-the-phi-family/)
- [Meta Llama 3.2 Quantized](https://ai.meta.com/blog/meta-llama-quantized-lightweight-models/)
- [On-Device LLMs: State of the Union 2026](https://v-chandra.github.io/on-device-llms/)

### Browser-Based AI

- [WebLLM](https://webllm.mlc.ai/)
- [ONNX Runtime Web](https://onnxruntime.ai/docs/tutorials/web/)
- [Mozilla: WebLLM + WASM + WebWorkers](https://blog.mozilla.ai/3w-for-in-browser-ai-webllm-wasm-webworkers/)
- [WebGPU Browser Support](https://caniuse.com/webgpu)
- [Google AI Edge MediaPipe in Browser](https://research.google/blog/unlocking-7b-language-models-in-your-browser-a-deep-dive-with-google-ai-edges-mediapipe/)

### Offline Architecture

- [Offline-First AI Web Apps: IndexedDB](https://markaicode.com/offline-first-ai-web-app-indexeddb/)
- [Offline-First AI in React Native](https://medium.com/front-end-weekly/offline-first-ai-in-react-native-build-smarter-cloud-free-apps-in-2025-ad9c500d39df)
- [RxDB Local Vector Database](https://rxdb.info/articles/javascript-vector-database.html)

### Privacy

- [Apple Private Cloud Compute](https://security.apple.com/blog/private-cloud-compute/)
- [Apple Intelligence Privacy](https://support.apple.com/guide/iphone/apple-intelligence-and-privacy-iphe3f499e0e/ios)

### Benchmarks

- [ExecuTorch Mobile Inference](https://pytorch.org/blog/unleashing-ai-mobile/)
- [PowerInfer-2: Fast LLM on Smartphone](https://powerinfer.ai/v2/)
- [Local LLMs on Mobile Reality Check](https://www.callstack.com/blog/local-llms-on-mobile-are-a-gimmick)
- [2026 LLM Landscape](https://medium.com/@Michael38/the-2026-llm-landscape-small-fast-on-device-and-reasoning-first-9b87c9436d3e)
