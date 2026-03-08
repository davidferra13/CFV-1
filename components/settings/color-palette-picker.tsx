'use client'

import { usePalette } from '@/components/ui/color-palette-provider'
import { Check } from '@/components/ui/icons'
import { toast } from 'sonner'

/** Live preview showing how the current palette looks on real UI elements. */
function PalettePreview() {
  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 p-5 space-y-4">
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Live Preview</p>

      {/* Simulated nav items */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-950 px-3 py-1.5 text-xs font-semibold text-brand-400">
          Dashboard
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-stone-400">
          Events
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-stone-400">
          Clients
        </span>
      </div>

      {/* Simulated card with button */}
      <div className="rounded-lg border border-stone-700 bg-stone-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-100">Upcoming Event</p>
            <p className="text-xs text-brand-400">Saturday, Mar 15</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-brand-950 px-2 py-0.5 text-[10px] font-semibold text-brand-400">
            Confirmed
          </span>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex h-8 items-center justify-center rounded-lg bg-brand-600 px-3 text-xs font-medium text-white">
            View Details
          </span>
          <span className="inline-flex h-8 items-center justify-center rounded-lg border border-stone-600 bg-stone-800 px-3 text-xs text-stone-300">
            Edit
          </span>
        </div>
      </div>

      {/* Accent bar */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-stone-800 overflow-hidden">
          <div className="h-full w-3/5 rounded-full bg-brand-500" />
        </div>
        <span className="text-xs font-medium text-brand-500">60%</span>
      </div>
    </div>
  )
}

export function ColorPalettePicker() {
  const { palette: current, setPalette, palettes } = usePalette()

  const handleSelect = (id: string, name: string) => {
    setPalette(id)
    toast.success(`Switched to ${name}`)
  }

  return (
    <div className="space-y-6">
      {/* Live preview at the top so you see changes immediately */}
      <PalettePreview />

      {/* Palette options */}
      <div className="space-y-3">
        {palettes.map((p) => {
          const isActive = p.id === current.id
          const swatches = [
            p.swatches.deep,
            p.swatches.hero,
            p.swatches.soft,
            p.swatches.anchor,
            p.swatches.foundation,
            p.swatches.text,
          ]

          return (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id, p.name)}
              className={`w-full rounded-xl border p-4 text-left transition-all ${
                isActive
                  ? 'border-brand-500 ring-2 ring-brand-500/20 bg-stone-800'
                  : 'border-stone-700 hover:border-stone-500 bg-stone-900'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-stone-100">{p.name}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{p.description}</p>
                </div>
                {isActive && (
                  <div className="flex-shrink-0 ml-3 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <div className="flex gap-1.5 mt-3">
                {swatches.map((color, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-lg border border-stone-600/50"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
