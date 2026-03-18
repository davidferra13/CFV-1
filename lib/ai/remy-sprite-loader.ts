// Remy Sprite Preloader - lazy-loads sprite sheets on demand.
// Tracks loaded/loading state to prevent duplicate requests.
// Used by the animation system to preload sheets before they're needed.

import { MANIFESTS } from './remy-sprite-manifests'
import type { BodyState } from './remy-body-state'

// ─── State ──────────────────────────────────────────────────────────────────

const loaded = new Set<string>()
const loading = new Map<string, Promise<void>>()

// ─── Core ───────────────────────────────────────────────────────────────────

/** Preload a sprite sheet by path. Resolves when the image is decoded. */
export function preloadSprite(path: string): Promise<void> {
  if (loaded.has(path)) return Promise.resolve()
  if (loading.has(path)) return loading.get(path)!

  const promise = new Promise<void>((resolve) => {
    if (typeof window === 'undefined') {
      resolve()
      return
    }
    const img = new Image()
    img.onload = () => {
      loaded.add(path)
      loading.delete(path)
      resolve()
    }
    img.onerror = () => {
      // Graceful fail - don't block on missing assets
      loading.delete(path)
      resolve()
    }
    img.src = path
  })

  loading.set(path, promise)
  return promise
}

/** Check if a sprite sheet has been loaded */
export function isSpriteLoaded(path: string): boolean {
  return loaded.has(path)
}

// ─── Batch Preloaders ───────────────────────────────────────────────────────

/** Preload the critical sprites needed on every page load */
export function preloadCritical(): Promise<void[]> {
  return Promise.all([
    preloadSprite('/images/remy/remy-idle.png'),
    preloadSprite('/images/remy/remy-sprite.png'),
    preloadSprite('/images/remy/sprites/remy-eyes.png'),
  ])
}

/** Preload the sprite sheet needed for a specific body state */
export function preloadForState(state: BodyState): Promise<void> {
  const sheetNames: Partial<Record<BodyState, string>> = {
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

  const sheetName = sheetNames[state]
  if (!sheetName) return Promise.resolve()

  const manifest = MANIFESTS[sheetName]
  if (!manifest || !manifest.available) return Promise.resolve()

  return preloadSprite(manifest.path)
}

// ─── Smart Preloading ────────────────────────────────────────────────────────
// When entering a state, preload the sprites most likely needed next.

const ADJACENT_STATES: Partial<Record<BodyState, BodyState[]>> = {
  idle: ['thinking', 'wave', 'whisking', 'sleeping'],
  thinking: ['speaking', 'idle'],
  speaking: ['idle', 'celebrating'],
  wave: ['idle', 'thinking'],
  entrance: ['idle', 'wave'],
  whisking: ['idle', 'thinking'],
  sleeping: ['idle', 'wave'],
  celebrating: ['idle'],
  error: ['idle'],
  nudge: ['idle', 'wave'],
  exit: ['idle'],
}

/** Preload sprite sheets for states likely to follow the current one */
export function preloadAdjacentStates(currentState: BodyState): void {
  const adjacents = ADJACENT_STATES[currentState]
  if (!adjacents) return

  // Preload after a short delay to not compete with current state's load
  setTimeout(() => {
    for (const state of adjacents) {
      preloadForState(state)
    }
  }, 200)
}
