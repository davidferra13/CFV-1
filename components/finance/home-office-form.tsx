'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { saveHomeOfficeSettings, type HomeOfficeSettings } from '@/lib/tax/home-office-actions'
import {
  SIMPLIFIED_MAX_SQFT,
  SIMPLIFIED_MAX_DEDUCTION_CENTS,
} from '@/lib/tax/home-office-constants'
import { Home, Info, CheckCircle } from 'lucide-react'

type Props = {
  taxYear: number
  settings: HomeOfficeSettings | null
  simplifiedDeductionCents: number
  actualDeductionCents: number
  recommendedMethod: 'simplified' | 'actual'
  sqftPercentage: number
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export function HomeOfficeForm({
  taxYear,
  settings,
  simplifiedDeductionCents: initialSimplified,
  actualDeductionCents: initialActual,
  recommendedMethod,
  sqftPercentage: initialSqftPct,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    homeDeductionMethod: settings?.homeDeductionMethod ?? 'simplified',
    homeOfficeSqft: settings?.homeOfficeSqft ?? (null as number | null),
    homeTotalSqft: settings?.homeTotalSqft ?? (null as number | null),
    annualRentMortgageCents: settings?.annualRentMortgageCents ?? (null as number | null),
    annualUtilitiesCents: settings?.annualUtilitiesCents ?? (null as number | null),
    annualInsuranceHomeCents: settings?.annualInsuranceHomeCents ?? (null as number | null),
    annualRepairsCents: settings?.annualRepairsCents ?? (null as number | null),
    homeOfficeNotes: settings?.homeOfficeNotes ?? '',
  })

  // Live calculation
  const officeSqft = form.homeOfficeSqft ?? 0
  const totalSqft = form.homeTotalSqft ?? 0
  const sqftPct = totalSqft > 0 ? officeSqft / totalSqft : 0

  const effectiveSqft = Math.min(officeSqft, SIMPLIFIED_MAX_SQFT)
  const simplifiedLive = Math.min(effectiveSqft * 500, SIMPLIFIED_MAX_DEDUCTION_CENTS)

  const totalHomeExpenses =
    (form.annualRentMortgageCents ?? 0) +
    (form.annualUtilitiesCents ?? 0) +
    (form.annualInsuranceHomeCents ?? 0) +
    (form.annualRepairsCents ?? 0)
  const actualLive = Math.round(totalHomeExpenses * sqftPct)

  const selectedDeduction = form.homeDeductionMethod === 'actual' ? actualLive : simplifiedLive

  function handleSave() {
    startTransition(async () => {
      await saveHomeOfficeSettings({
        taxYear,
        homeDeductionMethod: form.homeDeductionMethod as 'simplified' | 'actual',
        homeOfficeSqft: form.homeOfficeSqft,
        homeTotalSqft: form.homeTotalSqft,
        annualRentMortgageCents: form.annualRentMortgageCents,
        annualUtilitiesCents: form.annualUtilitiesCents,
        annualInsuranceHomeCents: form.annualInsuranceHomeCents,
        annualRepairsCents: form.annualRepairsCents,
        homeOfficeNotes: form.homeOfficeNotes || null,
      })
      setSaved(true)
    })
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-950">
        <CardContent className="py-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-800">
              The home office deduction is a <strong>Schedule C, Line 30</strong> deduction. Your
              home office must be used regularly and exclusively for business. Consult your
              accountant to confirm eligibility.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Side-by-side method comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          className={`cursor-pointer border-2 transition-colors ${form.homeDeductionMethod === 'simplified' ? 'border-stone-900' : 'border-stone-700 hover:border-stone-400'}`}
          onClick={() => setForm({ ...form, homeDeductionMethod: 'simplified' })}
        >
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-stone-100">Simplified Method</p>
              {recommendedMethod === 'simplified' && <Badge variant="success">Recommended</Badge>}
            </div>
            <p className="text-xs text-stone-500 mb-3">
              $5/sq ft, max {SIMPLIFIED_MAX_SQFT} sq ft = max $1,500/yr
            </p>
            <p className="text-3xl font-bold text-stone-100">{formatCents(simplifiedLive)}</p>
            {officeSqft > 0 && (
              <p className="text-xs text-stone-400 mt-1">
                {Math.min(officeSqft, SIMPLIFIED_MAX_SQFT)} sq ft × $5.00
              </p>
            )}
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer border-2 transition-colors ${form.homeDeductionMethod === 'actual' ? 'border-stone-900' : 'border-stone-700 hover:border-stone-400'}`}
          onClick={() => setForm({ ...form, homeDeductionMethod: 'actual' })}
        >
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-stone-100">Actual Expenses Method</p>
              {recommendedMethod === 'actual' && <Badge variant="success">Recommended</Badge>}
            </div>
            <p className="text-xs text-stone-500 mb-3">Office % × total home expenses</p>
            <p className="text-3xl font-bold text-stone-100">{formatCents(actualLive)}</p>
            {sqftPct > 0 && (
              <p className="text-xs text-stone-400 mt-1">
                {(sqftPct * 100).toFixed(1)}% × {formatCents(totalHomeExpenses)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-950 rounded-lg px-3 py-2">
          <CheckCircle className="h-4 w-4" />
          Settings saved. Deduction: {formatCents(selectedDeduction)} using{' '}
          {form.homeDeductionMethod} method.
        </div>
      )}

      {/* Square Footage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Home className="h-4 w-4 text-stone-400" />
            Square Footage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Home Office Square Footage"
              type="number"
              min="0"
              value={form.homeOfficeSqft?.toString() ?? ''}
              onChange={(e) =>
                setForm({ ...form, homeOfficeSqft: parseInt(e.target.value || '0', 10) || null })
              }
              placeholder="e.g., 120"
            />
            <Input
              label="Total Home Square Footage"
              type="number"
              min="0"
              value={form.homeTotalSqft?.toString() ?? ''}
              onChange={(e) =>
                setForm({ ...form, homeTotalSqft: parseInt(e.target.value || '0', 10) || null })
              }
              placeholder="e.g., 1500"
            />
          </div>
          {sqftPct > 0 && (
            <p className="text-sm text-stone-400">
              Office percentage: <strong>{(sqftPct * 100).toFixed(1)}%</strong>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Actual Expenses (only shown when actual method selected) */}
      {form.homeDeductionMethod === 'actual' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Annual Home Expenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-stone-500">
              Enter annual totals. Only the office percentage ({(sqftPct * 100).toFixed(1)}%) will
              be deductible.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Rent or Mortgage Interest ($)"
                type="number"
                min="0"
                step="0.01"
                value={
                  form.annualRentMortgageCents
                    ? (form.annualRentMortgageCents / 100).toString()
                    : ''
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    annualRentMortgageCents:
                      Math.round(parseFloat(e.target.value || '0') * 100) || null,
                  })
                }
              />
              <Input
                label="Utilities ($)"
                type="number"
                min="0"
                step="0.01"
                value={
                  form.annualUtilitiesCents ? (form.annualUtilitiesCents / 100).toString() : ''
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    annualUtilitiesCents:
                      Math.round(parseFloat(e.target.value || '0') * 100) || null,
                  })
                }
              />
              <Input
                label="Home Insurance ($)"
                type="number"
                min="0"
                step="0.01"
                value={
                  form.annualInsuranceHomeCents
                    ? (form.annualInsuranceHomeCents / 100).toString()
                    : ''
                }
                onChange={(e) =>
                  setForm({
                    ...form,
                    annualInsuranceHomeCents:
                      Math.round(parseFloat(e.target.value || '0') * 100) || null,
                  })
                }
              />
              <Input
                label="Repairs & Maintenance ($)"
                type="number"
                min="0"
                step="0.01"
                value={form.annualRepairsCents ? (form.annualRepairsCents / 100).toString() : ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    annualRepairsCents: Math.round(parseFloat(e.target.value || '0') * 100) || null,
                  })
                }
              />
            </div>
            {totalHomeExpenses > 0 && (
              <div className="bg-stone-800 rounded-lg px-3 py-2 text-sm">
                <span className="text-stone-400">Total home expenses: </span>
                <strong>{formatCents(totalHomeExpenses)}</strong>
                <span className="text-stone-500"> × {(sqftPct * 100).toFixed(1)}% = </span>
                <strong className="text-emerald-700">{formatCents(actualLive)} deductible</strong>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Input
        label="Notes (optional)"
        value={form.homeOfficeNotes}
        onChange={(e) => setForm({ ...form, homeOfficeNotes: e.target.value })}
        placeholder="e.g., Dedicated office room, computer desk only, etc."
      />

      <Button onClick={handleSave} loading={isPending}>
        Save Home Office Settings
      </Button>
    </div>
  )
}
