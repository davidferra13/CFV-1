# Remy AI Concierge — Complete Reference

> **This is the single source of truth for everything Remy can do, how it works, and where the code lives.**
> Updated: 2026-02-28. Agents: read this instead of re-scanning the codebase.

---

## What Is Remy?

Remy is ChefFlow's private AI concierge — a domain-specific assistant that helps private chefs manage their business. It runs on **local Ollama only** (never cloud LLMs for private data), stores conversations in **browser IndexedDB only** (never on servers), and operates under strict rules that protect chef IP and financial accuracy.

Remy is a **Pro feature** (`requirePro('remy')`). Free-tier chefs don't get Remy.

---

## 4 Remy Personalities (Same Backend, Different Context)

| Personality       | File                                 | Who Uses It             | Auth Required |
| ----------------- | ------------------------------------ | ----------------------- | ------------- |
| **Chef-facing**   | `lib/ai/remy-personality.ts`         | Logged-in chefs         | Yes           |
| **Client-facing** | `lib/ai/remy-client-personality.ts`  | Logged-in clients       | Yes           |
| **Public**        | `lib/ai/remy-public-personality.ts`  | Public inquiry pages    | No            |
| **Landing**       | `lib/ai/remy-landing-personality.ts` | Marketing/landing pages | No            |

---

## 7 Archetypes (Chef Picks Their Vibe)

Configured at **Settings > Privacy & Data**. Stored in `ai_preferences` table.

| ID        | Name             | Emoji | Vibe                                                                          |
| --------- | ---------------- | ----- | ----------------------------------------------------------------------------- |
| `veteran` | The Veteran      | 🔪    | **Default.** 40-year kitchen pro, direct, warm, food-first, kitchen metaphors |
| `hype`    | The Hype Chef    | 🔥    | HIGH ENERGY, every win is a celebration, Guy Fieri + Gordon Ramsay            |
| `zen`     | The Zen Chef     | 🍃    | Calm, measured, intentional, fewer emojis, kaiseki master vibe                |
| `numbers` | The Numbers Chef | 📊    | Data-driven, leads with margins and food cost %, CFO energy                   |
| `mentor`  | The Mentor       | 👨‍🍳    | Teaching mode, drops knowledge, Socratic questions, Jacques Pepin             |
| `hustler` | The Hustler      | 💸    | Money-obsessed (in the best way), relentless about revenue, upsells           |
| `classic` | Classic Remy     | 🐀    | Original: warm, professional, minimal flourishes, clean communication         |

**Implementation:** `lib/ai/remy-archetypes.ts`

---

## On-Demand Commands (Chef Triggers via Chat)

### Core Operations (No LLM Required)

| Command                   | What It Does                       | LLM? | File                              |
| ------------------------- | ---------------------------------- | ---- | --------------------------------- |
| `ops.portion_calc`        | Calculate portions for guest count | No   | `lib/ai/operations-actions.ts`    |
| `ops.packing_list`        | Generate packing list for event    | No   | `lib/ai/operations-actions.ts`    |
| `ops.cross_contamination` | Cross-contamination risk check     | No   | `lib/ai/operations-actions.ts`    |
| `analytics.break_even`    | Break-even analysis                | No   | `lib/ai/analytics-actions.ts`     |
| `analytics.client_ltv`    | Client lifetime value              | No   | `lib/ai/analytics-actions.ts`     |
| `analytics.recipe_cost`   | Recipe cost optimization           | Yes  | `lib/ai/analytics-actions.ts`     |
| `client.event_recap`      | Event recap for client             | No   | `lib/ai/client-facing-actions.ts` |
| `client.menu_explanation` | Explain menu to client             | No   | `lib/ai/client-facing-actions.ts` |

### Email Commands

