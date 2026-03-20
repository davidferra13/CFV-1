'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateChefPreferences } from '@/lib/chef/actions'
import type { MenuEngineFeatures, MenuEngineFeatureKey } from '@/lib/scheduling/types'
import { MENU_ENGINE_FEATURE_KEYS, MENU_ENGINE_FEATURE_LABELS } from '@/lib/scheduling/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmModal } from '@/components/ui/confirm-modal'

export function MenuEngineForm({ initialFeatures }: { initialFeatures: MenuEngineFeatures }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [features, setFeatures] = useState<MenuEngineFeatures>({ ...initialFeatures })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)

  const toggle = (key: MenuEngineFeatureKey) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }))
    setSuccess(false)
    setError(null)
  }

  const enableAll = () => {
    const all: MenuEngineFeatures = {} as MenuEngineFeatures
    for (const key of MENU_ENGINE_FEATURE_KEYS) all[key] = true
    setFeatures(all)
    setSuccess(false)
    setError(null)
  }

  const disableAll = () => {
    const all: MenuEngineFeatures = {} as MenuEngineFeatures
    for (const key of MENU_ENGINE_FEATURE_KEYS) all[key] = false
    setFeatures(all)
    setSuccess(false)
    setError(null)
  }

  const enabledCount = MENU_ENGINE_FEATURE_KEYS.filter((k) => features[k]).length

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        await updateChefPreferences({ menu_engine_features: features })
        setSuccess(true)
        router.refresh()
      } catch (err) {
        console.error('[MenuEngineForm] Save failed:', err)
        setError('Failed to save menu engine settings. Please try again.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-400">
          {enabledCount} of {MENU_ENGINE_FEATURE_KEYS.length} features enabled
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={enableAll}
            className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
          >
            Enable all
          </button>
          <span className="text-stone-600">|</span>
          <button
            type="button"
            onClick={() => setShowDisableConfirm(true)}
            className="text-xs text-stone-500 hover:text-stone-400 transition-colors"
          >
            Disable all
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {MENU_ENGINE_FEATURE_KEYS.map((key) => {
          const meta = MENU_ENGINE_FEATURE_LABELS[key]
          const enabled = features[key]

          return (
            <Card
              key={key}
              className={`transition-colors ${
                enabled
                  ? 'border-stone-700 bg-stone-800/50'
                  : 'border-stone-800 bg-stone-900/30 opacity-60'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-200">{meta.label}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{meta.description}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => toggle(key)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900 ${
                      enabled ? 'bg-brand-600' : 'bg-stone-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="text-sm text-emerald-300">Settings saved.</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <ConfirmModal
        open={showDisableConfirm}
        title="Disable all menu intelligence?"
        description="This will turn off all features including allergen validation (food safety). You can re-enable them individually at any time."
        confirmLabel="Disable All"
        variant="danger"
        onConfirm={() => {
          disableAll()
          setShowDisableConfirm(false)
        }}
        onCancel={() => setShowDisableConfirm(false)}
      />
    </form>
  )
}
