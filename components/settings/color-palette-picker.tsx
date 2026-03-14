'use client'

import { usePalette } from '@/components/ui/color-palette-provider'
import { Check } from '@/components/ui/icons'

export function ColorPalettePicker() {
  const { palette: current, setPalette, palettes } = usePalette()

  return (
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
            onClick={() => setPalette(p.id)}
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
  )
}
