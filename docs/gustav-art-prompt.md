# Gustav — Art Generation Prompt (Google Gemini)

## How to Use

1. Open Google Gemini with image generation
2. If you have Remy artwork, **upload a Remy image first** and say: "I want you to create a companion character in this exact same art style. Here's the brief:"
3. Paste the prompt below
4. For additional poses, use the follow-up prompts at the bottom

---

## The Prompt

```
Create a character illustration in a soft, hand-painted watercolor art style with gentle edges, warm tones, and no harsh outlines. Transparent background. The style should feel artisanal and storybook-like — as if painted on a recipe card.

THE CHARACTER — "GUSTAV"

Gustav is a small, round chef character — an upright egg-shaped or pear-shaped body with warm beige/cream skin. He is slightly taller and more upright than a typical round mascot character. He has PERFECT posture — this character stands straight, always.

KEY FEATURES (every one of these matters):

1. A NEAT HANDLEBAR MUSTACHE — dark espresso brown, well-groomed, not wild or bushy. This is his most important feature. It should be prominent and expressive.

2. A CRISP WHITE CHEF'S TOQUE (tall chef hat) — standing perfectly straight and starched. NOT floppy, NOT tilted, NOT oversized. This hat is precise and upright, like the character.

3. A DOUBLE-BREASTED WHITE CHEF'S COAT — all buttons done up. Immaculate. Clean. Professional.

4. A SMALL HEADSET over ONE EAR — like a mission control operator's headset. Metallic gray. Thin, modern, subtle — not bulky. This bridges his chef identity with his role as a systems operator.

5. A DEEP NAVY NECKERCHIEF — the classic French brigade tradition. This is the one pop of color on his otherwise white uniform.

6. SMALL, SHARP, FOCUSED EYES — not big round cartoon eyes. These are analytical, observant eyes. The eyes of someone who spots a plate two degrees off center from across the room.

7. STUBBY ARMS AND LITTLE FEET — similar proportions to a simple mascot character. Round mitten-like hands. Small nub feet.

COLOR PALETTE:
- Body/skin: warm beige/cream (NOT orange, NOT pink — warm but neutral)
- Chef coat and toque: crisp white with subtle gray shading for depth
- Mustache: dark espresso brown
- Neckerchief: deep navy blue
- Headset: metallic gray
- Eyes: dark brown, small

POSE: Standing composed with hands clasped behind his back, slight confident smirk beneath the mustache. He looks calm, in control, quietly proud. Like a chef surveying his kitchen before service — everything is in its right place.

STYLE NOTES:
- Watercolor texture throughout — visible brush strokes, soft color bleeds at edges
- NO harsh black outlines — shapes defined by color and shadow, not lines
- Transparent/no background
- Simple and readable — this character should be recognizable at 40x40 pixels
- Gender-neutral design — the mustache is a character feature, not a gender statement
- The overall feeling should be: competent, trustworthy, a little strict, but warm underneath
```

---

## Follow-Up Poses

Once you have the base character locked in, use these for additional poses:

### Inspecting (reviewing logs/status)

```
Same character, same style. Gustav is leaning forward slightly with one eye narrowed, examining something closely. One hand is raised near his chin. His expression is focused and analytical — like a chef inspecting a plate before it goes to the table. His mustache is slightly compressed in concentration.
```

### Approving ("Clean service")

```
Same character, same style. Gustav is giving a tiny, controlled nod. His mustache is curling slightly upward — the hint of a satisfied smile. His eyes are softened just slightly. Hands still behind his back. This is his version of high praise — understated but unmistakable. He's pleased.
```

### Disapproving ("Again.")

```
Same character, same style. Gustav has both eyebrows raised. His mustache is drooping downward. His arms are crossed over his chef coat. His expression says "I'm not angry, I'm disappointed" — the look of a chef who just watched someone skip mise en place. Flat, unimpressed, waiting for you to do it properly.
```

### Stroking Mustache (thinking/processing)

```
Same character, same style. Gustav has two fingers on his mustache, gently stroking it. His eyes are looking up and to the side — he's thinking, considering, processing. This is his contemplative pose. Calm and unhurried.
```

### Alert (pressing headset)

```
Same character, same style. Gustav has one hand pressing his headset firmly to his ear. His body is turned slightly to one side, as if responding to a signal. His eyes are sharp and alert — something needs attention. His mustache is slightly bristled. The posture says "I heard something. Stand by."
```

### Monitoring (watching the pass)

```
Same character, same style. Gustav is standing at ease — feet slightly apart, hands loosely at his sides or one hand resting on his hip. His eyes are scanning from left to right, surveying. This is his routine surveillance pose — calm, watchful, steady. Everything is running and he's keeping an eye on all of it.
```

### Rare Smile (end of a clean session)

```
Same character, same style. Gustav's eyes are genuinely softened — warmer than usual. A real, small smile is visible beneath his mustache. His hands are still behind his back (old habits), but his posture is slightly more relaxed than usual. This expression is RARE — it only appears after a perfect session. It should feel earned, not casual. The warmth is there precisely because he usually holds it back.
```

### 86'd (system down — stop)

```
Same character, same style. Gustav has a sharp, commanding look. One hand is raised in a firm stop gesture — palm out, fingers together. His expression is serious but not panicked. This is controlled urgency. Something is down and he's halting operations on that station until it's resolved. His mustache is perfectly still — he's locked in.
```

---

## Sprite Sheet Prompt

Once individual poses are approved, use this to create a unified sheet:

```
Create a character sprite sheet showing all of these poses of the same watercolor chef character in a grid layout. Each pose should be in its own cell, clearly separated, with a transparent background. Same consistent art style, proportions, and colors across all poses. The character should look identical in every cell — only the pose and expression change.

Poses (left to right, top to bottom):
1. Composed — standing straight, hands behind back, slight smirk
2. Inspecting — leaning forward, one eye narrowed
3. Approving — tiny nod, mustache curling up
4. Disapproving — eyebrows up, mustache drooping, arms crossed
5. Stroking mustache — two fingers on mustache, eyes up
6. Alert — hand pressing headset to ear
7. Monitoring — standing at ease, eyes scanning
8. Rare smile — eyes softened, genuine small smile
9. 86'd — hand up in stop gesture, serious look
```

---

## Tips for Best Results

- **Upload a Remy image as reference** for the art style — Gemini will match the watercolor texture and simplicity much better with a visual reference
- **Regenerate liberally** — the first attempt rarely nails the mustache-to-body proportions. The mustache should be prominent but not overwhelming
- **Watch the headset** — Gemini may make it too bulky or too invisible. It should be subtle but clearly present
- **The toque matters** — if it comes out floppy or tilted, regenerate. Gustav's hat is crisp and vertical. That's his personality in hat form
- **Check the eyes** — they should be small and focused, not big and round. Big round eyes = Remy. Small sharp eyes = Gustav
- **Navy neckerchief** — this is easy for Gemini to drop. If it's missing, mention it specifically in a follow-up