| Command               | What It Does                                                | Tier |
| --------------------- | ----------------------------------------------------------- | ---- |
| `email.recent`        | Show recent emails (sender, subject, classification)        | 1    |
| `email.search`        | Search by sender, subject, body                             | 1    |
| `email.thread`        | Full conversation thread                                    | 1    |
| `email.inbox_summary` | Overview: counts by category, last sync                     | 1    |
| `email.draft_reply`   | Draft reply with thread context (chef approves before send) | 2    |

**Implementation:** `lib/ai/remy-email-actions.ts`

### Draft Generation (10+ Templates)

All drafts are **proposals only** — chef reviews and sends manually. Remy never auto-sends.

| Draft Type            | Use Case                               |
| --------------------- | -------------------------------------- |
| Thank You             | Post-event gratitude                   |
| Referral Request      | Ask happy client for referrals         |
| Testimonial Request   | Ask for review/testimonial             |
| Quote Cover Letter    | Attach to a quote proposal             |
| Decline Response      | Politely decline an inquiry            |
| Cancellation Response | Handle cancellation gracefully         |
| Payment Reminder      | Friendly overdue nudge                 |
| Re-Engagement         | Reach out to dormant client            |
| Milestone Recognition | Celebrate client anniversary/milestone |
| Food Safety Incident  | Incident communication                 |

**Implementation:** `lib/ai/draft-actions.ts`

### Web Commands

| Command      | What It Does                                     |
| ------------ | ------------------------------------------------ |
| `web.search` | Search the web (Tavily API, DuckDuckGo fallback) |
| `web.read`   | Fetch and extract content from a URL             |

**Implementation:** `lib/ai/remy-web-actions.ts`

---

## Scheduled Jobs (Background Tasks)

| Job                                 | Interval | LLM? | What It Does                    |
| ----------------------------------- | -------- | ---- | ------------------------------- |
| `scheduled.stale_inquiry_scanner`   | 6 hours  | No   | Flag inquiries going cold       |
| `scheduled.payment_overdue_scanner` | 1 day    | No   | Flag overdue payments           |
| `scheduled.social_post_draft`       | 1 week   | Yes  | Draft social media content      |
| `scheduled.client_sentiment`        | 1 week   | Yes  | Monitor client sentiment trends |

**Reactive:** `reactive.payment_overdue` — When event overdue >7 days, draft friendly reminder.

**Implementation:** `lib/ai/scheduled/jobs.ts`

---

## Agent Actions (Tier 2 — Chef Confirms Before Execute)

Remy can propose write operations. Chef sees a preview and confirms. Two-step flow: propose → confirm.

### Allowed Agent Actions

- Create/update client
- Create/update event
- Create quote
- Create menu
- Search chef's existing recipes (read-only — never generate)
- Log expense
- Create document/folder
- Add note/tag to entity
- Schedule call
- And ~20 more domain-specific actions

**Implementation:** `lib/ai/agent-actions/` (8 domain files)

### Permanently Restricted Actions (NEVER Allowed)

| Action                 | Why                                                          |
| ---------------------- | ------------------------------------------------------------ |
| `agent.ledger_write`   | Ledger is immutable — manual entry only for audit accuracy   |
| `agent.modify_roles`   | Security-critical — no AI access                             |
| `agent.delete_data`    | Prevents accidental data loss                                |
| `agent.send_email`     | All outbound requires chef review                            |
| `agent.refund`         | Financial audit compliance                                   |
| `agent.create_recipe`  | **PERMANENT.** Recipes are chef IP. AI never generates them. |
| `agent.update_recipe`  | **PERMANENT.**                                               |
| `agent.add_ingredient` | **PERMANENT.**                                               |

**Implementation:** `lib/ai/agent-actions/restricted-actions.ts`

---

## Context & Awareness (What Remy Knows)

Remy loads business context before every response. Cached in tiers:

### Tier 1 (Always Fresh)

- Chef profile (name, business name, tagline)
- Quick counts (clients, upcoming events, open inquiries)
- Daily plan

### Tier 2 (5-Minute Cache)

