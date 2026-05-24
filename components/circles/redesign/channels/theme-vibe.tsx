'use client'

import { cn } from '@/lib/utils'
import type { CircleDetail } from '@/lib/hub/circle-detail-actions'

type Props = { circle: CircleDetail }

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

type MoodTile = { id: string; emoji: string; label: string }

const MOOD_TILES: MoodTile[] = [
  { id: 'm1', emoji: '🕯️', label: 'Candlelight' },
  { id: 'm2', emoji: '🌿', label: 'Garden' },
  { id: 'm3', emoji: '🎵', label: 'Live Music' },
]

type GuestSuggestion = {
  id: string
  name: string
  suggestion: string
  upvotes: number
  downvotes: number
}

const SAMPLE_SUGGESTIONS: GuestSuggestion[] = [
  {
    id: 'g1',
    name: 'Sarah M.',
    suggestion: 'What about a Tuscan countryside feel with warm lighting?',
    upvotes: 4,
    downvotes: 0,
  },
  {
    id: 'g2',
    name: 'James R.',
    suggestion: 'Soft jazz playlist and minimalist table settings',
    upvotes: 2,
    downvotes: 1,
  },
]

const PALETTE_SWATCHES = [
  { color: 'bg-stone-700', active: true },
  { color: 'bg-brand-500', active: false },
  { color: 'bg-indigo-500', active: false },
  { color: 'bg-purple-500', active: false },
  { color: 'bg-emerald-500', active: false },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitial(name: string): string {
  return (name[0] ?? '?').toUpperCase()
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ThemeHeroCard() {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-900/60 via-purple-900/40 to-stone-900/20 border border-stone-700/30">
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <h3 className="text-2xl font-bold text-stone-100 tracking-tight">Elegant Evening</h3>
        <p className="mt-1 text-sm text-stone-400">Current theme</p>
      </div>

      {/* Overlay button */}
      <div className="absolute inset-0 flex items-end justify-center pb-4 bg-gradient-to-t from-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity">
        <button
          type="button"
          className="rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
        >
          Change Theme
        </button>
      </div>
    </div>
  )
}

function MoodBoardGrid() {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-stone-300">Mood Board</h4>
      <div className="grid grid-cols-3 gap-3">
        {/* Add tile */}
        <button
          type="button"
          className="aspect-square rounded-xl border-2 border-dashed border-stone-700 bg-stone-800/50 flex flex-col items-center justify-center gap-1 hover:border-stone-600 hover:bg-stone-800/70 transition-colors"
        >
          <span className="text-2xl text-stone-500">+</span>
          <span className="text-[10px] font-medium text-stone-500">Add Inspiration</span>
        </button>

        {/* Mood tiles */}
        {MOOD_TILES.map((tile) => (
          <div
            key={tile.id}
            className="aspect-square rounded-xl border border-stone-700/30 bg-stone-800/50 flex flex-col items-center justify-center gap-1"
          >
            <span className="text-3xl">{tile.emoji}</span>
            <span className="text-[10px] font-medium text-stone-400">{tile.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SuggestionCard({ suggestion }: { suggestion: GuestSuggestion }) {
  return (
    <div className="flex gap-3 rounded-lg bg-stone-900/40 px-3 py-3 hover:bg-stone-900/60 transition-colors">
      {/* Avatar */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-900/40 text-xs font-semibold text-indigo-400">
        {getInitial(suggestion.name)}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <span className="text-sm font-semibold text-stone-200">{suggestion.name}</span>
        <p className="mt-0.5 text-sm text-stone-400">{suggestion.suggestion}</p>

        {/* Reactions */}
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-1 rounded-md bg-stone-800/60 px-2 py-1 text-xs text-stone-400 hover:bg-stone-700/60 hover:text-emerald-400 transition-colors"
          >
            <span>👍</span>
            <span>{suggestion.upvotes}</span>
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded-md bg-stone-800/60 px-2 py-1 text-xs text-stone-400 hover:bg-stone-700/60 hover:text-red-400 transition-colors"
          >
            <span>👎</span>
            <span>{suggestion.downvotes}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function GuestContributions() {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-stone-300">Guest Contributions</h4>

      {/* Suggestion cards */}
      <div className="space-y-2">
        {SAMPLE_SUGGESTIONS.map((s) => (
          <SuggestionCard key={s.id} suggestion={s} />
        ))}
      </div>

      {/* Input placeholder */}
      <input
        type="text"
        placeholder="Suggest a Vibe..."
        disabled
        className="w-full rounded-lg border border-stone-700/30 bg-stone-800/50 px-4 py-2.5 text-sm text-stone-300 placeholder-stone-600 focus:outline-none focus:border-stone-600"
      />
    </div>
  )
}

function ColorPalettePreview() {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-stone-300">Color Palette</h4>
      <div className="flex items-center gap-3">
        {PALETTE_SWATCHES.map((swatch, i) => (
          <div
            key={i}
            className={cn(
              'h-10 w-10 rounded-full',
              swatch.color,
              swatch.active && 'ring-2 ring-white/20'
            )}
          />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function ThemeVibeChannel({ circle: _circle }: Props) {
  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-stone-100">
          <span>🎨</span> Theme &amp; Vibe
        </h2>
        <p className="mt-0.5 text-sm text-stone-400">Set the mood for your dinner</p>
      </div>

      {/* Theme hero card */}
      <ThemeHeroCard />

      {/* Mood board grid */}
      <MoodBoardGrid />

      {/* Guest contributions */}
      <GuestContributions />

      {/* Color palette preview */}
      <ColorPalettePreview />
    </div>
  )
}
