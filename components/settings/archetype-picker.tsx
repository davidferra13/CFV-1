'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ARCHETYPES } from '@/lib/archetypes/presets'
import type { ArchetypeId } from '@/lib/archetypes/presets'
import {
  selectArchetype,
  saveCustomNavDefault,
  restoreCustomNavDefault,
} from '@/lib/archetypes/actions'

export function ArchetypePicker({
  currentArchetype,
  hasCustomDefault,
}: {
  currentArchetype: ArchetypeId | null
  hasCustomDefault: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const router = useRouter()

  function handleSelectArchetype(id: ArchetypeId) {
    setMessage(null)
    startTransition(async () => {
      try {
        await selectArchetype(id)
        setMessage({
          text: `Switched to ${ARCHETYPES.find((a) => a.id === id)?.label} layout`,
          type: 'success',
        })
        router.refresh()
      } catch {
        setMessage({ text: 'Failed to switch layout. Please try again.', type: 'error' })
      }
    })
  }

  function handleSaveCustom() {
    setMessage(null)
    startTransition(async () => {
      try {
        await saveCustomNavDefault()
        setMessage({
          text: 'Your current layout has been saved as your custom default',
          type: 'success',
        })
        router.refresh()
      } catch {
        setMessage({ text: 'Failed to save custom default.', type: 'error' })
      }
    })
  }

  function handleRestoreCustom() {
    setMessage(null)
    startTransition(async () => {
      try {
        await restoreCustomNavDefault()
        setMessage({ text: 'Restored your saved custom layout', type: 'success' })
        router.refresh()
      } catch {
        setMessage({ text: 'Failed to restore custom default.', type: 'error' })
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Section: Archetype Presets */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Portal Layout Presets</h3>
        <p className="text-sm text-stone-400 mb-4">
          Switch your entire navigation layout to match your chef type. Nothing is locked out — this
          just rearranges what you see by default.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ARCHETYPES.map((archetype) => {
            const isActive = currentArchetype === archetype.id
            return (
              <button
                key={archetype.id}
                onClick={() => handleSelectArchetype(archetype.id)}
                disabled={isPending}
                className={`
                  p-4 rounded-lg border text-left transition-all duration-200
                  ${
                    isActive
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-stone-700 bg-stone-800/50 hover:border-stone-500'
                  }
                  ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{archetype.emoji}</span>
                  <span className="text-white font-medium">{archetype.label}</span>
                  {isActive && (
                    <span className="ml-auto text-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-stone-400 text-xs">{archetype.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Section: Custom Default */}
      <div className="border-t border-stone-700 pt-6">
        <h3 className="text-lg font-semibold text-white mb-1">Custom Default</h3>
        <p className="text-sm text-stone-400 mb-4">
          Made your nav exactly how you like it? Save it as your personal default so you can always
          get back to it.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSaveCustom}
            disabled={isPending}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              bg-stone-700 text-white hover:bg-stone-600
              ${isPending ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            Save Current Layout as My Default
          </button>

          {hasCustomDefault && (
            <button
              onClick={handleRestoreCustom}
              disabled={isPending}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all
                bg-stone-800 text-stone-300 hover:bg-stone-700 border border-stone-600
                ${isPending ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              Restore My Saved Default
            </button>
          )}
        </div>
      </div>

      {/* Feedback message */}
      {message && (
        <div
          className={`
            p-3 rounded-lg text-sm
            ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : ''}
            ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : ''}
          `}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
