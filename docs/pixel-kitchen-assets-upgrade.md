# Pixel Kitchen V2+ Asset Upgrade

Date: 2026-03-13

## What Changed

The Pixel Kitchen (OpenClaw ops dashboard) was upgraded from 100% procedural Canvas2D drawing to a hybrid system using **real pixel art assets** from free, commercially-licensed sources, while keeping all data-binding and interactivity intact.

## Assets Downloaded (378 files)

### Kenney (CC0, public domain, zero attribution)

- **Pixel UI Pack** (750 elements): 9-slice panels (Ancient, Colored, Space), buttons, frames, scrollers
- **Pixel Platformer Food Expansion** (112 tiles): 18x18 food sprites in a 16x7 tilemap
- **Particle Pack** (80 effects): Fire, smoke, light, flare, star, circle particles (512x512, transparent)

### LPC Flames (CC-BY 3.0, credit: Sharm)

- **12-frame flame animation** (16x24px per frame): Smooth animated fire loop

### InkMammoth Food Pack (GPL 2.0)

- **Pixel art food sprites**: Fruits, vegetables, cookie items

### ENDESGA 64 Palette

- 64-color pixel art palette replacing the original 28-color custom palette
- Warmer, more cohesive color relationships
- Source: lospec.com/palette-list/endesga-64

## What Was Upgraded

### Palette

- All 28 original colors replaced with ENDESGA 64 equivalents
- Added 20+ new named colors (gold, amber, cream, teal, navy, lime, coral, etc.)
- Richer warm tones for flames, wood, food, skin
- Deeper darks for backgrounds (void, midnight, wine)

### Sprites Integrated

- **Stove flames**: LPC 12-frame animated fire sprites (per burner, offset timing)
- **Food on pass**: Kenney food tiles (apple, cherry, orange, cheese, meat, pizza, etc.)
- **Walk-in cooler shelves**: Real food sprites (fruits, veggies, proteins)
- **Dining tables**: Food sprites on in_progress event tables
- **Smoke/steam**: Kenney smoke particles on hood vent, dish pit, stove pans
- **Heat lamps**: Kenney light particles for glow effects
- **Oil bubbles**: Kenney circle particles in deep fryer

### UI Panels

- **HUD bar**: Kenney space panel (9-slice)
- **Achievement toasts**: Kenney brown ancient panel (9-slice)
- **Tooltips**: Kenney space inlay panel (9-slice)
- **Chef thought bubble**: Kenney white panel (9-slice)
- **CHEF OUT sign**: Kenney red colored panel (9-slice)

### Chef Character (Enhanced Procedural)

- Double-breasted button detail
- Blinking eyes (every ~4 seconds)
- Subtle mouth (smile)
- Hair on guests
- Eye highlights
- Alternating tasting spoon / chef knife animation
- Soft elliptical shadow
- Checkered pants pattern
- Apron strings

### Graceful Fallback

- Every sprite draw has a procedural fallback
- If assets fail to load, the kitchen renders exactly as before
- Loading progress bar shown while assets download

## Server Changes

- Added `/assets/*` static file route to `server.mjs`
- URL-decoded paths for directory names with spaces
- 1-week cache headers on assets (they don't change)
- Directory traversal prevention

## File Locations

| What            | Where                                                      |
| --------------- | ---------------------------------------------------------- |
| Assets root     | `scripts/launcher/assets/`                                 |
| Food sprites    | `scripts/launcher/assets/sprites/food/Tiles/`              |
| Food tilemap    | `scripts/launcher/assets/sprites/food/Tilemap/tilemap.png` |
| UI panels       | `scripts/launcher/assets/ui/9-Slice/`                      |
| Flame frames    | `scripts/launcher/assets/effects/flames/`                  |
| Particles       | `scripts/launcher/assets/effects/PNG (Transparent)/`       |
| Palette         | `scripts/launcher/assets/palette/endesga-64.json`          |
| Credits         | `scripts/launcher/assets/CREDITS.md`                       |
| Download script | `scripts/launcher/assets/download-assets.sh`               |

## Re-downloading Assets

If assets are missing, run:

```bash
bash scripts/launcher/assets/download-assets.sh
```
