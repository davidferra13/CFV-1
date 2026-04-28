'use client'

// GratuitySettings
// Lets the chef configure how gratuity/service charges appear on proposals and quotes.
// Four modes: discretionary (default), auto service fee, included in rate, none.

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { updateGratuitySettings } from '@/lib/chef/gratuity-actions'
import {
  defaultGratuityDisplayLabel,
  validateClientEnteredGratuityPercent,
  type GratuitySettings as GratuitySettingsType,
} from '@/lib/chef/gratuity-types'

const MODES: Array<{
  value: GratuitySettingsType['gratuity_mode']
  label: string
  description: string
}> = [
  {
    value: 'discretionary',
    label: 'Discretionary',
    description: 'Client decides the gratuity amount. Use a clear optional label.',
  },
  {
    value: 'auto_service_fee',
    label: 'Automatic service fee',
    description: 'A fixed percentage is added to the total. Quote shows the line item.',
  },
  {
    value: 'included_in_rate',
    label: 'Included in my rate',
    description: 'No separate line item. Quote says service is all-inclusive.',
  },
  {
    value: 'none',
    label: 'No gratuity',
    description: "Don't mention gratuity on proposals at all.",
  },
]

interface Props {
  initialSettings: GratuitySettingsType
}

export function GratuitySettings({ initialSettings }: Props) {
  const [mode, setMode] = useState(initialSettings.gratuity_mode)
  const [pct, setPct] = useState(
    initialSettings.gratuity_service_fee_pct != null
      ? String(initialSettings.gratuity_service_fee_pct)
      : ''
  )
  const [label, setLabel] = useState(initialSettings.gratuity_display_label ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    setSaved(false)

    let serviceFeePct: number | null = null
    if (mode === 'auto_service_fee') {
      const validatedPct = validateClientEnteredGratuityPercent(pct)

      if (!validatedPct.valid) {
        setError(validatedPct.error)
        return
      }

      serviceFeePct = validatedPct.value
    }

    setSaving(true)
    try {
      const result = await updateGratuitySettings({
        gratuity_mode: mode,
        gratuity_service_fee_pct: serviceFeePct,
        gratuity_display_label:
          (mode === 'auto_service_fee' || mode === 'discretionary') && label.trim()
            ? label.trim()
            : null,
      })

      if (!result.success) {
        setError(result.error ?? 'Failed to save gratuity settings')
        return
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save gratuity settings')
    } finally {
      setSaving(false)
    }
  }

  const previewLabel = label.trim()
    ? label.trim()
    : defaultGratuityDisplayLabel(mode, mode === 'auto_service_fee' ? pct : null)

  const showLabelField = mode === 'auto_service_fee' || mode === 'discretionary'

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {MODES.map((m) => (
          <label
            key={m.value}
            className={`flex items-start gap-3 cursor-pointer rounded-lg border p-3 transition-colors ${
              mode === m.value
                ? 'border-brand-400 bg-brand-950/60'
                : 'border-stone-700 hover:bg-stone-800'
            }`}
          >
            <input
              type="radio"
              name="gratuity_mode"
              value={m.value}
              checked={mode === m.value}
              onChange={() => setMode(m.value)}
              className="mt-0.5 accent-brand-600"
            />
            <div>
              <p className="text-sm font-medium text-stone-100">{m.label}</p>
              <p className="text-xs text-stone-500 mt-0.5">{m.description}</p>
            </div>
          </label>
        ))}
      </div>

      {showLabelField && (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-3 space-y-3">
          <div className="flex items-center gap-3">
            {mode === 'auto_service_fee' && (
              <div className="flex-1">
                <label className="block text-xs font-medium text-stone-400 mb-1">
                  Service fee percentage
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={pct}
                    onChange={(e) => setPct(e.target.value)}
                    placeholder="20"
                    min="0"
                    max="100"
                    step="0.5"
                    className="w-24 border border-stone-600 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  />
                  <span className="text-sm text-stone-500">%</span>
                </div>
              </div>
            )}
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-400 mb-1">
                Display label on quote
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={defaultGratuityDisplayLabel(mode, pct)}
                maxLength={80}
                className="w-full border border-stone-600 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>
          </div>
          {(mode === 'discretionary' || pct) && (
            <p className="text-xs text-stone-500">
              Quote will show:{' '}
              <span className="font-medium text-stone-300">&ldquo;{previewLabel}&rdquo;</span>
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button variant="primary" size="sm" onClick={handleSave} loading={saving} disabled={saving}>
        {saved ? 'Saved' : 'Save Gratuity Settings'}
      </Button>
    </div>
  )
}