- Upcoming events (with details)
- Recent clients
- Monthly revenue
- Pending quotes
- Staff roster
- Equipment summary
- Active goals & todos
- Upcoming calls
- Document summary
- Recent artifacts
- Recipe stats
- Client vibe notes
- Recent AAR insights
- Pending menu approvals

### Tier 3 (Non-Blocking, Fails Gracefully)

- Email digest
- Page entity context (what page chef is on + relevant entity)
- Calendar summary

### Per-Entity Deep Context

| Entity        | What Remy Sees                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------- |
| **Events**    | Ledger entries, expenses, staff, temp logs, quotes, status history, menu approval, grocery quotes |
| **Clients**   | Full details + up to 15 event history                                                             |
| **Inquiries** | Full message thread (direction, channel, date, subject, body)                                     |

**Implementation:** `lib/ai/remy-context.ts`, `lib/ai/remy-client-context.ts`

---

## Memory System

Remy remembers facts about the chef's business across conversations.

### Memory Categories

| Category              | Example                                |
| --------------------- | -------------------------------------- |
| `chef_preference`     | "I prefer organic produce"             |
| `client_insight`      | "Sarah is allergic to tree nuts"       |
| `pricing_pattern`     | "I charge $125/head for tasting menus" |
| `scheduling_pattern`  | "Never book Sundays"                   |
| `communication_style` | "Keep client emails formal"            |
| `business_rule`       | "50% deposit required upfront"         |
| `culinary_note`       | "Sous vide at 137F for wagyu"          |
| `workflow_preference` | "Always do grocery run day before"     |

### Operations

