'use client'

/**
 * RemyArchetypeSelector — lets chefs pick Remy's personality archetype.
 * Shows a grid of archetype cards with emoji, name, tagline, and description.
 * The selected archetype is saved to ai_preferences.remy_archetype.
 */

import { useState, useTransition } from 'react'
import { Check } from 'lucide-react'
import { REMY_ARCHETYPES, DEFAULT_ARCHETYPE, type RemyArchetypeId } from '@/lib/ai/remy-archetypes'
import { saveRemyArchetype } from '@/lib/ai/privacy-actions'

interface Props {
  currentArchetype: string | null
  onSaved?: (id: RemyArchetypeId) => void
}

export function RemyArchetypeSelector({ currentArchetype, onSaved }: Props) {
  const [selected, setSelected] = useState<RemyArchetypeId>(
    (currentArchetype as RemyArchetypeId) ?? DEFAULT_ARCHETYPE
  )
  const [saving, startTransition] = useTransition()
  const [justSaved, setJustSaved] = useState(false)

  function handleSelect(id: RemyArchetypeId) {
    setSelected(id)
    setJustSaved(false)
    startTransition(async () => {
      const result = await saveRemyArchetype(id)
      if (result.success) {
        setJustSaved(true)
        onSaved?.(id)
        setTimeout(() => setJustSaved(false), 2000)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-stone-100">Remy&apos;s Personality</h3>
        <p className="text-sm text-stone-500 mt-1">
          Choose how Remy talks to you. This changes tone and energy — not what Remy knows or can
          do.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {REMY_ARCHETYPES.map((arch) => {
          const isSelected = selected === arch.id
          return (
            <button
              key={arch.id}
              onClick={() => handleSelect(arch.id)}
              disabled={saving}
              className={`relative text-left rounded-xl border-2 p-4 transition-all ${
                isSelected
                  ? 'border-brand-500 bg-brand-950 ring-1 ring-brand-600'
                  : 'border-stone-700 bg-surface hover:border-stone-600 hover:shadow-sm'
              } ${saving ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <div className="w-5 h-5 rounded-full bg-brand-9500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}

              <div className="text-2xl mb-2">{arch.emoji}</div>
              <div className="font-semibold text-stone-100 text-sm">{arch.name}</div>
              <div className="text-xs text-brand-600 font-medium mt-0.5">{arch.tagline}</div>
              <p className="text-xs text-stone-500 mt-2 leading-relaxed">{arch.description}</p>
            </button>
          )
        })}
      </div>

      {justSaved && (
        <p className="text-sm text-green-600 flex items-center gap-1.5">
          <Check className="w-4 h-4" />
          Personality updated! Remy will use this voice in your next conversation.
        </p>
      )}
    </div>
  )
}
