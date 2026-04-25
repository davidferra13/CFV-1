# Remy Multi-Model Architecture: Market Research

> Research compiled April 25, 2026. Covers model routing patterns, open source repos, browser inference, phone AI, and distributed/swarm inference.

## 1. Model Routing Patterns (How Chatbot Engineers Do It)

Three proven patterns in production:

### Classifier-Based Routing (The Advisor Pattern)

A lightweight model scores each prompt for complexity, routes to cheap vs expensive model. **RouteLLM** (Berkeley/LMSYS) is the reference implementation: trains on Chatbot Arena preference data, achieves 85% cost reduction while maintaining 95% GPT-4 quality. Their matrix factorization router is recommended as default.

### Semantic Vector Routing

Embed the query, compare against pre-defined route utterances, dispatch by semantic similarity. No LLM call needed for the routing decision. **Aurelio Labs semantic-router** (3.1k stars, Python) and **vLLM Semantic Router** (production-grade, Envoy sidecar) are the two implementations.

### Gateway/Proxy Routing

Centralized proxy handles fallbacks, load balancing, cost tracking. **LiteLLM** and **Portkey** are the production-grade open source options. LiteLLM supports priority-ordered fallbacks, cost-based routing, latency-based routing, and Redis-backed cooldowns.

## 2. Open Source Repos to Frankenstein

### Tier 1: Directly Useful

| Repo                                                       | Stars | What It Does                                                  | Stack                 | Remy Applicability                    |
| ---------------------------------------------------------- | ----- | ------------------------------------------------------------- | --------------------- | ------------------------------------- |
| **SmarterRouter** (peva3/SmarterRouter)                    | -     | Ollama gateway, picks best local model per prompt, VRAM-aware | Python, Ollama        | HIGHEST. Sits between app and Ollama  |
| **RouteLLM** (lm-sys/RouteLLM)                             | -     | Trained classifier routes simple to cheap, complex to strong  | Python, OpenAI-compat | HIGH. Port classification logic to TS |
| **Aurelio Semantic Router** (aurelio-labs/semantic-router) | 3.1k  | Intent matching via embeddings, <1ms, no LLM for routing      | Python, embeddings    | HIGH. Intent classification pattern   |
| **Vercel AI Chatbot** (vercel/ai-chatbot)                  | -     | Next.js multi-model chat, model selection in route handlers   | Next.js, AI SDK       | HIGH. Same stack as ChefFlow          |

### Tier 2: Borrow Patterns

| Repo                                     | What to Borrow                                        |
| ---------------------------------------- | ----------------------------------------------------- |
| **LiteLLM** (BerriAI/litellm)            | Fallback chains, cost tracking, load balancing config |
| **Open WebUI** (open-webui/open-webui)   | Ollama multi-model UX, streaming, error handling      |
| **Portkey Gateway** (Portkey-AI/gateway) | Circuit breakers, canary deployments                  |

### Tier 3: Research Reference

| Repo                                                                | Value                               |
| ------------------------------------------------------------------- | ----------------------------------- |
| **LLMRouter** (ulab-uiuc/LLMRouter)                                 | 16+ routing algorithms compared     |
| **awesome-ai-model-routing** (Not-Diamond/awesome-ai-model-routing) | Curated list of everything          |
| **RouterBench** (withmartian/routerbench)                           | Benchmark suite for routing systems |

## 3. Browser-Based Inference (WebLLM)

**WebLLM** (MLC-AI) runs models directly in the browser via WebGPU. Production-ready as of 2026.

- **How:** Compiles models to WebGPU shaders + WASM runtime. Runs entirely client-side.
- **API:** OpenAI-compatible. Supports streaming, JSON mode, function calling.
- **Models:** Gemma, Llama, Phi, Qwen families. Small models (1-4B) work best.
- **Performance:** 20-40 t/s on laptop GPUs, 10-20 t/s on phones with WebGPU.
- **Browser support:** Chrome, Edge, Firefox (WebGPU). Safari partial.
- **npm:** `@mlc-ai/web-llm`

**Integration pattern for ChefFlow:**

```typescript
// Client-side: detect WebGPU, load model, expose inference
import { CreateMLCEngine } from '@mlc-ai/web-llm'
const engine = await CreateMLCEngine('gemma-2b-it-q4f32_1-MLC')
const reply = await engine.chat.completions.create({
  messages: [{ role: 'user', content: 'Hello Remy' }],
  stream: true,
})
```

**Chrome Built-in AI (Prompt API):** Still in origin trial as of April 2026. Not yet production-ready. Use WebLLM instead.

## 4. Phone AI

- **Android:** Gemma 4 E2B runs natively via Google AI Edge Gallery and ML Kit GenAI API. 4x faster than previous gen, 60% less battery.
- **Gemini Nano 4:** Coming to Android devices via AICore (later 2026).
- **iOS:** Apple Core ML can run small models. No direct web app integration.
- **Web-to-phone:** No standard API exists yet for a web app to call a phone's local model. WebLLM in mobile browser is the closest path.

**Practical path for ChefFlow:** WebLLM in mobile browser. User opens ChefFlow on phone, model runs in-browser via WebGPU. No app download needed. Limited to 1-2B models on most phones.

## 5. Distributed/Swarm Inference

- **Exo** (exo-explore/exo): Clusters consumer devices via network. Works across Mac/Linux. Can split large models across multiple GPUs. Experimental on Windows.
- **Petals**: Distributes large models across GPUs over the internet. Community-driven. High latency.
- **Practical reality:** Distributing inference across desktop + Pi is possible but latency overhead makes it impractical for real-time chat. The Pi has no GPU and minimal CPU.

**Verdict on "free local cloud swarm":** Not practical for real-time Remy chat in 2026. The better architecture is: each user runs their own model (via WebLLM in browser or Ollama locally), and ChefFlow server is just the orchestrator that sends prompts and receives responses. No need to network devices together.

## 6. Recommended Architecture for Remy

```
User message arrives
       |
  [Phase 1: Classify] -- gemma4:e2b (fastest, 60 t/s)
       |
  Intent + Complexity + Task Domain
       |
  [Phase 2: Route] -- smart router picks model
       |
   +---+---+---+---+
   |   |   |   |   |
  e2b e4b qwen phi4  (GPU, fast)
   |   |   |
  gemma4-27B qwen3.6  (CPU, slower but smarter)
   |
  [Phase 3: Generate response]
       |
  Return to user
```

**Future enhancement (Phase 2+):**

- WebLLM fallback: if server Ollama is busy, run classification in user's browser
- User-local Ollama: detect if user has Ollama at localhost, route their inference locally
- Phone: WebLLM in mobile browser for simple classification