- **Extraction:** Ollama extracts NEW facts from chef messages only (never Remy's own responses)
- **Storage:** `remy_memories` table (Supabase)
- **Decay:** Memories not accessed in 90 days with importance < 5 and access_count < 3 auto-deactivate
- **User control:** "Show my memories" / "Remember that..." / tap X to delete

**Implementation:** `lib/ai/remy-memory-actions.ts`

---

## Safety & Guardrails

### Two-Layer Defense

1. **Pre-LLM Regex Layer** (`lib/ai/remy-guardrails.ts`) — Instant block, zero cost, catches dangerous content before any LLM call
2. **System Prompt Layer** (`lib/ai/remy-personality.ts`) — Topic boundaries, anti-injection rules baked into the system prompt

### What Gets Blocked (Critical — Immediate Refusal)

- Weapons/explosives, violence, drug synthesis, self-harm
- CSAM, terrorism, hacking/fraud
- Racial/ethnic slurs, homophobic/transphobic slurs
- Direct threats, sexual harassment

### What Gets Flagged (Warning — Logged + Redirect)

- Prompt injection ("ignore all previous instructions")
- System prompt extraction attempts
- Jailbreak patterns ("DAN mode", "developer mode")
- Role-play escape attempts

### Escalation

| Level          | Trigger                           | Action                    |
| -------------- | --------------------------------- | ------------------------- |
| **Pass**       | Normal message                    | Processed normally        |
| **Warning**    | Injection, off-topic probing      | Logged, light redirect    |
| **Critical**   | Dangerous content, slurs, threats | Logged, stern refusal     |
| **Auto-block** | 2+ prior critical incidents       | 24-hour lockout from Remy |

### Recipe Generation Block (HARD — Before LLM)

20+ regex patterns detect recipe generation attempts and block **before any LLM call**:

- "Create/generate recipe", "recipe for X", "how to cook/make X"
- "What should I cook", "add a recipe", "meal plan/idea/suggestion"

Refusal: "I can't create, suggest, or generate recipes — that's your creative domain!"

### Admin Bypass

Admins (`ADMIN_EMAILS` env var) skip ALL guardrails — never rate-limited, never content-filtered, never blocked.

**Implementation:** `lib/ai/remy-guardrails.ts`, `lib/ai/remy-input-validation.ts`, `lib/ai/remy-abuse-actions.ts`

---

## Input Validation & Limits

| Limit                         | Value                         |
| ----------------------------- | ----------------------------- |
| Max message length            | 2,000 chars                   |
| Max history messages          | 20                            |
| Max chars per history message | 4,000                         |
| Max total history chars       | 30,000                        |
| Max file attachment           | 5 MB                          |
| Max conversations (IndexedDB) | 200 (auto-prune oldest)       |
| Max messages per conversation | 500                           |
| Rate limit                    | 12 messages/minute per tenant |

**Sanitization:** Database fields are sanitized for prompt injection before being injected into system prompts. SSRF protection blocks localhost, private IPs, and cloud metadata endpoints.

**Implementation:** `lib/ai/remy-input-validation.ts`

---

## Privacy Architecture (Level 3 — By Design)

**Core principle:** "We don't have your data" > "We have your data but we promise not to look."

| Data                                                 | Stored?                | Where                  | Who Sees It               |
| ---------------------------------------------------- | ---------------------- | ---------------------- | ------------------------- |
| Business data (clients, events, recipes, financials) | Yes                    | Supabase (encrypted)   | Chef only (tenant-scoped) |
| Conversation content (prompts + responses)           | **No**                 | Browser IndexedDB only | Chef only                 |
| Anonymous usage metrics (counts only)                | Yes                    | Supabase               | ChefFlow (aggregate)      |
| Error logs (stack traces)                            | Yes                    | Server logs            | Engineering               |
| Conversations shared via "Send to Support"           | Only if chef initiates | Supabase               | Support team              |

**Data flow:** Chef types → Browser sends to API → API routes to local Ollama → Response streams back → Stored in IndexedDB → Nothing on servers.

**External APIs** (Spoonacular, Kroger, Instacart, MealMe) receive item-level data only (e.g., "broccoli price"), never PII or conversations.

**Implementation:** `lib/ai/remy-local-storage.ts`, `docs/remy-privacy-architecture.md`

---

## UI Components

### Main Interface

| Component          | File                                        | Purpose                                |
| ------------------ | ------------------------------------------- | -------------------------------------- |
| Remy Drawer        | `components/ai/remy-drawer.tsx`             | Main chat interface (slide-out drawer) |
| Chat Messages      | `components/ai/remy-client-chat.tsx`        | Message display with markdown          |
| Conversation List  | `components/ai/remy-conversation-list.tsx`  | Browse saved conversations             |
| Search View        | `components/ai/remy-search-view.tsx`        | Search across conversations            |
| Templates View     | `components/ai/remy-templates-view.tsx`     | Saved prompt starters                  |
| Hub Dashboard      | `components/ai/remy-hub-dashboard.tsx`      | Home view                              |
| Capabilities Panel | `components/ai/remy-capabilities-panel.tsx` | "What can Remy do?"                    |
| Action Log         | `components/ai/remy-action-log.tsx`         | History of executed actions            |
| Task Card          | `components/ai/remy-task-card.tsx`          | Rich result cards                      |
| Mascot Button      | `components/ai/remy-mascot-button.tsx`      | FAB to open drawer                     |

### Animated Mascot

| Component        | File                                     | Purpose                  |
| ---------------- | ---------------------------------------- | ------------------------ |
| Animated Mascot  | `components/ai/remy-animated-mascot.tsx` | Main character animation |
| Talking Avatar   | `components/ai/remy-talking-avatar.tsx`  | Avatar with lip-sync     |
| Sprite Animator  | `components/ai/remy-sprite-animator.tsx` | Sprite sheet engine      |
| Static Avatar    | `components/ai/remy-avatar.tsx`          | Fallback static image    |
| Sprite Loader    | `lib/ai/remy-sprite-loader.ts`           | Load sprite sheets       |
| Sprite Manifests | `lib/ai/remy-sprite-manifests.ts`        | Sprite metadata          |
| Lip Sync Hook    | `lib/ai/use-remy-lip-sync.ts`            | Lip-sync to audio        |
| Visemes          | `lib/ai/remy-visemes.ts`                 | Mouth shape data         |
| Eye Blink        | `lib/ai/remy-eye-blink.ts`               | Blink animation          |
| Emotion          | `lib/ai/remy-emotion.ts`                 | Emotional state          |
| Body State       | `lib/ai/remy-body-state.ts`              | Body animation state     |

### Privacy & Onboarding

| Component          | File                                                | Purpose            |
| ------------------ | --------------------------------------------------- | ------------------ |
| Archetype Selector | `components/ai-privacy/remy-archetype-selector.tsx` | Pick personality   |
| Privacy Gate       | `components/ai-privacy/remy-gate.tsx`               | Privacy disclaimer |
| Onboarding Wizard  | `components/ai-privacy/remy-onboarding-wizard.tsx`  | First-time setup   |

### Public-Facing

| Component         | File                                           | Purpose                                 |
| ----------------- | ---------------------------------------------- | --------------------------------------- |
| Concierge Widget  | `components/public/remy-concierge-widget.tsx`  | Embeddable inquiry widget (drag/resize) |
| Concierge Section | `components/public/remy-concierge-section.tsx` | Landing page section                    |
| Daily Ops Summary | `components/daily-ops/remy-summary.tsx`        | Daily plan summary                      |

---

## API Routes

| Route               | Method | Purpose                                |
| ------------------- | ------ | -------------------------------------- |
| `/api/remy/stream`  | POST   | Main streaming chat (SSE, chef-facing) |
| `/api/remy/client`  | POST   | Client-facing chat                     |
| `/api/remy/public`  | POST   | Public inquiry chat                    |
| `/api/remy/landing` | POST   | Landing page chat                      |

---

## UX Details

| Feature          | Detail                                                  |
| ---------------- | ------------------------------------------------------- |
| Open/close       | `Ctrl+K` / `Cmd+K` toggles drawer                       |
| Streaming        | Token-by-token SSE, markdown renders as tokens arrive   |
| Copy             | Hover to copy message text                              |
| Export           | Download conversation as Markdown, JSON, or plain text  |
| Sound            | Optional 800Hz notification tone                        |
| File attachment  | `.txt`, `.md`, `.csv`, `.json` (reads content) + images |
| Context starters | Dynamic suggested prompts based on current page         |
| Voice input      | Web Speech API (browser-native)                         |

---

## Database Tables

| Table                 | Purpose                                  |
| --------------------- | ---------------------------------------- |
| `ai_preferences`      | Archetype selection, custom instructions |
| `remy_memories`       | Persistent memory items                  |
| `remy_usage_metrics`  | Anonymous usage counts                   |
| `remy_support_shares` | Voluntarily shared conversations         |
| `remy_abuse_log`      | Guardrail violation log + blocking       |

---

## Hooks (Client-Side)

| Hook                        | File                                       | Purpose                    |
| --------------------------- | ------------------------------------------ | -------------------------- |
| `useRemySend`               | `lib/hooks/use-remy-send.ts`               | Send messages to Remy API  |
| `useConversationManagement` | `lib/hooks/use-conversation-management.ts` | Manage local conversations |
| `useMessageActions`         | `lib/hooks/use-message-actions.ts`         | Message UI actions         |
| `useVoiceInput`             | `lib/hooks/use-voice-input.ts`             | Voice-to-text input        |

---

## IndexedDB Schema (Browser-Local)

Database: `chefflow-remy` (v2)

| Store           | Contents                                                                     |
| --------------- | ---------------------------------------------------------------------------- |
| `conversations` | Title, projectId, pinned, archived, bookmarkCount, timestamps                |
| `messages`      | ConversationId, role, content, bookmarked, tasks, navSuggestions             |
| `projects`      | Folders: Events, Recipes & Menus, Clients, Finance, Communications, Planning |
| `templates`     | Reusable prompt starters with icons                                          |
| `actionLog`     | Action name, status, duration, result summary                                |

---

## Environment Variables

```bash
# Required for email integration
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# Optional SMS
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxx

# Optional web search (falls back to DuckDuckGo)
TAVILY_API_KEY=xxxxx

# Admin bypass for guardrails
ADMIN_EMAILS=admin@example.com
```

---

## Key Files Quick Reference

| What                     | Where                                         |
| ------------------------ | --------------------------------------------- |
| Main server action       | `lib/ai/remy-actions.ts`                      |
| Command router           | `lib/ai/command-orchestrator.ts`              |
| Command descriptions     | `lib/ai/command-task-descriptions.ts`         |
| Intent classifier        | `lib/ai/remy-classifier.ts`                   |
| Guardrails               | `lib/ai/remy-guardrails.ts`                   |
| Input validation         | `lib/ai/remy-input-validation.ts`             |
| Abuse logging            | `lib/ai/remy-abuse-actions.ts`                |
| Memory CRUD              | `lib/ai/remy-memory-actions.ts`               |
| Email actions            | `lib/ai/remy-email-actions.ts`                |
| Draft actions            | `lib/ai/draft-actions.ts`                     |
| Operations actions       | `lib/ai/operations-actions.ts`                |
| Analytics actions        | `lib/ai/analytics-actions.ts`                 |
| Client-facing actions    | `lib/ai/client-facing-actions.ts`             |
| Web actions              | `lib/ai/remy-web-actions.ts`                  |
| Artifact actions         | `lib/ai/remy-artifact-actions.ts`             |
| Context loader           | `lib/ai/remy-context.ts`                      |
| Client context           | `lib/ai/remy-client-context.ts`               |
| Chef personality         | `lib/ai/remy-personality.ts`                  |
| Public personality       | `lib/ai/remy-public-personality.ts`           |
| Landing personality      | `lib/ai/remy-landing-personality.ts`          |
| Client personality       | `lib/ai/remy-client-personality.ts`           |
| Archetypes               | `lib/ai/remy-archetypes.ts`                   |
| Restricted actions       | `lib/ai/agent-actions/restricted-actions.ts`  |
| Local storage            | `lib/ai/remy-local-storage.ts`                |
| Metrics                  | `lib/ai/remy-metrics.ts`                      |
| Types                    | `lib/ai/remy-types.ts`                        |
| Memory types             | `lib/ai/remy-memory-types.ts`                 |
| Starters                 | `lib/ai/remy-starters.ts`                     |
| Welcome                  | `lib/ai/remy-welcome.ts`                      |
| Markdown config          | `lib/ai/remy-markdown-config.tsx`             |
| Activity tracker         | `lib/ai/remy-activity-tracker.ts`             |
| Drawer UI                | `components/ai/remy-drawer.tsx`               |
| Context provider         | `components/ai/remy-context.tsx`              |
| Wrapper                  | `components/ai/remy-wrapper.tsx`              |
| Concierge widget         | `components/public/remy-concierge-widget.tsx` |
| Privacy architecture doc | `docs/remy-privacy-architecture.md`           |

---

## Non-Negotiable Rules (Summary)

1. **Recipes = NEVER.** AI never generates, suggests, or creates recipes. Only searches chef's own recipe book (read-only).
2. **Privacy = Local only.** Conversations in IndexedDB, LLM via Ollama, nothing on servers.
3. **Drafts only.** Remy drafts emails/comms but never auto-sends. Chef reviews and sends.
4. **Ledger = immutable.** AI cannot write to ledger. Suggest only.
5. **Lifecycle = manual.** AI cannot transition event states without chef confirmation.
6. **Formula > AI.** If deterministic code can do it, don't use AI.
7. **Concierge widget corners.** Drag/resize corners on the widget are sacred — 16px hit area, z-30.

---

_Last updated: 2026-02-28 by Claude Code. Update this file whenever Remy's capabilities change._
