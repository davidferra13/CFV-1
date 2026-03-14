# Pixel Kitchen Complete Metaphor Map

> Every system, service, agent, and component in the ChefFlow ecosystem
> has a visual representation in the Mission Control pixel kitchen.
> This document maps them all.

Last updated: 2026-03-13

---

## Core Rule: Chefs = Agents

Only AI agents get chef/cook characters. Infrastructure (servers, databases, services) is represented as kitchen equipment. If it's not an agent, it's not a chef.

---

## Complete Metaphor Registry

### WALL ZONE (Top 12%)

| Visual                      | System                                                        | Description                            |
| --------------------------- | ------------------------------------------------------------- | -------------------------------------- |
| Hood Vent                   | Cloudflare Tunnel                                             | Smoke particles when tunnel is online  |
| Cookbook on shelf ("G")     | Google Gemini                                                 | Non-private AI tasks only              |
| Neon OPEN sign              | DNS / cheflowhq.com                                           | Always glowing when domain is live     |
| Timer Board (7 clocks)      | Cron Jobs (30+)                                               | Ticking clock hands, flash when firing |
| AI Provider Shelf           | Groq, Cerebras, Mistral, SambaNova, GitHub Models, Workers AI | Unique kitchen equipment per provider  |
| Food Truck (outside window) | Cloudflare Workers AI                                         | Edge inference, serves at the edge     |

### KITCHEN ZONE (38%)

| Visual                         | System                              | Type      | Description                                       |
| ------------------------------ | ----------------------------------- | --------- | ------------------------------------------------- |
| **Head Chef** (2x scaled)      | Ollama inference server             | AGENT     | Breathing, chopping, tasting, thought bubbles     |
| **Claude Code Portrait**       | Claude Code (lead engineer)         | AGENT     | Framed on wall, glowing green eyes watching       |
| **OpenClaw Brigade** (5 cooks) | main, sonnet, build, qa, runner     | AGENTS    | Near delivery door, activity indicators           |
| Stove Line (3 burners)         | Dev :3100 / Beta :3200 / Production | EQUIPMENT | Flame animation when online, pilot light when off |
| Walk-In Cooler                 | Supabase database                   | EQUIPMENT | Temperature = latency, real food sprites          |
| Dish Pit                       | Git repository                      | EQUIPMENT | Dirty dishes = uncommitted files                  |
| Deep Fryer                     | Stripe payments                     | EQUIPMENT | Oil shimmer, bubble particles, $ sign             |
| Ticket Printer                 | HTTP request activity               | EQUIPMENT | Paper length = file change rate                   |
| Delivery Door                  | OpenClaw Pi Gateway                 | EQUIPMENT | Hand truck visible when online                    |
| Prep Station                   | TypeScript compiler                 | EQUIPMENT | Cutting board = mise en place                     |
| AI Dispatch Wheel              | lib/ai/dispatch/ routing            | EQUIPMENT | Spinning ticket carousel                          |

### PASS ZONE (6%)

| Visual                | System                       | Description                          |
| --------------------- | ---------------------------- | ------------------------------------ |
| Expo Chef (3x scaled) | Mission Control orchestrator | Black coat, bandana, reading tickets |
| Heat Lamps (5)        | Vercel CDN / edge            | Amber glow when production is up     |
| Plates with food      | Active events                | Real Kenney food sprites on plates   |
| Activity Ticker       | Recent file changes          | Scrolling text of modified files     |

### DINING ZONE (32%)

| Visual                      | System                | Description                                                          |
| --------------------------- | --------------------- | -------------------------------------------------------------------- |
| **OpenClaw Command Center** | 5 OpenClaw agents     | 60% width panel with large characters, live activity feeds per agent |
| Host Stand                  | Inquiries             | Guest count = open inquiries, overdue badge                          |
| Dining Tables (4x3 grid)    | Events by state       | Color-coded: draft, proposed, accepted, etc.                         |
| Cash Register               | Revenue               | Green LCD digits showing $ total                                     |
| Bar (bottles)               | External services     | Resend, Twilio, PostHog, Sentry                                      |
| Front Door                  | Google OAuth          | Main entrance, welcome mat                                           |
| Smoke Detector              | Sentry error tracking | LED on ceiling                                                       |
| Security Camera             | PostHog analytics     | Red recording LED blinks                                             |
| Gmail mailbox               | Gmail sync / GOLDMINE | Red wall-mounted mailbox, envelope pokes out                         |
| Redis speed rail            | Upstash Redis cache   | Colored bottles under bar counter                                    |
| Cloudinary photo wall       | Image hosting         | 3 framed food photos on dining wall                                  |

### HUD BAR (12%)

| Visual           | System                                      | Description                        |
| ---------------- | ------------------------------------------- | ---------------------------------- |
| Service dots     | Dev, Beta, Prod, Ollama, Supabase, OpenClaw | Green/red status dots              |
| Revenue display  | Financial summary                           | Dollar amount in green             |
| Event count      | Total events                                | Number display                     |
| Inquiry count    | Open inquiries                              | Red if overdue                     |
| Day phase + time | Time of day                                 | morning/day/golden/evening/night   |
| Sound toggle     | Audio effects                               | SND/MUTE button                    |
| Recent files     | Activity log                                | Last 5 modified files + timestamps |
| Weather          | Local weather                               | Condition + temperature            |

---

## Data Flow

All visuals are driven by live data from three endpoints:

- `/api/pixel/data` (polled every 15s): events, revenue, inquiries, infrastructure, agent states
- `/api/activity/summary` (polled every 10s): recent file changes, activity feed
- `/api/openclaw/status` (polled every 8s): per-agent activity logs from Pi gateway journal

OpenClaw gateway status comes from `bizData.agentStates.openclawGateway` and `bizData.infrastructure.openclawGateway`.

---

## Removed Elements (and why)

| Element                        | Was                                  | Reason removed                                                  |
| ------------------------------ | ------------------------------------ | --------------------------------------------------------------- |
| 3 Line Cooks (Saute/Grill/Fry) | Dev/Beta/Prod servers drawn as chefs | Servers are equipment (burners), not agents                     |
| Dishwasher cook                | Git dirty files drawn as a chef      | Git is equipment (dish pit), not an agent                       |
| Remy cameo                     | AI concierge drawn in dining zone    | App feature, not infrastructure. Only relevant when being coded |
| Gustav office window           | MC chat AI in office                 | App feature, not infrastructure. Only relevant when being coded |

---

## Developer's Priority Note (Mar 13, 2026)

The pixel kitchen is the fun visual layer, but **operational visibility comes first**:

- What OpenClaw agents are doing RIGHT NOW
- Todo lists: queued, active, completed (crossed off)
- How Opus is orchestrating and delegating
- Nothing hidden, nothing in the dark

The OpenClaw Activity panel (panel-openclaw in index.html) is the primary operational view. The pixel kitchen provides at-a-glance infrastructure health with kitchen metaphors.
