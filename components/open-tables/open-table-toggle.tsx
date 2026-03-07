'use client'

import { useState, useTransition } from 'react'
import { toggleOpenTable } from '@/lib/hub/open-table-actions'

interface Props {
  isEnabled: boolean
  displayArea?: string
  onToggled?: (enabled: boolean) => void
}

/**
 * The weighted Open Tables toggle. Visually distinct from other settings.
 * Turning ON requires confirmation. Turning OFF is instant.
 */
export function OpenTableToggle({ isEnabled, displayArea, onToggled }: Props) {
  const [enabled, setEnabled] = useState(isEnabled)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form state for enabling
  const [form, setForm] = useState({
    display_area: displayArea || '',
    display_vibe: [] as string[],
    open_seats: 4,
    description: '',
  })

  const vibeOptions = [
    'casual',
    'upscale',
    'family-friendly',
    '21+',
    'outdoors',
    'intimate',
    'lively',
    'themed',
    'wine-focused',
    'plant-based',
  ]

  function handleToggleClick() {
    if (enabled) {
      // Turning OFF: instant, no confirmation
      const previous = enabled
      setEnabled(false)
      startTransition(async () => {
        try {
          await toggleOpenTable(false)
          onToggled?.(false)
        } catch {
          setEnabled(previous)
        }
      })
    } else {
      // Turning ON: show confirmation first
      setShowConfirm(true)
    }
  }

  function handleConfirmGoDiscoverable() {
    setShowConfirm(false)
    setShowForm(true)
  }

  function handleSubmitForm() {
    if (!form.display_area) return

    const previous = enabled
    setEnabled(true)
    setShowForm(false)

    startTransition(async () => {
      try {
        await toggleOpenTable(true, {
          display_area: form.display_area,
          display_vibe: form.display_vibe,
          open_seats: form.open_seats,
          description: form.description || undefined,
        })
        onToggled?.(true)
      } catch (err) {
        setEnabled(previous)
        alert(err instanceof Error ? err.message : 'Failed to enable')
      }
    })
  }

  function toggleVibe(v: string) {
    setForm((f) => ({
      ...f,
      display_vibe: f.display_vibe.includes(v)
        ? f.display_vibe.filter((x) => x !== v)
        : [...f.display_vibe, v],
    }))
  }

  return (
    <>
      {/* The weighted toggle row */}
      <div className="relative rounded-xl border-2 border-amber-500/30 bg-amber-500/5 p-4 mt-6">
        <div className="absolute -top-2.5 left-4 px-2 bg-stone-800 text-xs text-amber-400 font-medium">
          Social Discovery
        </div>
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-4">
            <h3 className="text-stone-100 font-medium">Open Tables</h3>
            <p className="text-sm text-stone-400 mt-0.5">
              Make your dinner circle discoverable to other foodies in your chef's network
            </p>
          </div>
          <button
            onClick={handleToggleClick}
            disabled={isPending}
            className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
              enabled ? 'bg-emerald-500' : 'bg-stone-600'
            } ${isPending ? 'opacity-50' : ''}`}
            role="switch"
            aria-checked={enabled}
            aria-label="Toggle Open Tables discovery"
          >
            <div
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        {enabled && (
          <div className="mt-3 pt-3 border-t border-amber-500/20">
            <p className="text-xs text-emerald-400">
              Your dinner circle is discoverable. Other foodies can find and request to join.
            </p>
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-stone-800 border border-stone-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-xl font-display text-stone-100 text-center mb-4">
              Make your dinner circle discoverable?
            </h2>

            <p className="text-sm text-stone-300 text-center mb-5">
              Other foodies in your chef's network will be able to see that your circle exists. They
              can request to join, but your chef reviews every request before anyone is introduced.
            </p>

            <div className="space-y-3 mb-5">
              <div className="bg-stone-700/50 rounded-lg p-3">
                <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">
                  What people will see
                </h4>
                <ul className="space-y-1 text-sm text-stone-200">
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">&#10003;</span> Your circle's name and vibe
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">&#10003;</span> General area (neighborhood,
                    never your address)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-emerald-400">&#10003;</span> That seats are available
                  </li>
                </ul>
              </div>

              <div className="bg-stone-700/50 rounded-lg p-3">
                <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">
                  What stays private
                </h4>
                <ul className="space-y-1 text-sm text-stone-300">
                  <li className="flex items-center gap-2">
                    <span className="text-red-400">&#10007;</span> Your name and contact info
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-400">&#10007;</span> Your exact location
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-400">&#10007;</span> Your dietary details and budget
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-3 bg-stone-700 text-stone-200 rounded-lg text-sm font-medium hover:bg-stone-600 transition-colors"
              >
                Keep Private
              </button>
              <button
                onClick={handleConfirmGoDiscoverable}
                className="flex-1 px-4 py-3 bg-brand-600/80 text-white rounded-lg text-sm hover:bg-brand-500 transition-colors"
              >
                Go Discoverable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup form (after confirmation) */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-stone-800 border border-stone-700 rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-display text-stone-100 mb-4">Set up your Open Table</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-stone-300 mb-1">
                  Your area <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.display_area}
                  onChange={(e) => setForm((f) => ({ ...f, display_area: e.target.value }))}
                  placeholder="Back Bay, Boston"
                  className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-stone-100 placeholder-stone-500 text-sm"
                />
                <p className="text-xs text-stone-500 mt-1">
                  Neighborhood or city. Your exact address is never shown.
                </p>
              </div>

              <div>
                <label className="block text-sm text-stone-300 mb-1">Vibe</label>
                <div className="flex flex-wrap gap-2">
                  {vibeOptions.map((v) => (
                    <button
                      key={v}
                      onClick={() => toggleVibe(v)}
                      className={`px-3 py-1 rounded-full text-xs transition-colors ${
                        form.display_vibe.includes(v)
                          ? 'bg-brand-500 text-white'
                          : 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-stone-300 mb-1">Open seats</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={form.open_seats}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, open_seats: parseInt(e.target.value) || 1 }))
                  }
                  className="w-24 px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-stone-100 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-stone-300 mb-1">Description (optional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Looking for fun people who love spooky food and good wine!"
                  maxLength={200}
                  rows={2}
                  className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-stone-100 placeholder-stone-500 text-sm resize-none"
                />
                <p className="text-xs text-stone-500 text-right">{form.description.length}/200</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 bg-stone-700 text-stone-300 rounded-lg text-sm hover:bg-stone-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitForm}
                disabled={!form.display_area || isPending}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Saving...' : 'Open My Table'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
