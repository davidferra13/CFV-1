# GitHub Models Setup

GitHub Models is a cloud provider for non-private AI tasks only.

Do not send client names, financials, allergies, messages, or other private ChefFlow data through this provider. Those paths stay on Ollama.

## What You Need

1. A GitHub account with access to GitHub Models
2. A token with `models:read` permission

Official docs:

- https://docs.github.com/en/rest/models/inference

## Environment Variables

Add these to `.env.local`:

```bash
GITHUB_MODELS_TOKEN=github_pat_your_token_here

# Optional
GITHUB_MODELS_ORG=your-org-login
GITHUB_MODELS_BASE_URL=https://models.github.ai
GITHUB_MODELS_API_VERSION=2026-03-10
GITHUB_MODELS_MODEL_FAST=meta/Llama-3.1-8B-Instruct
GITHUB_MODELS_MODEL=openai/gpt-4.1-mini
GITHUB_MODELS_MODEL_COMPLEX=openai/gpt-4.1
```

## Notes

- Without `GITHUB_MODELS_ORG`, ChefFlow uses `https://models.github.ai/inference/chat/completions`
- If `GITHUB_MODELS_ORG` is set, ChefFlow uses `/orgs/{org}/inference/chat/completions`
- `lib/ai/parse-github-models.ts` requests JSON object responses for structured parsing

## Intended Use

Use GitHub Models for:

- generic drafting
- coding and tool orchestration prompts
- non-private structured parsing

Do not use GitHub Models for any private ChefFlow workflow.
