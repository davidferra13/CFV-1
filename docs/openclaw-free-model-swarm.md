# OpenClaw Free Model Swarm

> Master registry of all free LLM providers for OpenClaw's inference pool.
> Goal: never pay for inference. Rotate across providers to stay under free limits.

## Current Providers (already configured)

| #   | Provider       | Model                   | Free Limit          | API Style     | Status                 |
| --- | -------------- | ----------------------- | ------------------- | ------------- | ---------------------- |
| 1   | Ollama (local) | llama3.2 3B             | Unlimited           | Ollama        | Active                 |
| 2   | Groq           | llama-3.3-70b-versatile | ~6,000 RPD          | OpenAI        | Active                 |
| 3   | Groq           | llama-3.1-8b-instant    | ~14,400 RPD         | OpenAI        | Active                 |
| 4   | Gemini         | gemini-2.5-flash        | 1,000 RPD           | OpenAI-compat | Active (fallback only) |
| 5   | SambaNova      | Meta-Llama-3.3-70B      | ~100 RPM            | OpenAI        | Active                 |
| 6   | Mistral        | mistral-large-latest    | 1 RPS, 500K tok/min | OpenAI        | Active                 |

## New Providers to Add (sign up in this order)

### Priority 1: Highest value, no card required

#### Together AI

