'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  addRetirementContribution,
  deleteRetirementContribution,
  addHealthInsurancePremium,
  deleteHealthInsurancePremium,
  type RetirementContribution,
  type HealthInsurancePremium,
} from '@/lib/tax/retirement-actions'
import { ACCOUNT_TYPE_LABELS, PREMIUM_TYPE_LABELS } from '@/lib/tax/retirement-constants'
import { PiggyBank, Heart, Plus, Trash2, Info } from 'lucide-react'

type Props = {
  taxYear: number
  contributions: RetirementContribution[]
  retirementTotalCents: number
  sepIraMaxCents: number
  remainingCapacityCents: number
  premiums: HealthInsurancePremium[]
  healthTotalCents: number
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export function RetirementHealthPanel({
  taxYear,
  contributions: initialContributions,
  retirementTotalCents: initialRetirementTotal,
  sepIraMaxCents,
  remainingCapacityCents: initialRemaining,
  premiums: initialPremiums,
  healthTotalCents: initialHealthTotal,
}: Props) {
  const [contributions, setContributions] = useState(initialContributions)
  const [premiums, setPremiums] = useState(initialPremiums)
  const [isPending, startTransition] = useTransition()

  const [showAddContrib, setShowAddContrib] = useState(false)
  const [showAddPremium, setShowAddPremium] = useState(false)

  const [contribForm, setContribForm] = useState({
    accountType: 'sep_ira' as string,
    contributionCents: 0,
    contributedAt: '',
    notes: '',
  })

  const [premiumForm, setPremiumForm] = useState({
    premiumType: 'self' as string,
    annualPremiumCents: 0,
    notes: '',
  })

  const retirementTotal = contributions.reduce((s, c) => s + c.contributionCents, 0)
  const healthTotal = premiums.reduce((s, p) => s + p.annualPremiumCents, 0)
  const combinedTotal = retirementTotal + healthTotal
  const remaining = Math.max(0, sepIraMaxCents - retirementTotal)

  function handleAddContrib() {
    startTransition(async () => {
      const c = await addRetirementContribution({
        taxYear,
        accountType: contribForm.accountType as any,
        contributionCents: contribForm.contributionCents,
        contributedAt: contribForm.contributedAt || null,
        notes: contribForm.notes || null,
      })
      setContributions((prev) => [...prev, c])
      setShowAddContrib(false)
      setContribForm({ accountType: 'sep_ira', contributionCents: 0, contributedAt: '', notes: '' })
    })
  }

  function handleDeleteContrib(id: string) {
    startTransition(async () => {
      await deleteRetirementContribution(id)
      setContributions((prev) => prev.filter((c) => c.id !== id))
    })
  }

  function handleAddPremium() {
    startTransition(async () => {
      const p = await addHealthInsurancePremium({
        taxYear,
        premiumType: premiumForm.premiumType as any,
        annualPremiumCents: premiumForm.annualPremiumCents,
        notes: premiumForm.notes || null,
      })
      setPremiums((prev) => [...prev, p])
      setShowAddPremium(false)
      setPremiumForm({ premiumType: 'self', annualPremiumCents: 0, notes: '' })
    })
  }

  function handleDeletePremium(id: string) {
    startTransition(async () => {
      await deleteHealthInsurancePremium(id)
      setPremiums((prev) => prev.filter((p) => p.id !== id))
    })
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-800">
              These are <strong>above-the-line deductions</strong> (Schedule 1) that reduce your
              Adjusted Gross Income — separate from Schedule C business expenses. Report them to
              your accountant alongside your Schedule C. They reduce your total tax bill beyond
              Schedule C deductions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Retirement Contributions</p>
            <p className="text-2xl font-semibold text-stone-900">{formatCents(retirementTotal)}</p>
            <p className="text-xs text-stone-400 mt-0.5">Schedule 1, Line 16</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Health Insurance Premiums</p>
            <p className="text-2xl font-semibold text-stone-900">{formatCents(healthTotal)}</p>
            <p className="text-xs text-stone-400 mt-0.5">Schedule 1, Line 17</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Combined Deduction</p>
            <p className="text-2xl font-semibold text-emerald-700">{formatCents(combinedTotal)}</p>
            <p className="text-xs text-stone-400 mt-0.5">Total AGI reduction</p>
          </CardContent>
        </Card>
      </div>

      {/* Retirement Contributions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-stone-400" />
              Retirement Contributions
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setShowAddContrib(true)}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sepIraMaxCents > 0 && (
            <div className="flex items-center justify-between text-sm bg-stone-50 rounded-lg px-3 py-2">
              <span className="text-stone-600">SEP-IRA limit (25% of net SE income)</span>
              <span className="font-medium text-stone-900">{formatCents(sepIraMaxCents)}</span>
            </div>
          )}
          {remaining > 0 && retirementTotal > 0 && (
            <div className="flex items-center justify-between text-sm bg-emerald-50 rounded-lg px-3 py-2">
              <span className="text-emerald-700">Remaining SEP-IRA capacity</span>
              <span className="font-medium text-emerald-800">{formatCents(remaining)}</span>
            </div>
          )}

          {showAddContrib && (
            <div className="border border-stone-200 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Account Type
                </label>
                <select
                  value={contribForm.accountType}
                  onChange={(e) => setContribForm({ ...contribForm, accountType: e.target.value })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                >
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Contribution Amount ($)"
                type="number"
                min="0"
                step="0.01"
                value={(contribForm.contributionCents / 100).toString()}
                onChange={(e) =>
                  setContribForm({
                    ...contribForm,
                    contributionCents: Math.round(parseFloat(e.target.value || '0') * 100),
                  })
                }
              />
              <Input
                label="Date Contributed"
                type="date"
                value={contribForm.contributedAt}
                onChange={(e) => setContribForm({ ...contribForm, contributedAt: e.target.value })}
              />
              <Input
                label="Notes (optional)"
                value={contribForm.notes}
                onChange={(e) => setContribForm({ ...contribForm, notes: e.target.value })}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddContrib} loading={isPending}>
                  Add
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddContrib(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {contributions.length === 0 && !showAddContrib ? (
            <p className="text-sm text-stone-400 text-center py-4">
              No contributions recorded for {taxYear}.
            </p>
          ) : (
            <div className="divide-y divide-stone-100">
              {contributions.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      {ACCOUNT_TYPE_LABELS[c.accountType] || c.accountType}
                    </p>
                    <p className="text-xs text-stone-500">
                      {c.contributedAt || 'Date not recorded'}
                      {c.notes ? ` · ${c.notes}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-stone-900">
                      {formatCents(c.contributionCents)}
                    </p>
                    <button
                      onClick={() => handleDeleteContrib(c.id)}
                      className="text-stone-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health Insurance Premiums */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-stone-400" />
              Self-Employed Health Insurance Premiums
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setShowAddPremium(true)}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAddPremium && (
            <div className="border border-stone-200 rounded-lg p-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Coverage</label>
                <select
                  value={premiumForm.premiumType}
                  onChange={(e) => setPremiumForm({ ...premiumForm, premiumType: e.target.value })}
                  className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
                >
                  {Object.entries(PREMIUM_TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Annual Premium ($)"
                type="number"
                min="0"
                step="0.01"
                value={(premiumForm.annualPremiumCents / 100).toString()}
                onChange={(e) =>
                  setPremiumForm({
                    ...premiumForm,
                    annualPremiumCents: Math.round(parseFloat(e.target.value || '0') * 100),
                  })
                }
              />
              <Input
                label="Notes (optional)"
                value={premiumForm.notes}
                onChange={(e) => setPremiumForm({ ...premiumForm, notes: e.target.value })}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddPremium} loading={isPending}>
                  Add
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowAddPremium(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {premiums.length === 0 && !showAddPremium ? (
            <p className="text-sm text-stone-400 text-center py-4">
              No premiums recorded for {taxYear}.
            </p>
          ) : (
            <div className="divide-y divide-stone-100">
              {premiums.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-stone-900">
                      {PREMIUM_TYPE_LABELS[p.premiumType] || p.premiumType}
                    </p>
                    {p.notes && <p className="text-xs text-stone-500">{p.notes}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-stone-900">
                      {formatCents(p.annualPremiumCents)}
                    </p>
                    <button
                      onClick={() => handleDeletePremium(p.id)}
                      className="text-stone-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
