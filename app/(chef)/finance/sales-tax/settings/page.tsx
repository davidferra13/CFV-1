'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { saveSalesTaxSettings, getSalesTaxSettings } from '@/lib/finance/sales-tax-actions'
import {
  COMMON_STATE_RATES_BPS,
  FILING_FREQUENCY_LABELS,
  bpsToPercent,
} from '@/lib/finance/sales-tax-constants'
import { CheckCircle } from 'lucide-react'

export default function SalesTaxSettingsPage() {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({
    enabled: false,
    state: '',
    stateRateBps: 0,
    localRateBps: 0,
    registrationNumber: '',
    filingFrequency: 'quarterly' as 'monthly' | 'quarterly' | 'annually',
    notes: '',
  })

  useEffect(() => {
    getSalesTaxSettings().then((s) => {
      if (s) {
        setForm({
          enabled: s.enabled,
          state: s.state ?? '',
          stateRateBps: s.stateRateBps,
          localRateBps: s.localRateBps,
          registrationNumber: s.registrationNumber ?? '',
          filingFrequency: s.filingFrequency,
          notes: s.notes ?? '',
        })
      }
      setLoading(false)
    })
  }, [])

  function handleStateSelect(stateCode: string) {
    const rate = COMMON_STATE_RATES_BPS[stateCode]
    setForm({
      ...form,
      state: stateCode,
      stateRateBps: rate ? rate.rateBps : 0,
    })
  }

  function handleSave() {
    startTransition(async () => {
      await saveSalesTaxSettings({
        enabled: form.enabled,
        state: form.state || null,
        stateRateBps: form.stateRateBps,
        localRateBps: form.localRateBps,
        registrationNumber: form.registrationNumber || null,
        filingFrequency: form.filingFrequency,
        notes: form.notes || null,
      })
      setSaved(true)
    })
  }

  if (loading) {
    return <div className="text-stone-500 text-sm p-4">Loading…</div>
  }

  const combinedRateBps = form.stateRateBps + form.localRateBps

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/sales-tax" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Sales Tax
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Sales Tax Settings</h1>
        <p className="text-stone-500 mt-1">
          Configure your state sales tax rate and collection preferences.
        </p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-950 rounded-lg px-4 py-3">
          <CheckCircle className="h-4 w-4" />
          Settings saved.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sales Tax Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enabled"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="enabled" className="text-sm font-medium text-stone-300">
              Enable sales tax collection
            </label>
          </div>

          {form.enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1.5">State</label>
                <select
                  value={form.state}
                  onChange={(e) => handleStateSelect(e.target.value)}
                  className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
                >
                  <option value="">Select state…</option>
                  {Object.entries(COMMON_STATE_RATES_BPS).map(([code, info]) => (
                    <option key={code} value={code}>
                      {code} — {info.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-stone-400 mt-1">
                  Selecting a state pre-fills the standard state rate. You can override it below.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1.5">
                    State Rate (basis points)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="10000"
                    value={form.stateRateBps}
                    onChange={(e) =>
                      setForm({ ...form, stateRateBps: parseInt(e.target.value || '0', 10) })
                    }
                  />
                  <p className="text-xs text-stone-400 mt-1">
                    {bpsToPercent(form.stateRateBps)} — 625 bps = 6.25%
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-300 mb-1.5">
                    Local/County Rate (basis points)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="10000"
                    value={form.localRateBps}
                    onChange={(e) =>
                      setForm({ ...form, localRateBps: parseInt(e.target.value || '0', 10) })
                    }
                  />
                  <p className="text-xs text-stone-400 mt-1">
                    {bpsToPercent(form.localRateBps)} local
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-stone-700 bg-stone-800 px-4 py-3">
                <p className="text-sm font-medium text-stone-300">
                  Combined Rate:{' '}
                  <span className="text-brand-400 font-bold">{bpsToPercent(combinedRateBps)}</span>
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  On a $2,000 event: tax = ${((2000 * combinedRateBps) / 10000).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1.5">
                  Filing Frequency
                </label>
                <select
                  value={form.filingFrequency}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      filingFrequency: e.target.value as 'monthly' | 'quarterly' | 'annually',
                    })
                  }
                  className="w-full rounded-lg border border-stone-600 px-3 py-2 text-sm"
                >
                  {Object.entries(FILING_FREQUENCY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="State Tax Registration Number"
                value={form.registrationNumber}
                onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })}
                placeholder="Optional — your state sales tax ID"
              />

              <Input
                label="Notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </>
          )}

          <Button onClick={handleSave} loading={isPending}>
            Save Settings
          </Button>
        </CardContent>
      </Card>

      <div className="text-xs text-stone-400 rounded-lg border border-stone-700 bg-stone-800 px-4 py-3">
        <strong>Note:</strong> Sales tax rules vary by state and locality. Consult a tax
        professional to confirm whether your services are taxable in your jurisdiction and at what
        rate. This tool helps you track and record; it does not constitute tax advice.
      </div>
    </div>
  )
}
