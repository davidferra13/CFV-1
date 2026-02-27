// Remy Sprite Sheet Registry — metadata for every sprite sheet in the system.
// Each manifest describes a sheet's grid layout, timing, and availability.
//
// To add a new asset:
//   1. Drop the PNG in public/images/remy/
//   2. Add a manifest entry here with available: true
//   3. The animation system auto-detects and uses it

import type { BodyState } from './remy-body-state'

// ─── Manifest Interface ─────────────────────────────────────────────────────

export interface SpriteManifest {
  /** Unique name for this sheet */
  name: string
  /** Path relative to public/ */
  path: string
  /** Number of columns in the grid */
  cols: number
  /** Number of rows in the grid */
  rows: number
  /** Width of each cell in px */
  cellWidth: number
  /** Height of each cell in px */
  cellHeight: number
  /** Total number of frames (may be less than cols × rows) */
  frameCount: number
  /** Playback frames per second */
  fps: number
  /** Whether to loop or play once */
  loop: boolean
  /** Pixels to crop from top of each cell (label text) */
  labelOffset: number
  /** Whether the asset file actually exists and is ready to use */
  available: boolean
  /** Optional per-frame duration multipliers (1.0 = normal speed).
   *  Use >1 to hold a frame longer (apex of jump, anticipation squash).
   *  Array length should match frameCount; missing entries default to 1.0. */
  frameDurations?: number[]
}

// ─── Existing Sheets ────────────────────────────────────────────────────────