- **Free tier:** $25 free credits (that's ~12.5M tokens on Llama 3.3 70B)
- **Card required:** No
- **Models:** Llama 3.3 70B, Llama 4 Scout, Mixtral, Qwen
- **API:** OpenAI-compatible
- **Base URL:** `https://api.together.xyz/v1`
- **Signup:** https://api.together.ai (Google or GitHub login)
- **Why #1:** $25 free is the biggest free credit of any provider

#### OpenRouter

- **Free tier:** 28 free models, 200 req/day, no charges
- **Card required:** No
- **Models:** Llama 3.3 70B, DeepSeek R1, Qwen3 Coder 480B, Gemma 3 27B, Mistral Small 3.1 24B, NVIDIA Nemotron 120B, and 22 more
- **API:** OpenAI-compatible
- **Base URL:** `https://openrouter.ai/api/v1`
- **Signup:** https://openrouter.ai
- **Why:** 28 models in one key. Even if each has 200 RPD, that's effectively 5,600 RPD across models

#### Cerebras

- **Free tier:** 30 RPM, 1M tokens/day
- **Card required:** No
- **Models:** Llama 3.3 70B (fastest inference in the world)
- **API:** OpenAI-compatible
- **Base URL:** `https://api.cerebras.ai/v1`
- **Signup:** https://cloud.cerebras.ai
- **Note:** Was 404 before (Mar 14), retry now

### Priority 2: Solid free tiers

#### Cloudflare Workers AI

- **Free tier:** 10,000 neurons/day
- **Card required:** No
- **Models:** 50+ models (Llama 3.3, Mistral, etc.)
- **API:** OpenAI-compatible via AI Gateway
- **Base URL:** `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1`
- **Signup:** https://dash.cloudflare.com (needs Cloudflare account)

#### NVIDIA NIM

- **Free tier:** 40 RPM
- **Card required:** No (phone verification required)
- **Models:** Llama 3.3, Mixtral, Nemotron
- **API:** OpenAI-compatible
- **Base URL:** `https://integrate.api.nvidia.com/v1`
- **Signup:** https://build.nvidia.com

#### Cohere

- **Free tier:** 20 RPM, 1,000 req/month
- **Card required:** No
- **Models:** Command A, Aya series (14 models)
- **API:** Cohere native + OpenAI-compat
- **Base URL:** `https://api.cohere.ai/v2`
- **Signup:** https://dashboard.cohere.com

### Priority 3: Trial credits (expire)

#### AI21

- **Free tier:** $10 credit for 3 months
- **Card required:** No
- **Models:** Jamba 1.5
- **API:** OpenAI-compatible
- **Signup:** https://studio.ai21.com

#### Fireworks AI

- **Free tier:** $1 credit
- **Card required:** No
- **Models:** 400+ models (Llama, Mixtral, DeepSeek)
- **API:** OpenAI-compatible
- **Base URL:** `https://api.fireworks.ai/inference/v1`
- **Signup:** https://fireworks.ai

#### Scaleway

- **Free tier:** 1,000,000 free tokens
- **Card required:** Unclear
- **Models:** Various open-source
- **Signup:** https://console.scaleway.com

#### Nebius

- **Free tier:** $1 credit
- **Models:** Various
- **Signup:** https://studio.nebius.ai

## Swarm Strategy

### Tier Assignment

```
Tier 1 (unlimited, always available):
  Ollama/llama3.2 on PC GPU

Tier 2 (high-limit free, primary cloud rotation):
  Together AI ($25 credit pool)
  SambaNova (100 RPM)
  Groq 70B (6,000 RPD)
  Cerebras (1M tokens/day)

Tier 3 (moderate free, overflow):
  OpenRouter (200 RPD across 28 models)
  Cloudflare Workers AI (10,000 neurons/day)
  NVIDIA NIM (40 RPM)
  Groq 8B (14,400 RPD)

Tier 4 (backup/expiring credits):
  Gemini Flash (fragile with OpenClaw internals)
  Mistral (1 RPS limit)
  Cohere (1,000/month)
  AI21, Fireworks, Scaleway, Nebius (trial credits)
```

### Job-to-Provider Mapping

| Job Type                    | Use Provider From                       | Why                                                  |
| --------------------------- | --------------------------------------- | ---------------------------------------------------- |
| Webchat (interactive)       | Groq 70B, then Together                 | Needs 70B+ intelligence for tool use                 |
| Heartbeat jobs (structured) | Ollama (always)                         | Free, unlimited, good enough for 3B tasks            |
| Lead scraping (high volume) | Together, then SambaNova, then Cerebras | Burns through tokens, use biggest credit pools first |
| Code audit (needs quality)  | OpenRouter/Qwen3 Coder 480B             | Best free coding model available                     |
| Research/intel              | Together, then OpenRouter               | Needs decent reasoning                               |

### Budget Math

| Provider     | Effective Daily Budget                  |
| ------------ | --------------------------------------- |
| Ollama       | Unlimited                               |
| Together AI  | ~400K tokens/day (if $25 lasts 30 days) |
| Groq         | ~6,000 requests/day                     |
| SambaNova    | ~6,000 RPD (at 100 RPM for 1 hour)      |
| Cerebras     | 1M tokens/day                           |
| OpenRouter   | 200 req/day (free models)               |
| Cloudflare   | 10,000 neurons/day                      |
| NVIDIA NIM   | ~2,400 RPD (at 40 RPM)                  |
| **Combined** | **~25,000+ requests/day**               |

That's enough for 24/7 lead scraping, all heartbeat jobs, interactive chat, and research. All for $0.

## OpenClaw Config Template

Once you have the API keys, each provider gets added to `models.providers` in openclaw.json:

```json
{
  "together": {
    "baseUrl": "https://api.together.xyz/v1",
    "apiKey": "YOUR_KEY",
    "api": "openai-completions",
    "models": [
      {
        "id": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        "name": "Llama 3.3 70B (Together)",
        "input": ["text"],
        "contextWindow": 128000
      }
    ]
  },
  "openrouter": {
    "baseUrl": "https://openrouter.ai/api/v1",
    "apiKey": "YOUR_KEY",
    "api": "openai-completions",
    "models": [
      {
        "id": "meta-llama/llama-3.3-70b-instruct:free",
        "name": "Llama 3.3 70B (OpenRouter Free)",
        "input": ["text"],
        "contextWindow": 128000
      }
    ]
  },
  "cerebras": {
    "baseUrl": "https://api.cerebras.ai/v1",
    "apiKey": "YOUR_KEY",
    "api": "openai-completions",
    "models": [
      {
        "id": "llama-3.3-70b",
        "name": "Llama 3.3 70B (Cerebras)",
        "input": ["text"],
        "contextWindow": 128000
      }
    ]
  },
  "nvidia": {
    "baseUrl": "https://integrate.api.nvidia.com/v1",
    "apiKey": "YOUR_KEY",
    "api": "openai-completions",
    "models": [
      {
        "id": "meta/llama-3.3-70b-instruct",
        "name": "Llama 3.3 70B (NVIDIA)",
        "input": ["text"],
        "contextWindow": 128000
      }
    ]
  }
}
```

## Signup Checklist

- [ ] Together AI: https://api.together.ai
- [ ] OpenRouter: https://openrouter.ai
- [ ] Cerebras: https://cloud.cerebras.ai
- [ ] Cloudflare Workers AI: https://dash.cloudflare.com
- [ ] NVIDIA NIM: https://build.nvidia.com
- [ ] Cohere: https://dashboard.cohere.com
- [ ] AI21: https://studio.ai21.com
- [ ] Fireworks AI: https://fireworks.ai
- [ ] Scaleway: https://console.scaleway.com
- [ ] Nebius: https://studio.nebius.ai
