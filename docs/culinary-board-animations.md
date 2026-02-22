# Culinary Board — Word-Feel Animations

## What Changed

Every word on the Culinary Composition Board now has a click/tap animation that **feels like the word itself**. Tap "Crunchy" and it shatters. Tap "Silky" and it glides. Tap "Molten" and it melts downward.

## How It Works

### Architecture

1. **Animation mapping** (`lib/culinary-words/animations.ts`) — a hand-curated map of every word to one of 20 animation families. Unmapped words fall back to `explode` (satisfying generic pop).

2. **CSS keyframes** (bottom of `app/globals.css`) — 20 pure-CSS keyframe animations, all GPU-accelerated (`transform`, `opacity`, `filter` only). Each uses a `--base-rotate` CSS custom property so animations compose correctly with the board view's per-word rotation.

3. **Click handlers** in both `board-view.tsx` and `list-view.tsx` — on click/tap, adds the animation class, removes it on `animationend`. Prevents re-triggering while animating via a `Set` ref.

### The 20 Animation Families

| Animation | Feel                         | Example Words                          |
| --------- | ---------------------------- | -------------------------------------- |
| `shatter` | Rapid shake, cracking apart  | Crunchy, Crispy, Brittle, Snap         |
| `melt`    | Droop + blur downward        | Melting, Molten, Gooey, Sticky         |
| `bounce`  | Spring up and down           | Bouncy, Springy, Chewy, Al Dente       |
| `float`   | Drift gently upward          | Airy, Light, Fluffy, Foam              |
| `wobble`  | Jelly-like wiggle            | Gelatinous, Slimy, Gel, Spherification |
| `glide`   | Smooth slow sway             | Silky, Velvety, Creamy, Buttery        |
| `flame`   | Flicker like fire            | Hot, Fiery, Sear, Charred              |
| `freeze`  | Shiver then lock solid       | Frozen, Icy, Chilled, Cryo             |
| `explode` | Big pop outward              | Bold, Umami Bomb, Pungent (+ default)  |
| `drip`    | Slide downward like liquid   | Sauce, Jus, Drizzle, Reduction         |
| `sizzle`  | Rapid micro-vibration        | Zingy, Electric, Spicy, Acidic         |
| `puff`    | Expand + fade like smoke     | Smoky, Steaming, Aromatic, Fragrant    |
| `throb`   | Slow rhythmic pulse          | Rich, Fat, Meaty, Indulgent            |
| `swirl`   | Rotate like stirring a pot   | Sauté, Deglaze, Mount, Fold            |
| `squish`  | Compress then spring back    | Soft, Pillowy, Tender, Confit          |
| `crumble` | Shake + shrink away          | Crumbly, Flaky, Gritty, Sandy          |
| `stretch` | Pull horizontally like taffy | Stringy, Fibrous, Rubbery              |
| `slice`   | Sharp quick lateral cut      | Blanch, Render, Compressed, Shaved     |
| `sparkle` | Flash of golden brightness   | Golden, Vibrant, Caramelized, Toasted  |
| `bloom`   | Slow grow like a flower      | Floral, Herbaceous, Fresh, Microgreens |

### Performance

- All animations use only `transform`, `opacity`, and `filter` — the three properties that trigger GPU compositing (no layout or paint triggers)
- Animations are 0.4–1.0s duration, one-shot, no JavaScript animation frames
- Re-trigger prevention via `Set<string>` ref (no state re-renders)

### Files Changed

| File                                 | Change                                              |
| ------------------------------------ | --------------------------------------------------- |
| `lib/culinary-words/animations.ts`   | New — word-to-animation mapping + helpers           |
| `app/globals.css`                    | Added 20 keyframe animations + clickable word class |
| `components/culinary/board-view.tsx` | Added click handler + `--base-rotate` CSS var       |
| `components/culinary/list-view.tsx`  | Added click handler                                 |

### Adding Animations for New Words

When a chef adds a custom word, it will automatically get the `explode` animation (the default fallback). To give it a specific feel, add it to the `WORD_ANIMATION_MAP` in `lib/culinary-words/animations.ts`.