export const MANIFESTS: Record<string, SpriteManifest> = {
  // === IN PRODUCTION ===
  'remy-lipsync': {
    name: 'remy-lipsync',
    path: '/images/remy/remy-sprite.png',
    cols: 4,
    rows: 4,
    cellWidth: 260,
    cellHeight: 256,
    frameCount: 15,
    fps: 12,
    loop: false,
    labelOffset: 40,
    available: true,
  },

  // === BODY ANIMATION SHEETS ===

  // NOTE: Walk, whisk, and celebrate sprites are FULL-BODY art but the mascot
  // button uses HEAD-CLOSEUP static poses. The framing mismatch causes Remy to
  // shrink from face-filling to tiny-full-body on state transitions. Disabled
  // until we have head-framed sprite sheets or a larger display context.
  // CSS fallback animations play instead (wiggle, hop, bob).

  'remy-body-walk': {
    name: 'remy-body-walk',
    path: '/images/remy/sprites/remy-body-walk.png',
    cols: 5,
    rows: 1,
    cellWidth: 420,
    cellHeight: 420,
    frameCount: 5,
    fps: 12,
    loop: false,
    labelOffset: 0,
    available: false, // full-body — clashes with head-closeup idle pose
    // Contact poses (1,3) slightly longer, passing poses (2,4) quicker, final settle held
    frameDurations: [1.0, 1.2, 0.8, 1.2, 1.5],
  },

  'remy-body-whisk': {
    name: 'remy-body-whisk',
    path: '/images/remy/sprites/remy-body-whisk.png',
    cols: 4,
    rows: 1,
    cellWidth: 420,
    cellHeight: 420,
    frameCount: 4,
    fps: 10,
    loop: true,
    labelOffset: 0,
    available: false, // full-body — clashes with head-closeup idle pose
  },

  'remy-body-celebrate': {
    name: 'remy-body-celebrate',
    path: '/images/remy/sprites/remy-body-celebrate.png',
    cols: 8,
    rows: 1,
    cellWidth: 556,
    cellHeight: 960,
    frameCount: 8,
    fps: 12,
    loop: false,
    labelOffset: 0,
    available: false, // full-body + portrait cells clipped by square sprite animator
    // Anticipation squash (1), fast launch (2-3), held apex (4-5), land + settle (6-8)
    frameDurations: [1.0, 1.4, 0.7, 0.7, 1.6, 1.6, 1.0, 1.8],
  },

  'remy-body-spicy': {
    name: 'remy-body-spicy',
    path: '/images/remy/sprites/remy-body-spicy.png',
    cols: 4,
    rows: 4,
    cellWidth: 520,
    cellHeight: 512,
    frameCount: 16,
    fps: 8,
    loop: false,
    labelOffset: 0,
    available: false, // different art style from chibi mascot — not mapped to any body state
    // Build-up (1-4), reaction peak held (5-8), recovery (9-12), settle with long final hold (13-16)
    frameDurations: [
      1.0, 1.0, 0.8, 0.8, 1.5, 1.5, 1.3, 1.3, 1.0, 1.0, 1.0, 1.0, 1.2, 1.2, 1.0, 2.0,
    ],
  },

  // === PENDING — flip available to true when assets arrive ===

  'remy-body-wave': {
    name: 'remy-body-wave',
    path: '/images/remy/sprites/remy-body-wave.png',
    cols: 3,
    rows: 2,
    cellWidth: 420,
    cellHeight: 420,
    frameCount: 6,
    fps: 12,
    loop: false,
    labelOffset: 0,
    available: false,
  },

  'remy-body-error': {
    name: 'remy-body-error',
    path: '/images/remy/sprites/remy-body-error.png',
    cols: 3,
    rows: 1,
    cellWidth: 420,
    cellHeight: 420,
    frameCount: 3,
    fps: 4,
    loop: false,
    labelOffset: 0,
    available: false,
  },

  'remy-body-think': {
    name: 'remy-body-think',
    path: '/images/remy/sprites/remy-body-think.png',
    cols: 3,
    rows: 1,
    cellWidth: 420,
    cellHeight: 420,
    frameCount: 3,
    fps: 6,
    loop: true,
    labelOffset: 0,
    available: false,
  },

  'remy-body-sleep': {
    name: 'remy-body-sleep',
    path: '/images/remy/sprites/remy-body-sleep.png',
    cols: 2,
    rows: 2,
    cellWidth: 420,
    cellHeight: 420,
    frameCount: 4,
    fps: 2,
    loop: true,
    labelOffset: 0,
    available: false,
  },

  'remy-body-idle': {
    name: 'remy-body-idle',
    path: '/images/remy/sprites/remy-body-idle.png',
    cols: 3,
    rows: 2,
    cellWidth: 420,
    cellHeight: 420,
    frameCount: 6,
    fps: 4,
    loop: true,
    labelOffset: 0,
    available: false,
  },

  // === EYE STATES (used as indexed sprite sheet, not animation) ===

  'remy-eyes': {
    name: 'remy-eyes',
    path: '/images/remy/sprites/remy-eyes.png',
    cols: 2,
    rows: 3,
    cellWidth: 1040,
    cellHeight: 683,
    frameCount: 5,
    fps: 0,
    loop: false,
    labelOffset: 0,
    available: false, // art style doesn't match base mascot images — causes visual glitch on blink
  },
}

// ─── Lookup Helpers ─────────────────────────────────────────────────────────

/** Body state → sprite sheet name mapping */
const BODY_STATE_SHEETS: Partial<Record<BodyState, string>> = {
  idle: 'remy-body-idle',
  entrance: 'remy-body-walk',
  wave: 'remy-body-wave',
  thinking: 'remy-body-think',
  whisking: 'remy-body-whisk',
  celebrating: 'remy-body-celebrate',
  sleeping: 'remy-body-sleep',
  error: 'remy-body-error',
  exit: 'remy-body-walk',
}

/** Get the sprite manifest for a body state (null if no sheet or not available) */
export function getManifestForState(state: BodyState): SpriteManifest | null {
  const sheetName = BODY_STATE_SHEETS[state]
  if (!sheetName) return null
  const manifest = MANIFESTS[sheetName]
  if (!manifest || !manifest.available) return null
  return manifest
}

/** Get any manifest by name */
export function getManifest(name: string): SpriteManifest | null {
  return MANIFESTS[name] ?? null
}
