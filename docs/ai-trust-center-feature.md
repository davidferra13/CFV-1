# AI Trust Center & Remy Onboarding

**Date:** 2026-02-22
**Branch:** feature/risk-gap-closure
**Status:** Complete

---

## Problem

Users — especially new ones — are naturally skeptical about AI features. They worry about:

- Where their data goes
- Whether companies are using their data to train models
- Whether they can truly delete their data
- Whether AI is making decisions without their knowledge

ChefFlow's local AI (Ollama/Remy) is fundamentally different from cloud AI, but users don't know that. We need to **show them**, not just tell them.

## Solution

### 1. AI & Privacy Trust Center (`/settings/ai-privacy`)

A dedicated settings page that serves two purposes:

- **First visit:** Shows a 5-step onboarding wizard that teaches best practices before the user can enable Remy
- **Return visits:** Shows the Trust Center with full data controls, feature toggles, and the visual explainer

### 2. Visual Data Flow Schematic

An inline SVG/CSS diagram (no external images) that shows side-by-side:

- **Left (red):** How other AI apps work — data goes to their servers, shared with third parties
- **Right (green):** How ChefFlow works — everything stays on your device, no internet required

Also includes a "What Remy Can & Cannot Do" reference grid.

### 3. Onboarding Wizard (5 Steps)

Every chef sees this before they can use Remy:

1. **Meet Remy** — What it is, why it's local, why that matters
2. **Your Data, Your Device** — The visual schematic
3. **You're in Control** — Interactive practice: users practice deleting fake data to see how it works
4. **Best Practices** — 5 concrete practices for using AI safely
5. **Ready?** — Explicit opt-in with summary of everything learned

### 4. Data Controls

Post-onboarding, users can:

- Toggle individual features (Memory, Suggestions, Document Drafts)
- Delete conversations & messages
- Delete memories
- Delete artifacts & drafts
- Nuclear delete: wipe all AI data at once
- Turn off Remy completely (data preserved until explicitly deleted)

### 5. Remy Gate Component

A wrapper component (`<RemyGate>`) that can be placed around any Remy-powered UI. If the chef hasn't completed onboarding, shows a friendly prompt directing them to the Trust Center.

## Files Created

| File                                                            | Purpose                                                         |
| --------------------------------------------------------------- | --------------------------------------------------------------- |
| `supabase/migrations/20260322000046_ai_privacy_preferences.sql` | `ai_preferences` table with opt-in, onboarding, feature toggles |
| `lib/ai/privacy-actions.ts`                                     | Server actions: get/save prefs, get data summary, delete data   |
| `components/ai-privacy/data-flow-schematic.tsx`                 | Inline SVG diagram: local vs cloud data flow                    |
| `components/ai-privacy/remy-onboarding-wizard.tsx`              | 5-step interactive onboarding wizard                            |
| `components/ai-privacy/data-controls.tsx`                       | Feature toggles + data deletion controls                        |
| `components/ai-privacy/remy-gate.tsx`                           | Gate component for Remy entry points                            |
| `app/(chef)/settings/ai-privacy/page.tsx`                       | Trust Center settings page                                      |
| `docs/ai-trust-center-feature.md`                               | This document                                                   |

## Files Modified

| File                                   | Change                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `components/navigation/nav-config.tsx` | Added "AI & Privacy" settings shortcut                                                    |
| `app/(chef)/settings/page.tsx`         | Added "AI & Privacy" section with Trust Center link; moved Culinary Profile to AI section |

## Architecture Decisions

- **Remy is OFF by default** — new users must complete the onboarding wizard before AI activates
- **Onboarding is required, not optional** — the gate blocks access until completed
- **Data deletion is real deletion** — conversations cascade-delete messages; memories are hard-deleted, not soft-deleted when user explicitly requests
- **Every feature is individually toggleable** — memory, suggestions, and document drafts each have their own switch
- **The schematic is pure React/SVG** — no external assets, no CDN images, renders instantly

## Privacy Promise (displayed on the page)

- We will never send data to external AI services
- We will never use data to train any model
- We will never share information with third parties
- We will always run AI processing locally
- We will always let users delete any/all data instantly
- We will always respect the choice to opt out entirely

## How to Use the Remy Gate

To gate any Remy-powered component:

```tsx
import { RemyGate } from '@/components/ai-privacy/remy-gate'

export default function SomeRemyFeature() {
  return (
    <RemyGate>
      <YourRemyPoweredComponent />
    </RemyGate>
  )
}
```

If the chef hasn't completed onboarding or has Remy disabled, they'll see a friendly prompt instead of the component.
