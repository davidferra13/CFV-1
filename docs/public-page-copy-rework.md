# Public Page Copy Rework — 2026-02-24

## Problem

The landing page was too revealing. Sections about architecture, databases, encryption, AI internals, and "hand-built code" read like a developer explaining their tech stack to other developers — not a product selling to chefs. The copy also made a misleading claim that all code was "written by hand" when AI was used to build it.

## What Changed

### 1. "How It Actually Works" → "Why Chefs Switch to ChefFlow"

**Before:** Four pillars about architecture (Hand-Built Platform, Your Own Database, AI Assistant, Private by Architecture) plus an emoji architecture diagram showing Browser → App → Database → Remy.

**After:** Four pillars about value (Built by a Chef, Less Admin More Cooking, Know Your Numbers, Clients Notice the Difference). No tech internals. No architecture diagrams.

**File:** `components/public/how-it-works-section.tsx`

### 2. Homepage Copy Tightened

- **Feature cards:** More specific and benefit-focused (e.g., "Know your margins on every event" vs. "Send invoices and collect payments with Stripe-backed workflows")
- **Remy section:** Cut from 6 lines to 3. "Questions? Ask Remy." — no over-explanation of what Remy is
- **Closing CTA:** "Ready to run your business, not chase it." + trial info instead of vague "scale with confidence"
- **Removed:** `MessageCircle` icon import (no longer needed)

**File:** `app/(public)/page.tsx`

### 3. Pricing Page Fixes

- **Bug fix:** `bg-brand-9500` (non-existent class) → `bg-brand-500` on both CTA buttons
- **Removed:** Redundant "EVERYTHING YOU NEED" badge above "Everything You Need" title
- **Bottom CTA:** "Stop juggling. Start cooking." + clean trial info

**File:** `app/(public)/pricing/page.tsx`

### 4. Remy Personality — No More Oversharing

The landing Remy personality had a "TRANSPARENCY" section coaching Remy to explain Supabase, Ollama, hand-coded architecture, and local hardware to visitors. Replaced with a minimal "IF ASKED ABOUT THE TECH" section:

- Keep it simple: "ChefFlow is a real platform, data stays private"
- Explicit instruction to never mention database names, hosting providers, AI model names, or tech specs
- Removed "hand-built" language

**File:** `lib/ai/remy-landing-personality.ts`

## Philosophy

- Visitors care about what ChefFlow does for them, not how it's built
- Confidence > transparency when selling. Save the architecture for docs.
- No misleading claims about who wrote the code — just focus on who designed it and why it works
- Remy should sound like a chef, not a developer advocate
