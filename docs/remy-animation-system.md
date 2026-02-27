# Remy Animation System — Full Design Document

> **Last updated:** 2026-02-27
>
> Complete technical blueprint for Remy's animation system, voice integration, and lip-sync architecture.
> Companion to: `docs/remy-asset-pack.md` (asset inventory)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture — Three Animation Layers](#architecture)
3. [Layer 1: Body State Machine](#layer-1-body)
4. [Layer 2: Mouth / Lip-Sync](#layer-2-mouth)
5. [Layer 3: Eyes & Expression](#layer-3-eyes)
6. [Sprite Sheet Strategy](#sprite-sheets)
7. [Voice — ElevenLabs Integration](#voice)
8. [Audio-Visual Sync Pipeline](#audio-visual-sync)
9. [Animation Triggers & App Events](#triggers)
10. [Performance & Loading Strategy](#performance)
11. [File Structure](#file-structure)
12. [Implementation Phases](#phases)
13. [Complete Asset Requirements](#asset-requirements)

---

## System Overview

Remy's animation system uses a **three-layer architecture** inspired by how professional game engines (Unity, Unreal) handle character animation. Each layer runs independently and can be driven by different inputs:

```
┌─────────────────────────────────────────────┐
│              REMY ANIMATION SYSTEM          │
│                                             │
│  ┌─────────────┐  ┌──────────┐  ┌────────┐ │
│  │  LAYER 1    │  │ LAYER 2  │  │LAYER 3 │ │
│  │  Body State │  │  Mouth   │  │  Eyes  │ │
│  │  (poses,    │  │  (viseme │  │  (blink │ │
│  │   movement) │  │  lip-sync│  │  emotion│ │
│  │             │  │         )│  │       ) │ │
│  └──────┬──────┘  └────┬─────┘  └───┬────┘ │
│         │              │            │       │
│         v              v            v       │
│  ┌─────────────────────────────────────────┐│
│  │        SPRITE RENDERER                  ││
│  │  Composites all layers into final frame ││
│  └─────────────────────────────────────────┘│
│         │                                   │
│         v                                   │
│  ┌─────────────────────────────────────────┐│
│  │        DISPLAY                          ││
│  │  RemyMascotButton / RemyTalkingAvatar   ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

**Why three layers?** This is how Duolingo animates Duo and its world characters. The mouth runs on its own timeline (driven by audio/text), the body runs on its own timeline (driven by app state), and eyes/expression add life on top. They never interfere with each other.

---

## Architecture

### State Machine Approach: `useReducer` (not XState)

The state machine is simple enough that `useReducer` is the right choice. Two independent reducers — one for body, one for mouth. Eyes are CSS-only with random timing.

If the system grows past 10+ body states with complex guard conditions, migrate to XState. Until then, `useReducer` is idiomatic and zero-dependency.

### Rendering Approach: CSS `background-position` + `steps()`

- **Looping animations** (idle breathe, walk, sleep Zzz): CSS `@keyframes` with `steps(N)` — runs on the browser's compositor thread, zero JS per frame
- **Dynamic lip-sync**: JS sets `background-position` via `requestAnimationFrame` synced to audio timing
- **Transitions between body states**: CSS `opacity` crossfade (300ms) — GPU-composited via `will-change: opacity`

This matches our existing approach in `remy-talking-avatar.tsx` and scales naturally.

---

## Layer 1: Body State Machine {#layer-1-body}

### States

| State         | Sprite Sheet           | Frames | FPS | Loop?    | Description                                                               |
| ------------- | ---------------------- | ------ | --- | -------- | ------------------------------------------------------------------------- |
| `idle`        | `remy-idle-sheet`      | 4-6    | 4   | Yes      | Subtle breathing — slight body scale + hat wobble. Always returns here.   |
| `entrance`    | `remy-walk-sheet`      | 5      | 12  | No       | Remy walks in from the left on first visit / app open                     |
| `wave`        | `remy-wave-sheet`      | 6      | 12  | No       | Greeting wave when drawer opens (plays once, returns to idle)             |
| `thinking`    | `remy-think-sheet`     | 3      | 6   | Yes      | Pondering — chin tap, looking up. Plays while waiting for Ollama response |
| `speaking`    | (no body anim)         | —      | —   | —        | Body stays in current idle frame. Mouth layer takes over                  |
| `whisking`    | `remy-whisk-sheet`     | 4      | 10  | Yes      | Cooking action — plays during loading/processing states                   |
| `celebrating` | `remy-celebrate-sheet` | 8      | 16  | No       | Jump + confetti burst. Plays on success events (once)                     |
| `sleeping`    | `remy-sleep-sheet`     | 4      | 2   | Yes      | Zzz animation. Transitions to after 60s idle with no interaction          |
| `error`       | `remy-error-sheet`     | 2      | 4   | Yes (3x) | Worried face, sweat drop. Plays 3 times then returns to idle              |
| `nudge`       | (reuse idle)           | 2      | 8   | No       | Quick bounce to get attention. Plays when Remy has a suggestion           |
| `exit`        | `remy-walk-sheet`      | 5      | 12  | No       | Remy walks out to the right. Reverse of entrance                          |

### State Transitions

```
                         ┌─────────────┐
              ┌─────────>│    IDLE     │<──────────────┐
              │          │  (breathe)  │               │
              │          └──┬───┬───┬──┘               │
              │             │   │   │                  │
          onTimeout(60s) onOpen onToken          onAnimEnd
              │             │   │   │                  │
              v             v   │   v                  │
     ┌──────────┐   ┌────────┐ │ ┌──────────┐   ┌──────────┐
     │ SLEEPING │   │  WAVE  │ │ │  NUDGE   │   │CELEBRATE │
     │  (zzz)   │   │(greet) │ │ │ (bounce) │   │ (jump!)  │
     └────┬─────┘   └───┬────┘ │ └──────────┘   └──────────┘
          │              │      │                      ^
      onInteract    onWaveEnd   │                      │
          │              │      │                 onSuccess
          v              v      │                      │
     ┌──────────┐  ┌──────────┐ │              ┌──────────┐
     │   IDLE   │  │LISTENING │ │              │ SPEAKING │──┐
     └──────────┘  │(attentive│ │              └──────────┘  │
                   └────┬─────┘ │                   ^        │
                        │       │                   │        │
                   onResponse   │              onFirstToken  │
                        │       │                   │        │
                        v       v                   │        │
                   ┌──────────────┐                 │        │
                   │   THINKING   │─────────────────┘        │
                   │  (pondering) │                           │
                   └──────────────┘                           │
                                                              │
                        ┌──────────┐                          │
                        │  ERROR   │<─────── onError ─────────┘
                        │(worried) │
                        └──────────┘
```

### Priority (highest to lowest)

1. `error` — always shows immediately
2. `celebrating` — overrides speaking (mouth can still run underneath)
3. `speaking` — active conversation
4. `thinking` — waiting for response
5. `whisking` — processing action
6. `wave` — greeting
7. `nudge` — attention grab
8. `entrance` / `exit` — one-time transitions
9. `idle` — default
10. `sleeping` — lowest priority, any interaction wakes

### Reducer

```typescript
type BodyState =
  | 'idle'
  | 'entrance'
  | 'wave'
  | 'thinking'
  | 'speaking'
  | 'whisking'
  | 'celebrating'
  | 'sleeping'
  | 'error'
  | 'nudge'
  | 'exit'

type BodyEvent =
  | { type: 'DRAWER_OPENED' }
  | { type: 'DRAWER_CLOSED' }
  | { type: 'RESPONSE_STARTED' }
  | { type: 'FIRST_TOKEN' }
  | { type: 'RESPONSE_ENDED' }
  | { type: 'SUCCESS'; reason: string }
  | { type: 'ERROR'; message: string }
  | { type: 'NUDGE' }
  | { type: 'IDLE_TIMEOUT' }
  | { type: 'INTERACT' }
  | { type: 'ANIM_COMPLETE' }

function bodyReducer(state: BodyState, event: BodyEvent): BodyState {
  // Error overrides everything
  if (event.type === 'ERROR') return 'error'
  // Celebration overrides everything except error
  if (event.type === 'SUCCESS') return 'celebrating'

  switch (state) {
    case 'idle':
      if (event.type === 'DRAWER_OPENED') return 'wave'
      if (event.type === 'RESPONSE_STARTED') return 'thinking'
      if (event.type === 'NUDGE') return 'nudge'
      if (event.type === 'IDLE_TIMEOUT') return 'sleeping'
      return state

    case 'sleeping':
      if (event.type === 'INTERACT') return 'idle'
      if (event.type === 'DRAWER_OPENED') return 'wave'
      return state

    case 'wave':
      if (event.type === 'ANIM_COMPLETE') return 'idle'
      return state

    case 'thinking':
      if (event.type === 'FIRST_TOKEN') return 'speaking'
      return state

    case 'speaking':
      if (event.type === 'RESPONSE_ENDED') return 'idle'
      return state

    case 'celebrating':
      if (event.type === 'ANIM_COMPLETE') return 'idle'
      return state

    case 'error':
      if (event.type === 'ANIM_COMPLETE') return 'idle'
      return state

    case 'nudge':
      if (event.type === 'ANIM_COMPLETE') return 'idle'
      return state

    default:
      return state
  }
}
```

---

## Layer 2: Mouth / Lip-Sync {#layer-2-mouth}

### Current System (Already Built)

The mouth layer is **already fully implemented**:

- 12 viseme mouth shapes + 4 emotion faces in `remy-sprite.png`
- `textToVisemes()` converts streaming text tokens to viseme sequences
- `useRemyLipSync()` hook manages frame queue and timing
- `RemyTalkingAvatar` renders the correct sprite frame

### Upgrade Path: Audio-Synced Lip-Sync

When voice is enabled (ElevenLabs), the mouth layer switches from text-driven to audio-driven timing:

| Mode                           | Driver                    | Timing Source                               | Quality                     |
| ------------------------------ | ------------------------- | ------------------------------------------- | --------------------------- |
| **Text-only** (current)        | `textToVisemes()`         | Character-to-viseme mapping, 80ms per frame | Good — deterministic, free  |
| **Audio-synced** (future)      | ElevenLabs alignment data | Per-character timestamps from TTS           | Excellent — precise sync    |
| **Real-time audio** (optional) | Web Audio AnalyserNode    | FFT frequency analysis                      | Good — works with any audio |

The viseme set stays the same (12 shapes). Only the timing source changes.

### Viseme Frame Map (unchanged)

```
rest  → (0,0)   M, P, B — closed mouth
ah    → (1,0)   A, I — wide open
eh    → (2,0)   E — mid open
ee    → (3,0)   C, D, S, T, X, Y, Z — tight teeth
oh    → (0,1)   O — round open
ooh   → (1,1)   U, W, Q — puckered
fv    → (2,1)   F, V — bottom lip bite
lth   → (3,1)   L, TH — tongue
chsh  → (0,2)   CH, SH — forward flare
rer   → (1,2)   R, ER — tight ER
kgn   → (2,2)   K, G, N — relaxed open
gasp  → (2,3)   Surprise — small vertical mouth
```

---

## Layer 3: Eyes & Expression {#layer-3-eyes}

### Eye States

| State    | Description                      | Trigger                    |
| -------- | -------------------------------- | -------------------------- |
| `open`   | Default — both eyes open         | Default                    |
| `half`   | Half-closed — droopy/sleepy      | Transition frame for blink |
| `closed` | Fully closed                     | Blink, sleeping, content   |
| `wide`   | Surprised — eyes open extra wide | Error, celebration         |
| `star`   | Star-eyed — giddy amazement      | Big success, rare delight  |

### Auto-Blink System

```typescript
// Random blink every 3-7 seconds
function useAutoBlink() {
  const [eyeState, setEyeState] = useState<'open' | 'half' | 'closed'>('open')

  useEffect(() => {
    function scheduleBlink() {
      const delay = 3000 + Math.random() * 4000 // 3-7 seconds
      return setTimeout(() => {
        // Blink sequence: open → half (50ms) → closed (80ms) → half (50ms) → open
        setEyeState('half')
        setTimeout(() => setEyeState('closed'), 50)
        setTimeout(() => setEyeState('half'), 130)
        setTimeout(() => {
          setEyeState('open')
          scheduleBlink() // Schedule next blink
        }, 180)
      }, delay)
    }
    const timer = scheduleBlink()
    return () => clearTimeout(timer)
  }, [])

  return eyeState
}
```

### Emotion Expression Map

| Emotion     | Eyes              | Eyebrows    | Mouth Override                    | When                        |
| ----------- | ----------------- | ----------- | --------------------------------- | --------------------------- |
| `neutral`   | open, normal      | resting     | none                              | Default                     |
| `happy`     | slightly squinted | raised      | smile (sprite row 2, col 3)       | Positive response, greeting |
| `sad`       | droopy            | lowered     | frown (sprite row 3, col 0)       | Apologetic response         |
| `angry`     | narrowed          | furrowed    | teeth frown (sprite row 3, col 1) | Error, frustration          |
| `surprised` | wide              | raised high | gasp (sprite row 3, col 2)        | Unexpected input            |
| `thinking`  | looking up-left   | one raised  | flat                              | Processing                  |
| `listening` | focused, steady   | neutral     | slight smile                      | User typing                 |

**Implementation:** Emotions are driven by `detectEmotion()` (existing keyword-based function in `remy-emotion.ts`). This is formula-based, not AI — per ChefFlow's "Formula > AI" rule.

---

## Sprite Sheet Strategy {#sprite-sheets}

### Production Sprite Sheets (to build)

| Sheet Name                | Frames | Grid | Cell Size | Est. File Size  | Content                                   |
| ------------------------- | ------ | ---- | --------- | --------------- | ----------------------------------------- |
| `remy-sprite.png`         | 16     | 4x4  | 260x256   | 848 KB (exists) | Lip-sync visemes + emotions               |
| `remy-body-idle.png`      | 6      | 3x2  | 420x420   | ~300 KB         | Breathing loop: slight scale + hat wobble |
| `remy-body-walk.png`      | 8      | 4x2  | 420x420   | ~400 KB         | Walk cycle (padded to uniform size)       |
| `remy-body-whisk.png`     | 4      | 2x2  | 420x420   | ~250 KB         | Whisking animation                        |
| `remy-body-wave.png`      | 6      | 3x2  | 420x420   | ~350 KB         | Greeting wave (TO BE CREATED)             |
| `remy-body-celebrate.png` | 8      | 4x2  | 420x420   | ~500 KB         | Jump + confetti (TO BE CREATED)           |
| `remy-body-sleep.png`     | 4      | 2x2  | 420x420   | ~200 KB         | Sleeping Zzz                              |
| `remy-body-think.png`     | 3      | 3x1  | 420x420   | ~200 KB         | Pondering chin-tap                        |
| `remy-body-error.png`     | 2      | 2x1  | 420x420   | ~150 KB         | Worried + sweat drop (TO BE CREATED)      |
| `remy-eyes.png`           | 6      | 6x1  | 260x160   | ~100 KB         | Eye states overlay (TO BE CREATED)        |
| `remy-flag.png`           | 6      | 3x2  | 440x440   | ~200 KB         | Flag wave (padded from existing)          |
| **Total**                 |        |      |           | **~3.5 KB**     |                                           |

**Decoded memory budget:** ~3.5 MB compressed, ~25 MB decoded (RGBA). Well under the 50 MB desktop / 20 MB mobile limits.

### Format: WebP with PNG Fallback

WebP lossless is 60% smaller than PNG with near-universal browser support (97%+). Serve WebP with PNG fallback:

```typescript
const supportsWebP =
  typeof document !== 'undefined' &&
  document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp')

export const SPRITE_EXT = supportsWebP ? 'webp' : 'png'
export function spritePath(name: string) {
  return `/images/remy/${name}.${SPRITE_EXT}`
}
```

### Manifest Format

Each sprite sheet has a companion JSON manifest:

```typescript
interface SpriteManifest {
  name: string
  path: string
  cols: number
  rows: number
  cellWidth: number
  cellHeight: number
  frameCount: number
  fps: number
  loop: boolean
  labelOffset?: number // pixels to crop from top (for label text)
  frames?: {
    // optional per-frame metadata
    [index: number]: {
      name: string
      duration?: number // override ms for this frame
    }
  }
}
```

---

## Voice — ElevenLabs Integration {#voice}

### Account Status

- **Plan:** Starter ($5/mo)
- **Quota:** 90,000 characters/month (~90 minutes of speech)
- **Voice slots:** 10 available (0 used)
- **Instant voice cloning:** Enabled
- **API key:** Stored in `.env.local` as `ELEVENLABS_API_KEY`

### Recommended Voice: Eric

**Voice ID:** `cjVigY5qzO86Huf0OWal`

ElevenLabs describes Eric as "a smooth tenor pitch — perfect for agentic use cases." Warm, trustworthy, professional without being stiff. A strong candidate for Remy's voice, though we should also audition gender-neutral and androgynous voices — Remy is gender-neutral and the voice should reflect that.

**Also consider:** River (`SAz9YHcvj6GT2YYXdXww`) — a relaxed, neutral voice described as "gender-neutral." Could be the best match for Remy's character.

**Runner-up:** George (`JBFqnCBsd6RMkjVDRZzb`) — British accent, warm resonance. Adds European chef energy if we want more character.

**Preview URLs (listen before choosing):**

- Eric: `https://storage.googleapis.com/eleven-public-prod/premade/voices/cjVigY5qzO86Huf0OWal/d098fda0-6456-4030-b3d8-63aa048c9070.mp3`
- George: `https://storage.googleapis.com/eleven-public-prod/premade/voices/JBFqnCBsd6RMkjVDRZzb/e6206d1a-0721-4787-aafb-06a6e705cac5.mp3`
- Chris: `https://storage.googleapis.com/eleven-public-prod/premade/voices/iP95p4xoKVk53GoZ742B/3f4bde72-cc48-40dd-829f-57fbf906f4d7.mp3`
- Will: `https://storage.googleapis.com/eleven-public-prod/premade/voices/bIHbv24MWmeRgasZH58o/8caf8f3d-ad29-4980-af41-53f20c72d7a4.mp3`
- Roger: `https://storage.googleapis.com/eleven-public-prod/premade/voices/CwhRBWXzGAHq8TQ4Fs17/58ee3ff5-f6f2-4628-93b8-e38eb31806b0.mp3`

### Custom Voice (Optional Future)

Instant Voice Cloning is available on our plan. If we find a voice actor or personality that IS Remy, we can:

1. Record 1-5 minutes of clean audio (reading Remy-style lines)
2. Upload via `POST /v1/voices/add` with multipart form
3. Get a unique voice ID that no other app can use

Professional Voice Cloning (30+ minutes of samples, near-indistinguishable) requires upgrading to Creator plan ($22/mo).

### Voice Settings for Remy

```typescript
const REMY_VOICE_SETTINGS = {
  stability: 0.5, // 0=more expressive, 1=more consistent. 0.5 is balanced.
  similarity_boost: 0.75, // How closely to match the original voice
  style: 0.3, // Expressiveness (0=neutral, 1=very expressive)
  use_speaker_boost: true, // Enhance clarity
  speed: 1.0, // Normal speed (0.7-1.3 range)
}
```

### Model Choice

| Model               | Latency | Use For                                    |
| ------------------- | ------- | ------------------------------------------ |
| `eleven_flash_v2_5` | ~75ms   | Real-time chat responses (primary)         |
| `eleven_v3`         | ~300ms  | Pre-generated canned phrases (max quality) |

### Privacy Architecture

```
User message → Stays local (Ollama processes it)
                    ↓
Remy's response text → Generated by Ollama (local)
                    ↓
Response text ONLY → Sent to ElevenLabs for voice synthesis
                    ↓
Audio stream ← Received from ElevenLabs
                    ↓
Played in browser → User hears Remy speak
```

**What leaves the machine:** Only Remy's AI-generated response text. Not the user's messages, not client data, not event details. The user's input stays in Ollama and IndexedDB. Remy's output text is not PII — it's AI-generated prose.

**Voice & sound are OFF by default.** Users must opt in via a settings toggle. Nobody should hear unexpected audio from a web app — that's annoying and unprofessional. The toggle enables both voice synthesis and sound effects together, or they can be toggled independently:

- **Voice:** OFF by default. Opt-in via Remy drawer settings.
- **Sound effects:** OFF by default. Opt-in via Remy drawer settings.
- **Text-only mode** (default) works exactly as it does today — zero audio, zero surprise.

---

## Audio-Visual Sync Pipeline {#audio-visual-sync}

### Architecture

```
Ollama streams tokens
    │
    ├──> Text displayed in chat bubble (existing)
    │
    ├──> textToVisemes() for text-only lip-sync (existing, fallback)
    │
    └──> Tokens buffered and sent to ElevenLabs WebSocket
              │
              ├──> Audio chunks received (base64 → ArrayBuffer)
              │         │
              │         └──> Queued in AudioContext for gapless playback
              │
              └──> Character alignment timestamps received
                        │
                        └──> Mapped to visemes via resolveViseme()
                                  │
                                  └──> Scheduled against AudioContext.currentTime
                                            │
                                            └──> Sprite frame updated each rAF
```

### WebSocket Streaming Flow

```typescript
// 1. Open WebSocket when Remy starts responding
const ws = new WebSocket(
  `wss://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream-input` +
    `?model_id=eleven_flash_v2_5&output_format=mp3_44100_128`
)

// 2. Initialize with voice settings
ws.onopen = () => {
  ws.send(
    JSON.stringify({
      text: ' ',
      voice_settings: REMY_VOICE_SETTINGS,
      generation_config: { chunk_length_schedule: [120, 160, 250, 290] },
      xi_api_key: process.env.ELEVENLABS_API_KEY,
    })
  )
}

// 3. Stream each Ollama token
function onOllamaToken(token: string) {
  ws.send(
    JSON.stringify({
      text: token,
      try_trigger_generation: false,
    })
  )
}

// 4. Flush when Ollama is done
function onOllamaComplete() {
  ws.send(JSON.stringify({ text: '', flush: true }))
}

// 5. Receive and play audio
ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.audio) {
    // Decode base64 and queue for playback
    queueAudioChunk(data.audio)
  }
  if (data.alignment) {
    // Schedule visemes against audio timing
    scheduleVisemes(data.alignment)
  }
  if (data.isFinal) ws.close()
}
```

### Tiered Lip-Sync Quality

| Tier                        | Audio                         | Viseme Source                            | Quality   | Cost     |
| --------------------------- | ----------------------------- | ---------------------------------------- | --------- | -------- |
| 1 (text-only)               | None                          | `textToVisemes()`                        | Good      | $0       |
| 2 (audio, text-synced)      | ElevenLabs                    | `textToVisemes()`, audio plays alongside | Good+     | API cost |
| 3 (audio, alignment-synced) | ElevenLabs `/with-timestamps` | Character alignment from TTS             | Excellent | API cost |
| 4 (audio, real-time FFT)    | Any source                    | Web Audio AnalyserNode                   | Good      | $0       |

**Recommendation:** Ship Tier 2 first (simplest integration — text visemes + audio playing alongside). Upgrade to Tier 3 when alignment timestamps are wired in.

---

## Animation Triggers & App Events {#triggers}

### Event-to-Animation Map

> **Sound effects and voice clips only play when the user has opted in.** Both are OFF by default. Animations (visual) always play regardless of audio settings.

| App Event              | Body State          | Emotion     | Sound Effect  | Voice Clip              |
| ---------------------- | ------------------- | ----------- | ------------- | ----------------------- |
| App first opened       | `entrance` → `wave` | happy       | —             | "Hey there!"            |
| Chat drawer opened     | `wave`              | happy       | —             | "What's cooking?"       |
| Chat drawer closed     | `exit`              | neutral     | —             | —                       |
| User starts typing     | (stay current)      | listening   | —             | —                       |
| Ollama processing      | `thinking`          | thinking    | —             | —                       |
| First response token   | `speaking`          | (from text) | —             | Streamed voice          |
| Response complete      | `idle`              | neutral     | —             | —                       |
| Event created          | `celebrating`       | happy       | confetti.mp3  | "Beautiful!"            |
| Quote sent             | `celebrating`       | happy       | cha-ching.mp3 | "Sent!"                 |
| Menu approved          | `celebrating`       | happy       | bell.mp3      | "They loved it!"        |
| Error / Ollama offline | `error`             | angry       | —             | "Hmm, something's off." |
| Payment received       | `celebrating`       | star-eyes   | register.mp3  | "Ka-ching!"             |
| 60 seconds idle        | `sleeping`          | eyes-closed | —             | —                       |
| User returns from idle | `idle`              | happy       | —             | "Welcome back!"         |
| Nudge / suggestion     | `nudge`             | happy       | pop.mp3       | —                       |
| Recipe added           | `whisking`          | happy       | —             | "Let me whisk that up!" |

### Pre-Rendered Voice Clips (Quick Win)

Before full TTS streaming, we can pre-generate these clips with ElevenLabs (one-time API call, cache as static `.mp3`):

| Clip               | Text                                           | Duration | Use                       |
| ------------------ | ---------------------------------------------- | -------- | ------------------------- |
| `greeting-1.mp3`   | "Hey there! How can I help?"                   | ~2s      | Drawer open               |
| `greeting-2.mp3`   | "What's cooking?"                              | ~1s      | Drawer open (alternate)   |
| `greeting-3.mp3`   | "Ready when you are, chef!"                    | ~2s      | Drawer open (alternate)   |
| `thinking.mp3`     | "Let me look into that..."                     | ~1.5s    | Processing start          |
| `success-1.mp3`    | "All done!"                                    | ~1s      | Task complete             |
| `success-2.mp3`    | "Beautiful!"                                   | ~1s      | Task complete (alternate) |
| `error.mp3`        | "Hmm, something went wrong. Let me try again." | ~3s      | Error state               |
| `goodbye.mp3`      | "See you later!"                               | ~1s      | Drawer close              |
| `welcome-back.mp3` | "Welcome back!"                                | ~1s      | Return from sleep         |
| `payment.mp3`      | "Ka-ching! Payment received."                  | ~2s      | Payment success           |

**Total:** ~10 clips, generated once for $0.05 worth of API credits.

---

## Performance & Loading Strategy {#performance}

### Loading Priority

| Sheet                     | Strategy                         | When                 | Why                                     |
| ------------------------- | -------------------------------- | -------------------- | --------------------------------------- |
| `remy-sprite.png`         | `<link rel="preload">` in layout | Page load            | Always visible (mascot button lip-sync) |
| `remy-mascot.png`         | `<link rel="preload">` in layout | Page load            | Always visible (idle body)              |
| `remy-body-idle.png`      | Eager load after hydration       | After initial render | Breathing starts immediately            |
| `remy-body-wave.png`      | Lazy — on drawer first open      | User interaction     | Only needed when greeting               |
| `remy-body-think.png`     | Lazy — on first message sent     | User interaction     | Only needed during chat                 |
| `remy-body-whisk.png`     | Lazy — on first recipe action    | User interaction     | Rare animation                          |
| `remy-body-celebrate.png` | Lazy — on first success event    | App event            | Rare animation                          |
| `remy-body-sleep.png`     | Lazy — after 30s idle            | Idle timer           | Low priority                            |
| `remy-body-error.png`     | Lazy — on first error            | Error event          | Hopefully rare                          |
| Voice clips (.mp3)        | Lazy — on voice toggle enabled   | User preference      | Optional feature                        |

### Preloader Service

```typescript
// lib/ai/remy-sprite-loader.ts

const loaded = new Set<string>()
const loading = new Map<string, Promise<void>>()

export function preloadSprite(name: string): Promise<void> {
  if (loaded.has(name)) return Promise.resolve()
  if (loading.has(name)) return loading.get(name)!

  const promise = new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = () => {
      loaded.add(name)
      loading.delete(name)
      resolve()
    }
    img.onerror = () => {
      loading.delete(name)
      resolve()
    } // graceful fail
    img.src = spritePath(name)
  })

  loading.set(name, promise)
  return promise
}

export function isSpriteLoaded(name: string): boolean {
  return loaded.has(name)
}
```

### Memory Management

- Use `will-change: background-position` on the mascot container only (1 element)
- Remove `will-change` from sleeping state (no animation, save GPU memory)
- Sprite sheets stay decoded in browser cache — don't manually manage Image lifecycle
- Total decoded memory: ~25 MB worst case (all sheets loaded) — acceptable

### Pause Off-Screen

```typescript
// Intersection Observer — stop rAF when mascot is not visible
function useVisibleAnimation(ref: RefObject<HTMLElement>) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.1,
    })
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref])

  return visible
}
```

---

## File Structure {#file-structure}

### New Files

```
lib/ai/
  remy-animation-state.ts     # Body + mouth state machine (useReducer)
  remy-sprite-loader.ts       # Preload/lazy-load sprite sheets
  remy-audio-sync.ts          # ElevenLabs WebSocket + AudioContext sync
  remy-voice.ts               # Voice config, clip playback, TTS settings
  elevenlabs-tts.ts           # ElevenLabs API client (HTTP + WebSocket)

components/ai/
  remy-sprite-renderer.tsx    # Low-level sprite frame renderer (shared)
  remy-body-animation.tsx     # Body layer — CSS keyframe animations
  remy-eye-layer.tsx          # Eye overlay — blink + emotion

public/images/remy/
  sprites/                    # Production sprite sheets (WebP + PNG)
    remy-body-idle.webp
    remy-body-walk.webp
    remy-body-whisk.webp
    remy-body-wave.webp       # TO CREATE
    remy-body-celebrate.webp  # TO CREATE
    remy-body-sleep.webp      # TO CREATE
    remy-body-think.webp      # TO CREATE
    remy-body-error.webp      # TO CREATE
    remy-eyes.webp            # TO CREATE
  manifests/                  # Sprite sheet metadata
    idle.json
    walk.json
    whisk.json
    ...

public/audio/remy/
  greeting-1.mp3              # Pre-rendered voice clips
  greeting-2.mp3
  thinking.mp3
  success-1.mp3
  error.mp3
  goodbye.mp3
  ...
```

### Modified Files

```
components/ai/
  remy-mascot-button.tsx      # Add body animation layer, connect state machine
  remy-talking-avatar.tsx     # Add audio-sync mode alongside text-sync
  remy-drawer.tsx             # Add voice toggle, connect animation triggers

lib/ai/
  remy-visemes.ts             # Add alignment-based timing mode (keep text mode)
  remy-emotion.ts             # No changes needed
```

---

## Implementation Phases {#phases}

### Phase 1: Foundation (1-2 sessions)

- [ ] Normalize all existing frame PNGs to uniform canvas sizes (pad, center)
- [ ] Build sprite sheet compiler (take PNGs → output single sheet + manifest JSON)
- [ ] Create `remy-sprite-renderer.tsx` — generic component that renders any sprite sheet
- [ ] Create `remy-animation-state.ts` — body state machine with `useReducer`
- [ ] Build `remy-body-idle.png` sprite sheet (breathing loop, 6 frames)
- [ ] Wire idle breathing into `RemyMascotButton`

### Phase 2: Core Animations (2-3 sessions)

- [ ] Create `remy-body-walk.png` from existing walk frames
- [ ] Create `remy-body-whisk.png` from existing whisk frames
- [ ] Create `remy-body-think.png` from existing pondering/aha assets
- [ ] Create `remy-body-sleep.png` from existing sleeping assets
- [ ] Build transition system (crossfade between body states)
- [ ] Wire state machine to app events (drawer open, response start/end)
- [ ] Add auto-sleep after 60s idle

### Phase 3: Voice (1-2 sessions)

- [ ] Build `elevenlabs-tts.ts` — API client with HTTP streaming
- [ ] Pre-generate 10 voice clips (greetings, success, error, goodbye)
- [ ] Add voice toggle to Remy drawer settings
- [ ] Play pre-rendered clips on app events (greeting, success, error)
- [ ] Build `remy-audio-sync.ts` — AudioContext playback + timing

### Phase 4: Streaming Voice + Lip-Sync (2-3 sessions)

- [ ] Add WebSocket streaming to `elevenlabs-tts.ts`
- [ ] Connect Ollama token stream → ElevenLabs WebSocket
- [ ] Play audio chunks via AudioContext (gapless)
- [ ] Upgrade lip-sync to use alignment timestamps (Tier 3)
- [ ] Sync viseme frames to `AudioContext.currentTime`

### Phase 5: Missing Assets + Polish (1-2 sessions)

- [ ] Commission/create waving animation (6 frames)
- [ ] Commission/create celebration animation (8 frames)
- [ ] Commission/create error/worried animation (2-3 frames)
- [ ] Add eye blink layer (`remy-eye-layer.tsx`)
- [ ] Add sound effects (confetti pop, cha-ching, notification)
- [ ] WebP conversion for all sprite sheets
- [ ] Final performance audit

### Phase 6: Delight (ongoing)

- [ ] Extract pancake flip from animation pack
- [ ] Extract thumbs-up from animation pack
- [ ] Nodding/head shake animations
- [ ] Seasonal hat variants
- [ ] Dark mode Remy variant
- [ ] Mini Remy for notification badges

---

## Complete Asset Requirements {#asset-requirements}

### What We Have (Ready to Use)

| Asset                             | Status              | Notes                            |
| --------------------------------- | ------------------- | -------------------------------- |
| Lip-sync sprite sheet (16 frames) | Ready               | In production                    |
| Mascot idle body (with flag)      | Ready               | In production                    |
| Walk cycle (5 frames)             | Needs normalization | Varying dimensions, need padding |
| Whisk cycle (4 frames)            | Needs normalization | Varying dimensions               |
| Flag wave (6 frames)              | Needs normalization | Most irregular dimensions        |
| Pondering face                    | Ready               | 360x402, can use as-is           |
| Aha/lightbulb face                | Ready               | 445x377, can use as-is           |
| Sleeping (2 variants)             | Needs downscale     | 2080x2048 source, need 420x420   |
| Happy eyes closed                 | Needs downscale     | 2080x2048 source                 |
| Eyes closed (neutral)             | Needs downscale     | 2080x2048 source                 |
| Reassurance face                  | Needs downscale     | 2080x2048 source                 |
| Giddy surprise (star eyes)        | Needs downscale     | 2080x2048 source                 |
| Straight face                     | Ready               | 1040x1024                        |

### What We Need to Create

| Asset                      | Priority | Frames | Description                    | How to Get                                                                                      |
| -------------------------- | -------- | ------ | ------------------------------ | ----------------------------------------------------------------------------------------------- |
| **Idle breathing loop**    | P1       | 4-6    | Subtle body scale + hat wobble | Derive from `remy-mascot.png` — programmatic scale transform, or commission 4-6 slight variants |
| **Waving/greeting**        | P1       | 6      | Full body waving hello         | Commission from same artist who did the animation pack                                          |
| **Celebration/jump**       | P1       | 6-8    | Jump + confetti burst          | Commission — new poses needed                                                                   |
| **Error/worried**          | P1       | 2-3    | Sweat drop, worried eyebrows   | Commission — could adapt from existing expressions                                              |
| **Eye states overlay**     | P1       | 5-6    | Open, half, closed, wide, star | Extract/modify from existing high-res portraits                                                 |
| **Thinking chin-tap loop** | P2       | 3      | Chin touch, looking up         | Can adapt from pondering asset                                                                  |
| **Nodding**                | P2       | 3      | Subtle head bob                | Derive from idle — programmatic transform                                                       |
| **Head shake**             | P2       | 3      | Gentle left-right              | Derive from idle — programmatic transform                                                       |
| **Listening pose**         | P2       | 1      | Attentive, slightly leaning    | Commission or adapt from idle                                                                   |
| **Pancake flip**           | P2       | 3-4    | Already in animation pack      | Extract from `remy-animation-pack.png`                                                          |
| **Thumbs up**              | P2       | 1      | Already in animation pack      | Extract from `remy-animation-pack.png`                                                          |
| **Carrying tray**          | P3       | 1      | Full body with cloche/tray     | Commission                                                                                      |
| **Reading clipboard**      | P3       | 1      | Looking at recipe card         | Commission                                                                                      |
| **Holiday hats**           | P3       | 4-6    | Santa, party, witch, etc.      | Commission hat-only variants                                                                    |
| **Night mode variant**     | P3       | 1      | Dimmer, nightcap               | Commission                                                                                      |
| **Mini Remy**              | P3       | 1      | 16x16 / 24x24 simplified       | Design from scratch                                                                             |
| **Wave goodbye**           | P3       | 4      | Sad-sweet wave                 | Commission                                                                                      |
| **Dance / victory**        | P3       | 6-8    | Full celebration dance         | Commission                                                                                      |
| **Food-holding variants**  | P3       | 3-4    | Pizza, cake, steak             | Commission                                                                                      |

### Sound Effects Needed

| Sound           | Duration  | Use               | Source           |
| --------------- | --------- | ----------------- | ---------------- |
| `pop.mp3`       | 0.2s      | Nudge bounce      | Free SFX library |
| `confetti.mp3`  | 1s        | Celebration       | Free SFX library |
| `cha-ching.mp3` | 0.5s      | Payment received  | Free SFX library |
| `bell.mp3`      | 0.5s      | Menu approved     | Free SFX library |
| `whoosh.mp3`    | 0.3s      | Drawer open/close | Free SFX library |
| `snore.mp3`     | 2s (loop) | Sleeping state    | Free SFX library |
| `sparkle.mp3`   | 0.5s      | Star eyes moment  | Free SFX library |

### Voice Clips to Pre-Generate

| Clip               | Text                          | Voice | Model     |
| ------------------ | ----------------------------- | ----- | --------- |
| `greeting-1.mp3`   | "Hey there! How can I help?"  | Eric  | eleven_v3 |
| `greeting-2.mp3`   | "What's cooking?"             | Eric  | eleven_v3 |
| `greeting-3.mp3`   | "Ready when you are, chef!"   | Eric  | eleven_v3 |
| `thinking.mp3`     | "Let me look into that..."    | Eric  | eleven_v3 |
| `success-1.mp3`    | "All done!"                   | Eric  | eleven_v3 |
| `success-2.mp3`    | "Beautiful!"                  | Eric  | eleven_v3 |
| `error.mp3`        | "Hmm, something went wrong."  | Eric  | eleven_v3 |
| `goodbye.mp3`      | "See you later!"              | Eric  | eleven_v3 |
| `welcome-back.mp3` | "Welcome back!"               | Eric  | eleven_v3 |
| `payment.mp3`      | "Ka-ching! Payment received." | Eric  | eleven_v3 |
| `recipe.mp3`       | "Let me whisk that up!"       | Eric  | eleven_v3 |
| `approval.mp3`     | "They loved it!"              | Eric  | eleven_v3 |

---

## Technical References

- **Duolingo lip-sync system:** blog.duolingo.com/world-character-visemes/
- **Meta/Oculus viseme standard:** developers.meta.com/horizon/documentation/unity/audio-ovrlipsync-viseme-reference/
- **ElevenLabs streaming API:** elevenlabs.io/docs/api-reference/text-to-speech/stream-input
- **ElevenLabs alignment timestamps:** elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps
- **CSS sprite animation with steps():** leanrada.com/notes/css-sprite-sheets/
- **Web Audio API:** developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- **LipSync Engine (open source):** github.com/Amoner/lipsync-engine
- **GPU compositing guide:** smashingmagazine.com/2016/12/gpu-animation-doing-it-right/
- **Rive state machines:** rive.app/blog/how-state-machines-work-in-rive
