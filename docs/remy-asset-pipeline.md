# Remy Asset Pipeline

## Overview

The Remy animation system uses sprite sheets — grids of individual frames packed into a single PNG. This document describes the end-to-end pipeline for generating new frames via ComfyUI and assembling them into sprite sheets.

## Architecture

```
ComfyUI (IP-Adapter)     →  Individual frames (green screen)
  ↓
remove-greenscreen.py    →  Individual frames (transparent PNG)
  ↓
assemble-spritesheet.py  →  Sprite sheet grid (single PNG)
  ↓
remy-sprite-manifests.ts →  Flip available: true
  ↓
Animation system auto-detects and uses new sheet
```

## Prerequisites

- **ComfyUI** installed at `C:\ComfyUI\ComfyUI_windows_portable\`
- **Python** (use ComfyUI's embedded Python): `C:\ComfyUI\ComfyUI_windows_portable\python_embeded\python.exe`
- **Reference image**: `C:\ComfyUI\ComfyUI_windows_portable\ComfyUI\input\remy-reference.jpg`

## Quick Start

### 1. Generate frames in ComfyUI

Open `http://127.0.0.1:8188`, use the `ipadapter_simple` template with the Remy reference image. Generate individual frames for each animation state.

### 2. Save frames

Save generated frames to a folder organized by animation:

```
C:\Users\david\Videos\RemyFrames\
  idle\        → 6 frames (idle-01.png through idle-06.png)
  walk\        → 5 frames
  wave\        → 6 frames
  think\       → 3 frames
  whisk\       → 4 frames
  celebrate\   → 8 frames
  sleep\       → 4 frames
  error\       → 3 frames
```

### 3. Run the pipeline

```bash
# Using ComfyUI's Python (has Pillow):
PYTHON="C:/ComfyUI/ComfyUI_windows_portable/python_embeded/python.exe"

# Process one animation at a time:
$PYTHON scripts/remy-assets/pipeline.py idle "C:/Users/david/Videos/RemyFrames/idle"
$PYTHON scripts/remy-assets/pipeline.py walk "C:/Users/david/Videos/RemyFrames/walk"
$PYTHON scripts/remy-assets/pipeline.py wave "C:/Users/david/Videos/RemyFrames/wave"
# ... etc

# Or process individual steps:
$PYTHON scripts/remy-assets/remove-greenscreen.py input_dir/ output_dir/ --tolerance 30 --size 420
$PYTHON scripts/remy-assets/assemble-spritesheet.py output_dir/ sprite-sheet.png --cols 4 --cell 420
```

### 4. Enable the animation

The pipeline prints the manifest entry. Update `lib/ai/remy-sprite-manifests.ts`:

- Paste the manifest entry (or update existing)
- Set `available: true`
- The animation system picks it up automatically

## Animation Specs

| Animation | Frames | Grid | Cell Size | FPS | Loop |
| --------- | ------ | ---- | --------- | --- | ---- |
| idle      | 6      | 3×2  | 420×420   | 4   | yes  |
| walk      | 5      | 5×1  | 420×420   | 12  | no   |
| wave      | 6      | 3×2  | 420×420   | 12  | no   |
| think     | 3      | 3×1  | 420×420   | 6   | yes  |
| whisk     | 4      | 4×1  | 420×420   | 10  | yes  |
| celebrate | 8      | 4×2  | 420×420   | 12  | no   |
| sleep     | 4      | 2×2  | 420×420   | 2   | yes  |
| error     | 3      | 3×1  | 420×420   | 4   | no   |
| lipsync   | 15     | 4×4  | 420×420   | 12  | no   |

## Frame Descriptions (for ComfyUI prompts)

### Idle (6 frames, looping breathing)

1. Neutral, slight inhale
2. Chest rises, eyes relaxed
3. Peak inhale, slight upward tilt
4. Begin exhale
5. Chest lowers, settling
6. Full exhale, relaxed

### Walk (5 frames, entrance/exit)

1. Contact pose — right foot forward
2. Passing pose — mid-stride
3. Contact pose — left foot forward
4. Passing pose — mid-stride
5. Settle — both feet, neutral stance

### Wave (6 frames, greeting)

1. Arm begins to rise
2. Arm halfway up
3. Full wave — hand open
4. Wave tilt left
5. Wave tilt right
6. Arm lowering, smile

### Think (3 frames, looping pondering)

1. Hand to chin, eyes up-left
2. Head slight tilt, eyes squinting
3. Slight nod, considering

### Whisk (4 frames, looping cooking)

1. Whisk down in bowl
2. Whisk right
3. Whisk up
4. Whisk left

### Celebrate (8 frames, success jump)

1. Anticipation squash
2. Launch up
3. Rising
4. Apex — arms up (hold longer)
5. Apex continued (hold longer)
6. Falling
7. Landing squash
8. Settle with smile (hold longest)

### Sleep (4 frames, looping Zzz)

1. Eyes closed, head neutral
2. Head slight droop
3. Head drooped, Zzz visible
4. Slight shift, Zzz fading

### Error (3 frames, startled reaction)

1. Surprised — wide eyes
2. Concerned — furrowed brow
3. Reassuring — slight smile, hand gesture

## Green-Screen Settings

| Scenario          | Tolerance    | Notes                                         |
| ----------------- | ------------ | --------------------------------------------- |
| Clean #00FF00 bg  | 30 (default) | Works for most AI generators                  |
| Sparkle artifacts | 45-60        | For images with green sparkles near edges     |
| Exact color only  | 0-10         | When character has green elements to preserve |

## File Locations

| What                   | Where                                             |
| ---------------------- | ------------------------------------------------- |
| Pipeline scripts       | `scripts/remy-assets/`                            |
| Sprite sheets (output) | `public/images/remy/sprites/`                     |
| Lip-sync sheet         | `public/images/remy/remy-sprite.png`              |
| Manifest registry      | `lib/ai/remy-sprite-manifests.ts`                 |
| Body state machine     | `lib/ai/remy-body-state.ts`                       |
| Sprite animator        | `components/ai/remy-sprite-animator.tsx`          |
| 3-layer compositor     | `components/ai/remy-animated-mascot.tsx`          |
| ComfyUI                | `C:\ComfyUI\ComfyUI_windows_portable\`            |
| Reference image        | `C:\ComfyUI\...\ComfyUI\input\remy-reference.jpg` |

## Re-enabling the Animation System

Once sprite sheets are generated, to bring back the full animation:

1. In each consumer file (remy-drawer.tsx, remy-mascot-button.tsx, etc.), swap `RemyAvatar` back to `RemyAnimatedMascot` or `RemyTalkingAvatar`
2. The archived components are intact and ready:
   - `components/ai/remy-animated-mascot.tsx`
   - `components/ai/remy-talking-avatar.tsx`
   - `components/ai/remy-sprite-animator.tsx`
3. The hooks and state machines are also intact:
   - `lib/ai/remy-body-state.ts`
   - `lib/ai/remy-eye-blink.ts`
   - `lib/ai/remy-visemes.ts`
   - `lib/ai/use-remy-lip-sync.ts`
