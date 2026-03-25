# Task: Write a 5-Minute Demo Script for ChefFlow

## Context

ChefFlow is a multi-tenant SaaS platform for private chefs. It's at app.cheflowhq.com (production) and beta.cheflowhq.com (beta). The developer needs to demonstrate this to a skeptical business partner whose girlfriend has a CS master's degree. The demo must prove this is a real, working product, not a toy.

## What to produce

Write `docs/demo-script.md` - a step-by-step walkthrough the developer can follow while screen-sharing or showing his laptop. No screenshots needed, just the click path and what to say at each step.

## The demo flow (5 minutes, this exact order)

### Act 1: The Hook (30 seconds)

- Open app.cheflowhq.com or beta.cheflowhq.com
- Show the landing page briefly
- Say: "This is the public site. Now let me show you what a chef sees."
- Sign in with the developer's account (davidferra13@gmail.com, creds in .auth/developer.json)

### Act 2: Command Center (60 seconds)

- /dashboard - the chef's home base. Point out: upcoming events, revenue summary, recent activity, action items
- /inquiries - the inquiry pipeline. Point out: GOLDMINE lead scores (0-100, fully deterministic, no AI), source tracking, follow-up deadlines
- Click into an inquiry to show the detail view with scoring breakdown

### Act 3: Event Lifecycle (90 seconds)

- /events - show the event list with status badges (draft, proposed, accepted, paid, confirmed, in_progress, completed, cancelled)
- Click into a real event. Walk through:
  - Event details (date, location, guest count, dietary restrictions)
  - Quote tab (line items, pricing, client-facing proposal)
  - Financial tab (ledger-based, immutable records, payment tracking)
  - The FSM transitions (what actions are available at each state)
- Say: "Every event follows an 8-state lifecycle. The system enforces the rules so the chef can focus on cooking."

### Act 4: Client Intelligence (45 seconds)

- /clients - show the client list with loyalty tiers
- Click into a client with history. Show:
  - Event history
  - Dietary needs and allergies (critical for safety)
  - Loyalty tier, points balance, lifetime spend
- Say: "The system tracks everything about a client across every event. Loyalty is hardwired into invoices and emails automatically."

### Act 5: The Business Layer (45 seconds)

- /finance - revenue, expenses, P&L (all computed from immutable ledger entries, never stored balances)
- /calendar - visual scheduling
- /recipes and /menus - chef's intellectual property, menu builder
- Say: "Revenue numbers come from an append-only financial ledger. Same architecture banks use. You can't edit a past transaction, only add corrections."

### Act 6: The Moat (30 seconds)

- /settings/embed - show the embeddable widget
- Open the embed form in a new tab: /embed/inquiry/{chefId}
- Say: "A chef drops one script tag on their website and clients can submit inquiries directly. Those flow into the pipeline you just saw."
- Pull out phone, show the same dashboard on mobile (it's a PWA)
- Say: "Works on phone too. Chefs are never at a desk."

### Closing (30 seconds)

- "This covers 467 actions across 18 stages of a private chef's workflow. I know because I've been doing this for 10 years. Nobody else has built this because nobody else has the domain expertise. The code is the easy part."

## Technical points to mention if she asks

These are for the CS-educated skeptic specifically:

- Multi-tenant with row-level security (PostgreSQL RLS). Every query is tenant-scoped. A chef can never see another chef's data.
- 8-state finite state machine for events with enforced transitions
- Immutable append-only financial ledger (same pattern as double-entry accounting)
- Privacy-first AI: all client data stays local via Ollama. PII never leaves the machine. Not even to OpenAI or Google.
- Embeddable widget with relaxed CSP (frame-ancestors \*) for cross-origin embedding
- 265+ pages, 100+ Playwright E2E tests, soak tests for memory leaks, stress tests for AI queue
- Freemium billing with tier gating, module toggles, and upgrade gates
- GOLDMINE lead scoring is 100% deterministic (regex + math), zero AI dependency

## Style

- Write it conversational, not technical. The developer will be talking, not reading slides.
- Keep each step to 1-2 sentences of what to say. Don't script word-for-word, just key points.
- Note which URL to navigate to at each step.
- Mark moments where the developer should pause and let them look.
- No em dashes anywhere in the document.
