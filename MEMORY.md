# MEMORY.md - Long-Term Context

## About This Project

### What ChefFlow Is

ChefFlow is an operating system for chefs. Not a recipe app, not a booking tool, not a CRM, not a POS, not a project manager. It is the single unified platform that replaces all of those. Any chef running any kind of food business (private chef, personal chef, caterer, bakery, food truck, meal prep, pop-up, restaurant, commissary kitchen) should be able to open ChefFlow and run their entire operation from one place.

The core problem ChefFlow solves: chefs currently bounce between 10+ disconnected apps, spreadsheets, text threads, and paper notebooks to run their business. Recipes in one place, clients in another, finances in a third, scheduling somewhere else, shopping lists on paper, pricing done by gut feel. ChefFlow eliminates that chaos. Everything lives in one system, and everything is connected. Change a guest count and the shopping list, prep list, food cost, and quote all update automatically.

Tagline: **Ops for Artists.**

### Who It's For

Every chef archetype that runs a business:

- **Private chefs** serving wealthy clients with bespoke menus
- **Personal chefs** doing weekly meal prep for families
- **Caterers** handling events from 20 to 2,000 guests
- **Bakery operators** managing production schedules and wholesale orders
- **Food truck owners** tracking inventory, locations, and daily sales
- **Meal prep businesses** scaling recipes and managing subscriptions
- **Pop-up chefs** coordinating one-off events with rotating venues
- **Restaurant owners/chefs** managing daily operations
- **Commissary kitchen operators** sharing space and resources

The product strategy is to build deeply for multiple chef archetypes, then identify the universal needs across them and use that shared core to shape a unified dashboard that works for any chef.

### The Six Pillars

ChefFlow is organized around six operational pillars:

1. **Sell** - Inquiry pipeline, lead scoring (GOLDMINE), client management, quotes, proposals, booking flow. Everything from first contact to signed contract.
2. **Plan** - Menu builder, event planning, calendar, scheduling, timelines. Working backwards from service time to build the complete game plan.
3. **Cook** - Recipe library, components, sub-recipes, prep lists, production schedules, kitchen workflow. The chef's creative and operational backbone.
4. **Stock** - Ingredient database, inventory tracking, shopping list generation, vendor management, unit conversions, waste tracking. The chef does one initial inventory pass, then ChefFlow maintains live stock understanding by ingesting receipts, purchases, and known event pulls and usage.
5. **Money** - Quoting, invoicing, expense tracking, profit analysis, ledger-first financials, tax prep. Real numbers, not guesses. Every dollar tracked from quote to reconciliation.
6. **Grow** - Client retention, loyalty programs, marketing, social platform, reputation building, business analytics. Helping chefs build sustainable, growing businesses.

### The Core Problem (The Sunday Office Nightmare)

Every chef knows this: you sit down to work on one menu and suddenly you have 30 tabs open. A Google Doc for the menu layout. Canva for the front-of-house version. Individual recipe files for every dish. A spreadsheet with cost formulas you downloaded from some template and half-customized. Client notes: what they ate last time, dietary restrictions, communication history. Your own creative notes. Transcripts from conversations. Four hours deep in an office chair on a Sunday doing data entry instead of cooking.

The spreadsheet is the real killer. Rows of ingredients, unit costs, yield percentages, portion sizes, formulas that break if you look at them wrong. You build the menu creatively, then manually reconstruct it in a spreadsheet to find out if you can afford to serve it. Swap one dish, start over.

This is not a beginner problem. They teach this in culinary school and it is still a mess. Executive chefs with 20 years of experience are doing the same thing: Google Docs, Google Sheets, Canva, notes apps, text threads, all disconnected, all manual, all fragile.

ChefFlow kills the 30-tab Sunday. One place where the menu, the recipes, the costs, the client history, the communication notes, and the presentation all live together and talk to each other. Build the menu, costs update live. Swap a dish, everything recalculates. Pull up a client, see everything you have ever served them. No spreadsheet. No copy-pasting between apps.

### What Makes It Different

