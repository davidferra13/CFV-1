'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { setVendorPriceAlertThreshold } from '@/lib/vendors/price-insights-actions'

interface VendorPriceAlertSettingsProps {
  vendorId: string
  thresholdPercent: number
}

export function VendorPriceAlertSettings({
  vendorId,
  thresholdPercent,
}: VendorPriceAlertSettingsProps) {
  const router = useRouter()
  const [value, setValue] = useState(String(Number(thresholdPercent.toFixed(2))))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const handleSave = async () => {
    setError(null)
    setSaved(null)
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1000) {
      setError('Enter a threshold between 0 and 1000.')
      return
    }

    setSaving(true)
    try {
      const result = await setVendorPriceAlertThreshold({
        vendorId,
        thresholdPercent: parsed,
      })
      setValue(String(Number(result.thresholdPercent.toFixed(2))))
      setSaved('Saved')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save threshold')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-3 space-y-2">
      <p className="text-xs uppercase tracking-wide text-stone-500">Alert Threshold</p>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,180px),auto] sm:items-end">
        <Input
          label="Min % Change"
          type="number"
          min="0"
          max="1000"
          step="0.1"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          helperText="Only changes at or above this percent appear in alerts."
        />
        <Button size="sm" variant="secondary" onClick={handleSave} loading={saving}>
          Save Threshold
        </Button>
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
      {!error && saved && <p className="text-xs text-emerald-300">{saved}</p>}
    </div>
  )
}
