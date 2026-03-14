# Cloudflare Workers AI Setup

Cloudflare Workers AI is a cloud provider for non-private AI tasks only.

Do not send client names, financials, allergies, messages, or other private ChefFlow data through this provider. Those paths stay on Ollama.

## What You Need

1. A Cloudflare account
2. Your Cloudflare account ID
3. An API token with Workers AI access

Official docs:

- https://developers.cloudflare.com/workers-ai/get-started/rest-api/
- https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/

## Environment Variables

Add these to `.env.local`:

```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token

# Optional
CLOUDFLARE_WORKERS_AI_BASE_URL=https://api.cloudflare.com/client/v4/accounts/your-account-id/ai/v1
CLOUDFLARE_WORKERS_AI_MODEL_FAST=@cf/meta/llama-3.1-8b-instruct
CLOUDFLARE_WORKERS_AI_MODEL=@cf/meta/llama-3.3-70b-instruct-fp8-fast
CLOUDFLARE_WORKERS_AI_MODEL_COMPLEX=@cf/nvidia/nemotron-3-120b-a12b
```

## Notes

- ChefFlow uses the OpenAI-compatible endpoint at `/ai/v1/chat/completions`
- `lib/ai/parse-workers-ai.ts` requests JSON object responses for structured parsing
- You can swap models in env without changing code

## Intended Use

Use Workers AI for:

- fast generic prompts
- non-private structured extraction
- fallback cloud capacity for generic agents

Do not use Workers AI for any private ChefFlow workflow.
