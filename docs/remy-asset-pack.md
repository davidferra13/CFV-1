# Remy Asset Pack — Complete Inventory

> **Last updated:** 2026-02-27
>
> Every visual and audio asset for Remy, the ChefFlow AI concierge mascot.
> Use this document to plan the animation system and identify gaps.

---

## Table of Contents

1. [Character Description](#character-description)
2. [Asset Inventory — What We Have](#asset-inventory)
3. [Sprite Sheet (Active in Code)](#sprite-sheet)
4. [How Assets Are Used in Code](#code-usage)
5. [Asset Wishlist — What We Need](#asset-wishlist)
6. [Voice — Giving Remy a Voice](#voice)
7. [Animation System Planning Notes](#animation-planning)

---

## Character Description

Remy is a round, warm-toned chef character — a small potato/dumpling-shaped body with rosy cheeks, a big chef's hat (toque), stubby arms and legs, and an expressive face. Art style is hand-painted/watercolor with soft edges. Transparent PNG backgrounds throughout.

**Design constants:**

- Round body, terracotta/peach skin tone
- Oversized white toque (chef hat) — always present
- Rosy pink cheeks
- Brown dot eyes, small round nose
- No fingers — stubby rounded hands
- Small pink feet

---

## Asset Inventory

### Full-Body / Hero Images

| File              | Dimensions | Size   | Background  | Description                                                                                                           |
| ----------------- | ---------- | ------ | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| `remy-mascot.png` | 1024x1008  | 610 KB | Transparent | **Primary mascot** — happy face, holding heart flag in right hand. Used as the main idle image in `RemyMascotButton`. |
| `remy-idle.png`   | 2080x2048  | 2.4 MB | Black       | **Idle portrait** — close-up face, slight smile, looking forward. High-res source asset.                              |
| `remy-hat.png`    | 2080x2048  | 2.3 MB | Black       | **Hat only** — just the toque, no face/body. Used for minimized/sleeping state peek. High-res source asset.           |

### Emotion / Expression Portraits (Head Only)

These are all head-and-hat close-ups at high resolution (2080x2048) with black backgrounds. Source-quality assets for future sprite sheets.

| File                         | Dimensions | Size   | Expression                             | Unique Details                                          |
| ---------------------------- | ---------- | ------ | -------------------------------------- | ------------------------------------------------------- |
| `remy-eyes-closed.png`       | 2080x2048  | 2.5 MB | Eyes closed, neutral mouth             | Peaceful/calm — slight lip smile                        |
| `remy-happy-eyes-closed.png` | 2080x2048  | 2.4 MB | Eyes closed, happy smile               | Content/satisfied — visible lip curl                    |
| `remy-sleeping.png`          | 2080x2048  | 2.6 MB | Eyes closed, neutral, with blanket     | Sleeping with polka-dot blanket/cloth visible at bottom |
| `remy-happy-sleeping.png`    | 2080x2048  | 2.5 MB | Eyes closed, happy smile, with blanket | Same blanket as sleeping, but content smile             |
| `remy-reassurance.png`       | 2080x2048  | 2.4 MB | Eyes closed, flat mouth                | Stoic/calm reassurance — "it'll be fine" energy         |
| `remy-giddy-surprise.png`    | 2080x2048  | 3.5 MB | Star eyes, small "o" mouth             | Excited/amazed — gold stars in eyes, distinct look      |
| `remy-straight-face.png`     | 1040x1024  | 574 KB | Flat mouth, neutral eyes               | Deadpan/unimpressed — half-res compared to others       |

### Emotion Portraits (With Props)

| File                 | Dimensions | Size   | Expression                               | Props                                                  |
| -------------------- | ---------- | ------ | ---------------------------------------- | ------------------------------------------------------ |
| `remy-aha.png`       | 445x377    | 190 KB | Smiling, one finger up                   | Lightbulb above head — "eureka!" moment                |
| `remy-pondering.png` | 360x402    | 159 KB | Skeptical/thinking, chin resting on hand | Question mark above head — cropped from animation pack |

### Walk Cycle (5 frames)

Full-body walking animation. Remy walks to the right with a bouncy gait. All frames have **white/transparent backgrounds** and are cropped from the animation pack sheet.

| File              | Dimensions | Size   | Pose                                         |
| ----------------- | ---------- | ------ | -------------------------------------------- |
| `remy-walk-1.png` | 363x410    | 137 KB | Standing, left foot forward, arms at sides   |
| `remy-walk-2.png` | 416x411    | 168 KB | Mid-stride, right arm forward, left arm back |
| `remy-walk-3.png` | 416x414    | 181 KB | Full stride, legs apart, slight lean forward |
| `remy-walk-4.png` | 416x420    | 170 KB | Passing stride, opposite arm/leg forward     |
| `remy-walk-5.png` | 363x412    | 135 KB | Returning to standing, settling weight       |

**Note:** Frames are NOT uniform dimensions (363-416px wide, 410-420px tall). Would need padding/normalization for a sprite sheet.

### Whisk Cycle (4 frames)

Close-up cooking animation — Remy whisking batter in a bowl. Cropped from animation pack.

| File               | Dimensions | Size   | Pose                                             |
| ------------------ | ---------- | ------ | ------------------------------------------------ |
| `remy-whisk-1.png` | 366x396    | 158 KB | Holding bowl and whisk, looking at bowl          |
| `remy-whisk-2.png` | 353x404    | 160 KB | Whisking motion, looking up, steam/motion lines  |
| `remy-whisk-3.png` | 345x401    | 163 KB | Vigorous whisking, eyes scrunched, flour poof    |
| `remy-whisk-4.png` | 383x383    | 151 KB | Done whisking, holding whisk up, satisfied smile |

**Note:** Non-uniform dimensions. Need normalization for sprite sheet.

### Flag Wave Cycle (6 frames)

Just the flag-and-hand — Remy's hand waving a heart flag. No body/face. Extracted from the `remy-mascot.png` flag prop.

| File              | Dimensions | Size   | Pose                             |
| ----------------- | ---------- | ------ | -------------------------------- |
| `remy-flag-1.png` | 235x360    | 60 KB  | Flag up-left, wrist centered     |
| `remy-flag-2.png` | 278x332    | 68 KB  | Flag tilting right               |
| `remy-flag-3.png` | 317x382    | 87 KB  | Flag mid-wave, cloth billowing   |
| `remy-flag-4.png` | 305x346    | 85 KB  | Flag continuing right            |
| `remy-flag-5.png` | 388x384    | 97 KB  | Flag full right, cloth stretched |
| `remy-flag-6.png` | 417x440    | 118 KB | Flag returning left, big billow  |

**Note:** Very non-uniform dimensions (235-417px wide). These are the most irregularly sized sequence.

### Composite / Reference Sheets

| File                      | Dimensions | Size   | Description                                                                                                                                                                                                                                             |
| ------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `remy-animation-pack.png` | 2080x2048  | 2.7 MB | **Master reference sheet** — black background, 3 rows: (1) walk cycle 7 frames, (2) whisk sequence 4 frames, (3) giddy-surprise + aha + pondering expressions. Also includes pancake flip frames (not yet extracted). Labels in cursive below each row. |
| `remy-waving-6frames.png` | 2298x2185  | 644 KB | **Waving/flag sheet** — white background, 3x2 grid of flag wave frames. This is the source for the individual `remy-flag-*.png` files.                                                                                                                  |
| `_watermark_check.png`    | 2080x2048  | 1.6 MB | **Watermark test** — grayscale embossed version of giddy-surprise face. Used to verify no watermarks in purchased assets. Not a usable asset.                                                                                                           |

### Sprite Sheet (Active in Production)

| File              | Dimensions | Size   | Description                                                                                                                                                                                                                    |
| ----------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `remy-sprite.png` | 1040x1024  | 848 KB | **4x4 grid lip-sync + emotion sprite sheet.** 16 frames at 260x256 each. Contains all viseme mouth shapes (11) + emotion faces (4) + 1 empty cell. This is the ONLY asset actively used for animation in the current codebase. |

---

## Sprite Sheet

The active sprite sheet (`remy-sprite.png`) is a 4-column x 4-row grid:

```
Col:    0              1              2              3
Row 0:  REST (M,P,B)   AH (A,I)      EH (E)         EE (C,D,S,T,X,Y,Z)
Row 1:  OH (O)         OOH (U,W,Q)   FV (F,V)       LTH (L,TH)
Row 2:  CHSH (CH,SH)   RER (R,ER)    KGN (K,G,N)    HAPPY (smile)
Row 3:  SAD (frown)    ANGRY (teeth)  SURPRISED (o)  (empty)
```

- **Cell size:** 260px wide x 256px tall
- **Label strip:** ~40px at top of each cell (cropped via CSS offset)
- **Background:** White/transparent per cell
- **Total frames used:** 15 of 16 (bottom-right is empty)

---

## Code Usage

### Where each asset is referenced:

| Asset                       | Component           | How It's Used                                                          |
| --------------------------- | ------------------- | ---------------------------------------------------------------------- |
| `remy-sprite.png`           | `RemyTalkingAvatar` | CSS `background-image` + `background-position` for lip-sync & emotions |
| `remy-mascot.png`           | `RemyMascotButton`  | Full idle body image (Next.js `<Image>`)                               |
| `remy-mascot.png` (clipped) | `RemyMascotButton`  | Hat-only peek when minimized (CSS `object-position` + `clip-path`)     |

### Assets NOT currently used in code:

Everything else. The walk cycle, whisk cycle, flag wave, all the high-res emotion portraits, aha, pondering, sleeping variants, animation pack, waving sheet — none of these are wired into any component yet. They exist as raw assets waiting for the animation system.

---

## Asset Wishlist — What We Need

### Priority 1 — Essential (Remy feels incomplete without these)

| Asset                            | Why                                                                                       | Type                    | Notes                                                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Waving/greeting animation**    | First impression — Remy should wave hello when a user opens the app or chat               | 5-6 frame body sequence | The flag-wave frames show the hand motion but we need Remy's full body waving, not just the flag. The animation pack has walk frames but no wave. |
| **Thinking/loading animation**   | Currently `thinking` state just shows dot-dot-dot in a bubble. Remy should visually think | 2-3 frame loop          | Could use `remy-pondering.png` as base — needs a subtle head-tilt or chin-tap loop                                                                |
| **Typing indicator**             | When Remy is composing a response, something beyond the static pondering face             | 2-3 frame loop          | Could be a pencil-writing motion, or eyes darting back and forth                                                                                  |
| **Idle breathing / subtle loop** | Static `remy-mascot.png` looks lifeless. A subtle 2-frame breathe/bounce would feel alive | 2 frames                | Just a very slight body scale or hat wobble — tiny, loopable                                                                                      |
| **Error/confused expression**    | When something goes wrong (Ollama offline, API error). Currently no visual feedback       | Single frame            | Sweat drop, question marks, worried face — something that says "oops"                                                                             |
| **Celebration / success**        | When a task completes (event created, quote sent, etc.)                                   | 3-4 frame burst         | Confetti, jump, fist pump — a quick "yes!" moment                                                                                                 |

### Priority 2 — Delightful (Makes Remy feel like a real character)

| Asset                          | Why                                                                  | Type           | Notes                                                                            |
| ------------------------------ | -------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------- |
| **Pancake flip**               | The animation pack shows it (bottom row) but frames aren't extracted | 3-4 frames     | Already exists in `remy-animation-pack.png` — just needs extraction              |
| **Thumbs up**                  | Also visible in animation pack bottom-right — not extracted          | Single frame   | Quick approval gesture                                                           |
| **Nodding**                    | Agreement/confirmation during conversation                           | 2-3 frame loop | Subtle head bob                                                                  |
| **Head shake**                 | Gentle disagreement/no                                               | 2-3 frame loop | Slight left-right head motion                                                    |
| **Eye blink**                  | Natural idle animation — currently eyes never blink                  | 2-3 frames     | Open → half-closed → closed → open. Short cycle, play randomly every 3-5 seconds |
| **Listening pose**             | When the user is typing, Remy should look attentive                  | Single frame   | Head slightly tilted, maybe hand to ear or leaning forward                       |
| **Carrying a tray**            | Chef-themed — useful for "serving" results, recommendations          | Single frame   | Full body, holding a silver cloche/tray                                          |
| **Reading a recipe/clipboard** | When Remy is reviewing data (menu, event details)                    | Single frame   | Remy looking at a clipboard or recipe card                                       |

### Priority 3 — Seasonal / Fun (Long-term character building)

| Asset                        | Why                                                                  | Type               | Notes                                                   |
| ---------------------------- | -------------------------------------------------------------------- | ------------------ | ------------------------------------------------------- |
| **Holiday hat variants**     | Seasonal delight — Santa hat, party hat, witch hat, etc.             | Hat-only swaps     | Same body, just replace the toque for special occasions |
| **Night mode Remy**          | Dark mode variant — slightly dimmer, maybe nightcap instead of toque | Full variant       | For when dark mode ships                                |
| **Mini Remy**                | Tiny version for inline use (notification badges, toast icons)       | 16x16 / 24x24      | Simplified detail, just hat + face                      |
| **Remy with specific foods** | Holding signature dishes — pizza, cake, steak                        | Single frames each | Adds personality to different recipe/menu contexts      |
| **Dance / victory dance**    | Extended celebration for big milestones                              | 6-8 frame loop     | Over-the-top happy dance                                |
| **Wave goodbye**             | Session end / drawer close animation                                 | 3-4 frames         | Sad but sweet wave                                      |

### Production Gaps (Technical)

| Issue                                       | Impact                                                                                                                    | Fix                                                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Non-uniform frame sizes**                 | Walk (363-416px), whisk (345-383px), flag (235-417px) frames can't be used in sprite sheets without padding/normalization | Re-export from source at uniform canvas size, or pad programmatically |
| **Black backgrounds on high-res portraits** | 8 of the emotion portraits have solid black backgrounds instead of transparent                                            | Re-export with transparency, or mask in code (expensive)              |
| **No @2x / @1x variants**                   | High-res assets are 2080x2048, display assets are ~260x256. Nothing in between. No responsive image pipeline              | Generate @1x (260px) and @2x (520px) optimized variants for web       |
| **Missing retina sprite sheet**             | Current sprite at 1040x1024 is only 1x for 260px display cells                                                            | Generate @2x sprite (2080x2048) from the high-res source expressions  |
| **Animation pack has un-extracted frames**  | Pancake flip (3 frames) and thumbs-up are visible in `remy-animation-pack.png` but never extracted as individual PNGs     | Extract and add to inventory                                          |
| **`_watermark_check.png` is not an asset**  | 1.6 MB file that serves no purpose beyond the one-time check                                                              | Can be deleted or moved to a `_reference/` folder                     |

---

## Voice — Giving Remy a Voice

Remy currently communicates only through text. The goal is to give Remy a **distinctive, warm, human-sounding voice** — not a robot voice.

### Requirements

- **Warm and friendly** — like a favorite uncle who happens to be a chef
- **Slight character** — a touch of personality (gentle accent? slight rasp? warm baritone?) without being cartoonish
- **Not robotic** — no TTS artifacts, no uncanny valley, no "Siri voice"
- **Fast enough for streaming** — voice synthesis needs to keep up with Remy's text streaming (token by token)
- **Local/private** — consistent with ChefFlow's privacy-first architecture (no sending client conversation text to cloud TTS)

### Technology Options

#### Tier 1 — Local TTS (Privacy-First)

| Engine                  | Quality                               | Speed                   | Runs On        | Cost | Notes                                                                                                                       |
| ----------------------- | ------------------------------------- | ----------------------- | -------------- | ---- | --------------------------------------------------------------------------------------------------------------------------- |
| **Piper TTS**           | Good — natural prosody, many voices   | Real-time+              | CPU (PC or Pi) | Free | ONNX-based, ~50 high-quality voices. Can run on Pi for beta. Best local option. Pre-built voices include warm male options. |
| **Coqui TTS (XTTS v2)** | Excellent — near-human, voice cloning | ~Real-time with GPU     | GPU preferred  | Free | Can clone a voice from 6 seconds of audio. Heavier than Piper (~2GB model). Might need PC GPU.                              |
| **Bark (Suno)**         | Very good — expressive, laughs/sighs  | Slower than real-time   | GPU required   | Free | 5-10 sec per clip. Too slow for streaming. Good for pre-rendered clips (greetings, celebrations).                           |
| **StyleTTS 2**          | Excellent — state of the art local    | Near real-time with GPU | GPU required   | Free | Research-grade quality. Harder to set up but amazing results.                                                               |

#### Tier 2 — Cloud TTS (Higher Quality, Privacy Trade-off)

| Service              | Quality                                      | Latency           | Cost          | Notes                                                                                  |
| -------------------- | -------------------------------------------- | ----------------- | ------------- | -------------------------------------------------------------------------------------- |
| **ElevenLabs**       | Best-in-class — indistinguishable from human | ~200ms first byte | $5-22/mo      | Voice cloning, streaming API. Privacy concern: conversation text leaves local machine. |
| **PlayHT 2.0**       | Excellent                                    | ~300ms            | $9-49/mo      | Good streaming support, voice cloning.                                                 |
| **OpenAI TTS**       | Very good                                    | Fast              | Per-token     | "Fable" and "Onyx" voices are warm. Same privacy concern.                              |
| **Azure Neural TTS** | Very good                                    | Fast              | Per-character | "Guy" and "Davis" are warm male voices. Enterprise-grade.                              |

#### Recommended Architecture

```
Streaming text from Ollama
    |
    v
Text chunked into sentences
    |
    v
Piper TTS (local, CPU, free)     <-- Primary: privacy-safe
    |                                 Fallback: pre-rendered clips for common phrases
    v
Web Audio API playback
    |
    v
Sync with lip-sync viseme system  <-- Already built! Just needs audio trigger timing
```

**Why Piper first:** It's free, local (privacy-safe), fast enough for real-time, and has genuinely good voices. Start here. If the quality isn't satisfying enough, XTTS v2 is the upgrade path (also local, but needs GPU). Cloud TTS (ElevenLabs) is the nuclear option — best quality but breaks the local-only privacy rule.

### Voice + Lip-Sync Integration

The lip-sync viseme system is **already built** (`remy-visemes.ts`, `useRemyLipSync` hook). Currently it derives visemes from text characters. With actual audio:

1. **Option A (simpler):** Keep text-based viseme timing, play audio alongside. Sync is approximate but "good enough" — the text already determines mouth shapes, audio just adds sound.
2. **Option B (better):** Use Piper's phoneme output to drive visemes directly. Piper can output phoneme timing data, which maps perfectly to the existing viseme system. True lip-sync.

### Pre-Rendered Voice Clips (Quick Win)

Even before building full TTS, Remy could have **pre-recorded audio clips** for common interactions:

- "Hey there! How can I help?" (greeting)
- "Let me look into that..." (thinking)
- "All done!" (success)
- "Hmm, something went wrong." (error)
- "See you later!" (goodbye)

These could be recorded by a voice actor or generated once with a high-quality TTS and baked into static `.mp3` files. Zero latency, maximum quality, no privacy concern.

---

## Animation Planning Notes

### Current Animation Capabilities

The codebase already supports:

- **Lip-sync sprite animation** — 11 viseme mouth shapes + 4 emotion faces, driven by text streaming
- **State transitions** — idle, thinking (dots bubble), sleeping (hat peek), speaking (avatar overlay)
- **Emotion detection** — keyword-based, sets resting face expression

### What the Animation System Needs

1. **Sprite sheet compiler** — Take individual frame PNGs, normalize dimensions, pad to uniform canvas, output a single sheet with a JSON manifest (frame positions, timing, loop behavior)
2. **Animation player component** — Reads sprite sheets + manifests, plays frame sequences with configurable: FPS, loop/once, easing, transition between animations
3. **Animation state machine** — Defines which animations play in which states, transitions between them, priority (e.g., "celebration" overrides "idle"), interruption rules
4. **Trigger system** — Maps app events to animations: `onDrawerOpen → wave`, `onResponseStart → thinking`, `onResponseEnd → idle`, `onError → confused`, `onEventCreated → celebrate`

### Proposed Animation States

```
                    ┌──────────┐
          ┌────────>│  IDLE    │<────────┐
          │         │ (breathe)│         │
          │         └────┬─────┘         │
          │              │               │
     onTimeout      onDrawerOpen    onResponseEnd
          │              │               │
          │              v               │
          │         ┌──────────┐         │
          │         │  WAVE    │         │
          │         │ (greet)  │         │
          │         └────┬─────┘         │
          │              │               │
          │         onWaveEnd            │
          │              │               │
          │              v               │
          │         ┌──────────┐         │
          │         │ LISTENING│─────────┤
          │         │ (attentive)        │
          │         └────┬─────┘         │
          │              │               │
          │         onResponseStart      │
          │              │               │
          │              v               │
          │         ┌──────────┐         │
          │         │ THINKING │         │
          │         │ (ponder) │         │
          │         └────┬─────┘         │
          │              │               │
          │         onFirstToken         │
          │              │               │
          │              v               │
          │         ┌──────────┐         │
          │         │ SPEAKING │─────────┘
          │         │ (lip-sync)
          │         └────┬─────┘
          │              │
          │         onSpecialEvent
          │              │
          │              v
          │         ┌──────────┐
          └─────────│ CELEBRATE│
                    │ or ERROR │
                    └──────────┘
```

### File Size Budget

Current total: ~28.5 MB of raw PNGs (mostly high-res sources). For production:

| Target                    | Max Size    | Approach                                      |
| ------------------------- | ----------- | --------------------------------------------- |
| Lip-sync sprite (current) | 848 KB      | Already optimized                             |
| Emotion sprite sheet      | ~500 KB     | Compile from high-res portraits, export at 1x |
| Walk cycle sprite         | ~200 KB     | 5 frames, normalized to ~416x420              |
| Whisk cycle sprite        | ~200 KB     | 4 frames, normalized to ~383x404              |
| Flag wave sprite          | ~150 KB     | 6 frames, normalized to ~417x440              |
| **Total new sprites**     | **~1.9 MB** | Acceptable for lazy-loaded assets             |

High-res source PNGs (2080x2048) stay in the repo for future re-exports but should NOT be served to browsers.

---

## File Reference

```
public/images/remy/
├── remy-sprite.png           # ACTIVE — lip-sync + emotion sprite sheet (1040x1024)
├── remy-mascot.png           # ACTIVE — idle body with heart flag (1024x1008)
├── remy-idle.png             # SOURCE — high-res idle portrait (2080x2048)
├── remy-hat.png              # SOURCE — high-res hat only (2080x2048)
├── remy-eyes-closed.png      # SOURCE — calm, eyes closed (2080x2048)
├── remy-happy-eyes-closed.png # SOURCE — content smile, eyes closed (2080x2048)
├── remy-sleeping.png         # SOURCE — sleeping with blanket (2080x2048)
├── remy-happy-sleeping.png   # SOURCE — happy sleeping with blanket (2080x2048)
├── remy-reassurance.png      # SOURCE — stoic calm (2080x2048)
├── remy-giddy-surprise.png   # SOURCE — star eyes, amazed (2080x2048)
├── remy-straight-face.png    # SOURCE — deadpan neutral (1040x1024)
├── remy-aha.png              # EXTRACTED — lightbulb moment (445x377)
├── remy-pondering.png        # EXTRACTED — thinking with ? (360x402)
├── remy-walk-[1-5].png       # EXTRACTED — 5-frame walk cycle (~363-416px)
├── remy-whisk-[1-4].png      # EXTRACTED — 4-frame whisk cycle (~345-383px)
├── remy-flag-[1-6].png       # EXTRACTED — 6-frame flag wave (~235-417px)
├── remy-animation-pack.png   # REFERENCE — master sheet with all animations (2080x2048)
├── remy-waving-6frames.png   # REFERENCE — flag wave source sheet (2298x2185)
└── _watermark_check.png      # TEST — grayscale watermark verification (2080x2048)
```
