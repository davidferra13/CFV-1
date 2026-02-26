# Remy Lip-Sync System

**Date:** 2026-02-26
**Status:** Complete (pending visual tuning of clip-path)

## Overview

Remy now animates his mouth in sync with his text responses. As streaming tokens arrive from Ollama, Remy's avatar swaps between 9 mouth shapes (visemes) that match the characters being "spoken."

## Architecture

### Layered Avatar (eyes never change)

The avatar uses a **two-layer compositing approach**:

1. **Base layer:** Resting face image (always visible) — provides consistent eyes, hat, body
2. **Mouth overlay:** Current viseme image, masked via CSS `clip-path` to reveal ONLY the mouth region

This ensures Remy's eyes stay perfectly consistent. The AI-generated images had different eye expressions per mouth shape — the clip-path approach ignores everything above the mouth.

### Viseme Engine (deterministic — no AI)

Maps text characters to 9 mouth shapes using a lookup table. No network calls, no LLM, no compute cost.

**The 9 visemes:**

| Viseme | Letters                            | Mouth Shape             | Image                 |
| ------ | ---------------------------------- | ----------------------- | --------------------- |
| rest   | M, B, P, spaces, punctuation       | Closed/relaxed          | `remy-mouth-rest.jpg` |
| ah     | A, I                               | Wide open               | `remy-mouth-ah.png`   |
| eh     | E, H                               | Slightly open           | `remy-mouth-eh.png`   |
| ee     | C, D, G, K, N, R, S, T, X, Y, Z, J | Wide smile, teeth       | `remy-mouth-ee.png`   |
| oh     | O                                  | Round O shape           | `remy-mouth-oh.png`   |
| ooh    | U, W, Q                            | Puckered                | `remy-mouth-ooh.png`  |
| fv     | F, V                               | Top teeth on bottom lip | `remy-mouth-fv.png`   |
| lth    | L, TH                              | Tongue behind teeth     | `remy-mouth-lth.png`  |
| chsh   | CH, SH                             | Lips pushed forward     | `remy-mouth-chsh.png` |

**Digraph detection:** TH, SH, CH are detected as 2-character pairs before falling through to single-letter lookup. Cross-token digraphs are handled (e.g., token "S" + token "HOULD" → detects "SH").

### Timing

- Each viseme frame displays for **80ms** (tunable via `VISEME_DURATION_MS`)
- Punctuation (`. , ! ? ; :`) triggers a **200ms rest pause** for natural rhythm
- Spaces get a brief **48ms rest** (mouth closes between words)
- A **150ms grace period** between token arrivals prevents premature return to resting

## Files

| File                                    | Purpose                                                 |
| --------------------------------------- | ------------------------------------------------------- |
| `lib/ai/remy-visemes.ts`                | Core viseme engine — mapping, digraph detection, timing |
| `lib/ai/use-remy-lip-sync.ts`           | React hook — manages frame queue, drives animation      |
| `components/ai/remy-talking-avatar.tsx` | Avatar component — layered base + clip-path overlay     |
| `public/images/remy/*.png`              | 9 mouth-shape images                                    |

## Integration Points

The lip-sync is wired into all 4 Remy chat surfaces:

| Component        | File                                          | How it works                                                      |
| ---------------- | --------------------------------------------- | ----------------------------------------------------------------- |
| Chef drawer      | `components/ai/remy-drawer.tsx`               | `feedText()` on each SSE token, avatar in header + streaming area |
| Client chat      | `components/ai/remy-client-chat.tsx`          | `feedText()` on each SSE token, avatar in header                  |
| Public widget    | `components/ai/remy-public-widget.tsx`        | `feedText()` on each SSE token, avatar in header                  |
| Concierge widget | `components/public/remy-concierge-widget.tsx` | `feedText()` on each SSE token, avatar in header + message list   |

### Hook lifecycle per message:

1. `reset()` — called when user sends a new message (clears queue)
2. `feedText(token)` — called for each SSE token as it arrives
3. `stopSpeaking()` — called when stream ends (lets queue drain, then rests)
4. `reset()` — called on errors or cancellation (immediate stop)

## Tuning

### Clip-path adjustment

The `MOUTH_CLIP_PATH` constant in `remy-talking-avatar.tsx` controls what portion of the overlay image is visible:

```
inset(58% 10% 0% 10%)
```

- `58%` = hide top 58% (everything above the mouth)
- `10%` = hide 10% from each side
- `0%` = show all the way to the bottom

If the mouth region doesn't align perfectly, adjust these percentages. You can use browser DevTools to experiment in real-time.

### Timing adjustment

In `remy-visemes.ts`:

- `VISEME_DURATION_MS` (default: 80) — how long each mouth shape displays
- `PAUSE_DURATION_MS` (default: 200) — how long the mouth rests at punctuation

In `use-remy-lip-sync.ts`:

- Grace period (default: 150ms) — how long to wait for more tokens before returning to rest

## Image Organization

All viseme images are in `public/images/remy/`:

```
public/images/remy/
├── remy-mouth-rest.jpg    (base — always visible)
├── remy-mouth-ah.png
├── remy-mouth-chsh.png
├── remy-mouth-ee.png
├── remy-mouth-eh.png
├── remy-mouth-fv.png
├── remy-mouth-lth.png
├── remy-mouth-oh.png
└── remy-mouth-ooh.png
```

The original Remy images (`RemyChatBot-original.*`, `remy-mascot.png`) remain in `public/images/` for the mascot button.
