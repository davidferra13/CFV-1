# Remotion Animations — Implementation Notes

**Date:** 2026-02-22
**Branch:** `feature/risk-gap-closure`

---

## What Changed

Added two Remotion-powered inline animations to ChefFlow:

### 1. Remy Data Flow Animation (privacy explainer)

**Purpose:** Replace the static SVG side-by-side diagram in the Remy onboarding wizard with an animated version. The privacy story is inherently about data _movement_ — animation communicates it better than static arrows.

**How it works:**

- Phase 1 (0–5s): "Other AI Apps" path — data leaves the user, flows to remote servers, leaks to third parties. Red theme. Elements appear in sequence with spring-based animations.
- Phase 2 (5.5–11s): "ChefFlow + Remy" path — data stays inside ChefFlow's boundary, Remy processes it locally. Green theme. Same staggered reveal.
- Loops every 12 seconds. No controls shown — plays automatically.

**Files:**

- `lib/remotion/data-flow-composition.tsx` — The Remotion composition (animation logic)
- `components/ai-privacy/data-flow-animated.tsx` — Player wrapper + Can/Cannot table
- `components/ai-privacy/data-flow-schematic.tsx` — Original static SVG (preserved, no longer imported)

**Used in 3 places:**

1. `components/ai-privacy/remy-onboarding-wizard.tsx` — Step 2
2. `app/(chef)/settings/ai-privacy/page.tsx` — Trust Center details panel
3. `components/ai/remy-hub-dashboard.tsx` — Hub details panel

### 2. Landing Page Product Explainer

**Purpose:** Replace the static 3-step checklist on the public landing page with an animated walkthrough showing the full ChefFlow workflow. Helps prospects understand the product in ~12 seconds.

**How it works:**

- 4 steps cycle with spring animations: Inquiry → Event → Quote → Payment
- Progress timeline at top shows which step is active (brand-colored nodes)
- Each step shows an icon, title, and one-line description
- Loops every 12 seconds. No controls — plays automatically.

**Files:**

- `lib/remotion/product-explainer-composition.tsx` — The Remotion composition
- `components/public/product-explainer-player.tsx` — Player wrapper
- `app/(public)/page.tsx` — Landing page (now imports the player)

---

## Dependencies Added

- `remotion` — Core Remotion framework (composition, interpolation, springs)
- `@remotion/player` — Embeddable React player component (no video file needed)

Both are client-side only. No server-side rendering or video file generation is used — compositions play inline via the `<Player>` component.

---

## Design Decisions

- **No controls bar** — both animations play and loop automatically. Adding play/pause/scrub controls would make them feel like embedded videos, which is the wrong UX. These are subtle visual aids, not media players.
- **No audio** — silent animations only.
- **Brand-consistent** — uses the same terracotta/stone palette, Inter font, and border-radius conventions as the rest of the app. Nothing should look "different" — it should feel like the same page but with motion.
- **Original SVG preserved** — `data-flow-schematic.tsx` is not deleted, just no longer imported. Easy to revert if needed.
- **Gimmick-free** — no confetti, no particle effects, no bouncing logos. Every animated element serves comprehension: arrows animate to show data flow direction, boxes appear in sequence to build a mental model, progress dots light up to show workflow stages.

---

## Future Considerations

- **Chef social media clip generator** — Remotion's server-side rendering (`renderMedia()`) could power a Pro feature where chefs auto-generate branded 15–30s video clips for Instagram/TikTok from their profile data. This is the highest-value Remotion use case but requires `@remotion/renderer` and a render pipeline.
- **OG images** — `renderStill()` could produce richer dynamic OG images with proper custom font support (DM Serif Display), but the current `ImageResponse` approach works fine.
