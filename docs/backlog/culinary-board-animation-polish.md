# Culinary Board — Animation Polish & Expansion

## Context

The Culinary Composition Board now has 20 animation families mapped to 273 words. Each word animates to _feel_ like itself when clicked/tapped (e.g. "Crunchy" shatters, "Molten" melts, "Silky" glides). This works on both Board and List views, mobile and desktop.

The current implementation is solid but there's room to make it even more delightful.

## What Could Be Done

### Polish Existing Animations

- **Tune timing curves** — some animations could feel better with different easing/duration after real-world testing on mobile
- **Test every single word** — click through all 273 words and verify the animation _feels_ right for that specific word. Some mappings may need to move between families
- **Haptic feedback on mobile** — add `navigator.vibrate()` on tap for certain animation types (shatter = short burst, throb = double pulse, sizzle = rapid pattern)

### New Animation Ideas

- **Sound effects** — optional subtle audio on click (a crunch sound for shatter, a sizzle for sizzle, a drip for drip). Would need a mute toggle and should be opt-in
- **Particle effects** — canvas-based particles for shatter (fragments fly out), puff (smoke wisps), bloom (petals), sparkle (light dots). Lightweight, GPU-composited
- **Chain reactions** — clicking a Tier 1 word triggers subtle ripple animations on nearby words
- **Combo mode** — clicking multiple words in sequence builds a "dish description" at the bottom of the board with all selected words

### New Animation Families to Consider

- **`spin`** — full 360 rotation (for words like "Whimsical" currently in float)
- **`ripple`** — concentric ring expanding outward (for water/liquid words)
- **`crackle`** — combination of shatter + sparkle (for "Caramelized", "Brûléed")

### User-Added Word Animations

- Currently user-added words fall back to `explode`. Could add a UI where users pick from the 20 animation families when adding their word
- Or auto-detect: use the word's category to assign a default animation family

## Priority

LOW — the feature works great as-is. This is pure delight polish.

## Estimated Effort

Medium (1-2 sessions) for tuning + haptics. Heavy (multi-session) if adding sound/particles.

## Files to Modify

| File                                      | What                                |
| ----------------------------------------- | ----------------------------------- |
| `lib/culinary-words/animations.ts`        | Re-map words, add new families      |
| `app/globals.css`                         | Tune keyframes, add new ones        |
| `components/culinary/board-view.tsx`      | Haptics, particles, chain reactions |
| `components/culinary/list-view.tsx`       | Same click enhancements             |
| `components/culinary/add-word-dialog.tsx` | Animation picker for user words     |
