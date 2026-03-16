'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ARCHETYPES } from '@/lib/archetypes/presets'
import type { ArchetypeId } from '@/lib/archetypes/presets'
import { selectArchetype } from '@/lib/archetypes/actions'

export function ArchetypeSelector() {
  const [selected, setSelected] = useState<ArchetypeId | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleConfirm() {
    if (!selected) return
    setError(null)

    startTransition(async () => {
      try {
        await selectArchetype(selected)
        router.refresh()
      } catch (err) {
        setError('Something went wrong. Please try again.')
        console.error('[ArchetypeSelector]', err)
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 p-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white font-display mb-3">Welcome to ChefFlow</h1>
          <p className="text-stone-400 text-lg max-w-xl mx-auto">
            We want to set up your portal perfectly. What type of chef are you?
          </p>
          <p className="text-stone-500 text-sm mt-2">
            This just sets your starting layout - you can change everything anytime in Settings.
          </p>
        </div>

        {/* Archetype Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {ARCHETYPES.map((archetype) => (
            <button
              key={archetype.id}
              onClick={() => setSelected(archetype.id)}
              disabled={isPending}
              className={`
                relative p-5 rounded-xl border-2 text-left transition-all duration-200
                ${
                  selected === archetype.id
                    ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/30'
                    : 'border-stone-700 bg-stone-900 hover:border-stone-500 hover:bg-stone-800'
                }
                ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Selection indicator */}
              {selected === archetype.id && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              <div className="text-3xl mb-3">{archetype.emoji}</div>
              <h3 className="text-white font-semibold text-lg mb-1">{archetype.label}</h3>
              <p className="text-stone-400 text-sm leading-relaxed">{archetype.description}</p>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

        {/* Confirm Button */}
        <div className="flex justify-center">
          <button
            onClick={handleConfirm}
            disabled={!selected || isPending}
            className={`
              px-8 py-3 rounded-lg font-semibold text-base transition-all duration-200
              ${
                selected && !isPending
                  ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-500/25'
                  : 'bg-stone-700 text-stone-400 cursor-not-allowed'
              }
            `}
          >
            {isPending ? 'Setting up your portal...' : 'Set Up My Portal'}
          </button>
        </div>

        {/* Nothing locked out reassurance */}
        <p className="text-stone-600 text-xs text-center mt-6">
          Nothing is locked out. Every feature ChefFlow has is available to you - this just tailors
          your sidebar so you see what matters most.
        </p>
      </div>
    </div>
  )
}
