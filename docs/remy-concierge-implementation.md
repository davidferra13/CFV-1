# Remy Concierge — Implementation Doc

> Session: 2026-02-22
> Branch: `feature/risk-gap-closure`

## What Changed

Remy is now the **marketing hook** for ChefFlow. Visitors and new users are greeted by Remy with a simple question: _"Tell me what's eating your time."_ They describe their pain point, and Remy explains exactly how ChefFlow handles it — creating the "aha moment."

## Why

- 80% of chefs interviewed have the same core problem: juggling too many tools
- Most are skeptical because other platforms burned them
- Need an instant proof-of-concept that ChefFlow solves _their specific problem_
- People also confuse "AI-powered" with "AI-generated" — need transparency about what ChefFlow actually is (hand-coded platform, optional AI assistant)

## Components Built

### 1. Feature Knowledge Base

**File:** `lib/ai/chefflow-feature-map.ts`

Structured mapping of 12 common chef pain points to ChefFlow features. Each entry has keywords for fuzzy matching, a solution description, and tier info. Used by both the system prompt and the UI fallback.

### 2. Landing Remy Personality

**File:** `lib/ai/remy-landing-personality.ts`

Platform-level system prompt for Remy on public pages. Includes:

- Concierge persona (not salesy, not generic)
- Pain-point-to-feature mapping embedded in the prompt
- Transparency instructions (explain app vs AI distinction)
- Topic guardrails and anti-injection rules
- Conversation limit (wraps up after 3-4 exchanges)

### 3. Landing API Route

**File:** `app/api/remy/landing/route.ts`

New unauthenticated SSE endpoint. Same pattern as `/api/remy/public` but:

- No `tenantId` required (platform-level, not chef-specific)
- Session message limit (10 per IP per 30min)
- Rate limit (5/min per IP)
- Uses `fast` model tier (qwen3:8b)

### 4. Remy Concierge Section (Landing Page)

**File:** `components/public/remy-concierge-section.tsx`

Inline chat section on the landing page between the workflow steps and the CTA. Features:

- Starter pill buttons for common pain points
- Inline chat that expands when user interacts
- "Try it free" CTA appears after 4+ messages
- **Static FAQ fallback** when Ollama is offline (uses feature map as accordion)

### 5. How It Works Transparency Section

**File:** `components/public/how-it-works-section.tsx`

Four-pillar section explaining:

- Hand-Built Platform (coded by a chef, not AI-generated)
- Your Own Database (real, encrypted, separate from AI)
- AI Assistant Optional (Remy helps, doesn't own)
- Private by Architecture (no cloud LLMs, no data mining)

Includes a simplified architecture diagram showing the data flow.

### 6. Floating Concierge Widget

**File:** `components/public/remy-concierge-widget.tsx`

Floating chat button for non-landing public pages (pricing, contact, etc.). Features:

- Hides on landing page (inline section handles that)
- Dismissable → collapses to small "Ask Remy" pill
- Remembers collapsed state per session (sessionStorage)
- Returns fresh on next visit

### 7. New User Welcome Flow

**File:** `lib/ai/remy-welcome.ts` + modified `components/ai/remy-drawer.tsx`

When a brand-new chef opens Remy for the first time (zero conversations):

- Injects a welcome message with specific action suggestions
- Shows quick-action starter buttons (Import clients, Log past event, Set up page, Tell about business)
- Fires once per device (localStorage flag)

## Files Modified

| File                            | Change                                           |
| ------------------------------- | ------------------------------------------------ |
| `app/(public)/page.tsx`         | Added RemyConciergeSection and HowItWorksSection |
| `app/(public)/layout.tsx`       | Added RemyConciergeWidget                        |
| `middleware.ts`                 | Added `/api/remy/landing` to skip-auth paths     |
| `components/ai/remy-drawer.tsx` | Added welcome message injection for new users    |

## Files Created

| File                                           | Purpose                            |
| ---------------------------------------------- | ---------------------------------- |
| `lib/ai/chefflow-feature-map.ts`               | Pain-point-to-feature mapping      |
| `lib/ai/remy-landing-personality.ts`           | Landing page Remy system prompt    |
| `lib/ai/remy-welcome.ts`                       | New-user welcome message constants |
| `app/api/remy/landing/route.ts`                | Unauthenticated SSE endpoint       |
| `components/public/remy-concierge-section.tsx` | Inline chat section                |
| `components/public/how-it-works-section.tsx`   | Transparency section               |
| `components/public/remy-concierge-widget.tsx`  | Floating widget                    |

## How to Test

1. **Landing page (unauthenticated):** Visit `/` → scroll to "Tell me what's eating your time" → type a pain point or click a starter → Remy responds with feature explanation
2. **Ollama offline fallback:** Stop Ollama → reload landing page → section falls back to static FAQ accordion
3. **Floating widget:** Visit `/pricing` or `/contact` → see floating "Ask Remy" button → click → chat works → dismiss → see small pill → click pill → reopens
4. **Widget hides on landing:** Visit `/` → floating widget should NOT appear (inline section is there instead)
5. **New user welcome:** Sign up as new chef → open Remy drawer → see welcome message with action buttons → clicking a button sends that message to Remy
6. **Rate limiting:** Send 6+ messages rapidly → should get rate limit message
7. **Session limit:** Send 10+ messages from landing page → should get "best way to see it is to try it" message

## Maintenance

When adding new features to ChefFlow, update `lib/ai/chefflow-feature-map.ts` with the new pain-point-to-feature mapping. The system prompt auto-generates from this data, so the landing Remy stays current.
