# Groq Free Cloud AI - Setup Guide

## What This Is

Groq provides free cloud inference for open-source models (Llama 3, Mixtral) on their custom LPU hardware. ~800 tokens/sec, free tier includes ~30 requests/minute and ~14,400 requests/day.

Used for: OpenClaw build/QA/runner agents, and ChefFlow non-private generic tasks.
NOT used for: Any client PII, financials, allergies, messages (those stay on Ollama, local only).

## Step 1: Get a Groq API Key

1. Go to https://console.groq.com
2. Sign up (free, no credit card)
3. Create an API key
4. Save it somewhere safe

## Step 2: Add to ChefFlow .env.local

```bash
# Groq free cloud inference (non-private tasks only)
GROQ_API_KEY=gsk_your_key_here

# Optional overrides (defaults are fine):
# GROQ_BASE_URL=https://api.groq.com/openai/v1
# GROQ_MODEL_FAST=llama-3.1-8b-instant
# GROQ_MODEL=llama-3.3-70b-versatile
# GROQ_MODEL_COMPLEX=llama-3.3-70b-versatile
```

## Available Groq Models (Free Tier)

| Model                   | Speed      | Context | Best For                                       |
| ----------------------- | ---------- | ------- | ---------------------------------------------- |
| llama-3.3-70b-versatile | ~250 tok/s | 128K    | Code gen, structured output, reasoning         |
| llama-3.1-8b-instant    | ~800 tok/s | 128K    | Quick tasks, classification, simple generation |
| mixtral-8x7b-32768      | ~500 tok/s | 32K     | Balanced speed/quality                         |
| gemma2-9b-it            | ~600 tok/s | 8K      | Light tasks, short context                     |

## Free Tier Limits

- ~30 requests/minute
- ~14,400 requests/day
- ~6,000 tokens/minute (varies by model)
- No credit card required
- Rate limit headers: `x-ratelimit-remaining-requests`, `retry-after`

## Architecture After Upgrade

```
Claude Opus/Sonnet (paid)  →  Orchestration, architecture, escalation
Groq Llama 3 (free cloud)  →  Build, QA, runner (fast, free)
Ollama qwen3:4b (local)    →  Fallback when Groq rate-limits
Ollama (local, all models)  →  ChefFlow private data (Remy, GOLDMINE, etc.)
```

## Privacy Boundary (unchanged)

Groq is a cloud service. Data sent to Groq leaves your machine.

SAFE to send via Groq: Code, generic prompts, technique lists, campaign concepts (no PII).
NEVER send via Groq: Client names, contact info, dietary restrictions, allergies, financials, messages, recipes.

The privacy rules in CLAUDE.md are unchanged. Groq supplements Ollama for non-private tasks; it does not replace Ollama for private data.