- **Everything is connected.** Recipes feed into menus, menus feed into shopping lists, shopping lists feed into costs, costs feed into quotes, quotes feed into invoices, invoices feed into profit analysis. One system, fully linked.
- **Real-time costing.** As a chef builds a menu, they see the food cost percentage updating live. No more finding out you undercharged after the event is over.
- **Chef creativity is sacred.** ChefFlow never generates recipes, menus, or any creative content. The chef's art is theirs. ChefFlow handles the business so the chef can focus on the craft.
- **Privacy first.** Client data stays local. Private data AI (Ollama) runs on the chef's own machine, never through cloud LLMs. A chef's client list, pricing strategy, and recipes are nobody else's business.
- **Built by a chef.** David has 10+ years in the industry. Every feature comes from real pain points, not startup theory.
- **Prevents mistakes.** The app is designed to be extremely easy to use and to actively prevent destructive mistakes or accidental damage. Chef-safe by default.

### The Social Platform

ChefFlow is not just a solo operations tool. It includes a chef social platform where chefs can connect, share (what they choose to share), build reputation, and grow their network. This is an important part of the product vision and should not be forgotten while building the ops core.

## Key Architecture Rules

- Server actions with 'use server' for all business logic
- Tenant-scoped queries on everything (tenant_id or chef_id from session, never from request body)
- All money in cents (integer minor units)
- Ledger-first financials (immutable, append-only, computed balances)
- Ollama for private data AI (never cloud LLMs for client data)
- No em dashes anywhere, ever
- No AI-generated recipes or menus, ever
- Formula over AI (deterministic code beats LLM when both can do it)

## Strict AI Policy (2026-03-13)

Canonical policy lives in `AI-POLICY.md`. Key rules every agent must follow:

1. **Never generate recipes.** Zero exceptions. AI can only search the chef's own recipe book (read-only).
2. **Formula over AI.** If deterministic code can do it, use deterministic code. Retroactive.
3. **Private data stays local.** Ollama only for PII, financials, allergies, messages, business data. No cloud fallback.
4. **AI assists, never owns truth.** All AI output is a suggestion. Chef confirms before it becomes canonical.
5. **Banned operations:** lifecycle transitions, financial ledger writes, identity/access changes, silent automation.
6. **Zero hallucination.** Never show fake success, never hide failure as zero, never render broken features as functional.
7. **No em dashes.** Anywhere. Ever.
8. **The hard boundary.** Unplug AI and ChefFlow must still function completely.

## About David (the developer/founder)

- Private chef with 10+ years experience
- Built ChefFlow from lived experience, not startup theory
- Uses voice-to-text (messages will be messy, read for intent)
- Direct communicator, hates wasted time
- Wants autonomous progress, not questions
- Core belief: ChefFlow handles the business, chef handles the art

## Infrastructure (2026-03-13)

Full reference: `docs/OPENCLAW-HIERARCHY.md`

Key facts:

- OpenClaw gateway retired from Pi (2026-03-17), needs new host if revived
- Ollama runs on developer PC (localhost:11434), used by ChefFlow App AI
- GPU: RTX 3050 (6GB VRAM). 30B models offload to CPU, run at 12-15 tok/s. Only qwen3:4b safe for fallback.
- OpenClaw billing: separate Anthropic API key with $50 prepaid credits (loaded Mar 13, 2026)
- Two active AI systems: Claude Code (Rank 1, PC), ChefFlow App AI (runtime)
- Claude Code outranks OpenClaw on all code decisions. OpenClaw's output is always subject to review.
- OpenClaw agents: main (Opus), sonnet (Sonnet), build (Groq 70B), qa (Groq 70B), runner (Groq 8B)
- Groq free tier: ~30 req/min. Fallback chain: Opus -> Sonnet -> Groq 70B -> Ollama qwen3:4b
- Concurrency: max 2 agents simultaneous, max 3 subagents per agent
- Known bug: provider must be named `claude` not `anthropic` in config (normalizer crash)
- API key must be embedded directly in config (env var resolution broken with `claude` provider name)

## Team Operating Principles

- Work autonomously 24/7
- Pick up tasks from ROADMAP.md, top to bottom
- Make decisions, document them, move on
- Only escalate: data loss risk, security changes, production deploys
- Test your own work, fix your own bugs
- Commit meaningful chunks, update PROGRESS.md
- Active development work happens only on local:3300 unless David explicitly says otherwise
- Treat `http://10.0.0.153:3300/` as the actual local development server address and keep it current during active development
- Prioritize quick wins first, especially fast visible improvements and low-friction product gains, before deeper system work
- Use as many parallel agents as needed during active development, and run Ollama locally when the work genuinely needs it
