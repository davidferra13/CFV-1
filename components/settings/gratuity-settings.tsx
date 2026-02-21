'use client'

// GratuitySettings
// Lets the chef configure how gratuity/service charges appear on proposals and quotes.
// Four modes: discretionary (default), auto service fee, included in rate, none.

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { updateGratuitySettings } from '@/lib/chef/gratuity-actions'
import type { GratuitySettings as GratuitySettingsType } from '@/lib/chef/gratuity-actions'

const MODES: Array<{
  value: GratuitySettingsType['gratuity_mode']
  label: string
  description: string
}> = [
  {
    value: 'discretionary',
    label: 'Discretionary',
    description: 'Client decides. Quote will say "Gratuity at your discretion."',
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

  async function handleSave() {
    setSaving(true)
    try {
      await updateGratuitySettings({
        gratuity_mode: mode,
        gratuity_service_fee_pct: mode === 'auto_service_fee' && pct ? parseFloat(pct) : null,
        gratuity_display_label: mode === 'auto_service_fee' && label.trim() ? label.trim() : null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // keep form open
    } finally {
      setSaving(false)
    }
  }

  const previewLabel = label.trim()
    ? label.trim()
    : pct
      ? `${pct}% service charge`
      : 'Service charge'

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {MODES.map((m) => (
          <label
            key={m.value}
            className={`flex items-start gap-3 cursor-pointer rounded-lg border p-3 transition-colors ${
              mode === m.value
                ? 'border-brand-400 bg-brand-50/60'
                : 'border-stone-200 hover:bg-stone-50'
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
              <p className="text-sm font-medium text-stone-900">{m.label}</p>
              <p className="text-xs text-stone-500 mt-0.5">{m.description}</p>
            </div>
          </label>
        ))}
      </div>

      {mode === 'auto_service_fee' && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-3 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-600 mb-1">
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
                  className="w-24 border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                />
                <span className="text-sm text-stone-500">%</span>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-stone-600 mb-1">
                Line item label on quote
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={pct ? `${pct}% service charge` : 'Service charge'}
                className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              />
            </div>
          </div>
          {pct && (
            <p className="text-xs text-stone-500">
              Quote will show:{' '}
              <span className="font-medium text-stone-700">&ldquo;{previewLabel}&rdquo;</span>
            </p>
          )}
        </div>
      )}

      <Button variant="primary" size="sm" onClick={handleSave} loading={saving} disabled={saving}>
        {saved ? 'Saved' : 'Save Gratuity Settings'}
      </Button>
    </div>
  )
}
