# Production AI Strategy

## Decision: Ollama features disabled on Vercel (Option A)

Ollama runs on the developer's local PC (GPU inference). Vercel has no GPU and no Ollama instance.
All Ollama-dependent features will show clear "AI features require local setup" messages in production.

## What works on Vercel without Ollama

Core business workflows are fully functional without AI:

- Inquiry management (create, view, respond, convert to event)
- Event lifecycle (8-state FSM: draft through completed)
- Quote creation, sending, acceptance
- Payment processing (Stripe checkout, deposits, balances)
- Client management (invite, onboard, dietary preferences)
- Recipe CRUD (manual entry, no AI generation)
- Calendar and scheduling
- Financial dashboard (ledger-computed, deterministic)
- Email notifications (Resend)
- Embeddable inquiry form

## What is unavailable without Ollama

These features require Ollama and will show "Start Ollama to use this feature":

- Remy AI concierge (conversational assistant)
- Recipe text parsing (paste-to-structured)
- Brain dump parsing (voice notes to structured data)
- Email field extraction (AI-powered inbox triage)
- Campaign personalization (personalized outreach drafts)
- Chef bio generation
- Contract generation
- After-action report generation
- Contingency planning suggestions
- Grocery consolidation optimization
- Equipment depreciation explanations

## What works via cloud AI (no Ollama needed)

These use Gemini or Groq (cloud APIs) and work on Vercel if keys are set:

- Technique lists and kitchen specs (Gemini)
- Generic structured parsing tasks (Groq)
- Campaign concept drafting (Gemini, no client data)

## Error handling

`parseWithOllama` throws `OllamaOfflineError` when Ollama is unreachable.
All callers catch and re-throw this error. UI components display:

- "AI features require Ollama to be running"
- Clear instructions, not a crash or generic error

## Future options

If demand requires cloud AI for private data:

- Deploy Ollama on a GPU cloud provider (Runpod, Lambda Labs)
- Set `OLLAMA_BASE_URL` in Vercel env vars
- Estimated cost: $50-200/month depending on GPU tier
- Privacy architecture remains intact (private data goes to dedicated instance, not shared LLM)
