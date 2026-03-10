'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  calculateTipDistribution,
  saveTipDistribution,
  getTipDistributionHistory,
  type TipPoolConfig,
  type DistributionPreview,
  type TipDistribution as TipDistType,
} from '@/lib/finance/staff-tip-actions'

interface TipDistributionProps {
  poolConfigs: TipPoolConfig[]
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export function TipDistributionPanel({ poolConfigs }: TipDistributionProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedPoolId, setSelectedPoolId] = useState(poolConfigs[0]?.id ?? '')
  const [preview, setPreview] = useState<DistributionPreview[]>([])
  const [history, setHistory] = useState<TipDistType[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const activeConfigs = poolConfigs.filter((c) => c.isActive)

  function handleCalculate() {
    if (!selectedPoolId) return
    setError(null)
    setSuccess(null)

    startTransition(async () => {
      try {
        const result = await calculateTipDistribution(date, selectedPoolId)
        setPreview(result)
        if (result.length === 0) {
          setError('No pool-eligible tips found for this date and pool configuration.')
        }
      } catch (err) {
        setError('Failed to calculate distribution')
        setPreview([])
      }
    })
  }

  function handleSave() {
    if (preview.length === 0 || !selectedPoolId) return

    const distributions = preview.map((p) => ({
      staffMemberId: p.staffMemberId,
      shareCents: p.shareCents,
    }))

    startTransition(async () => {
      try {
        await saveTipDistribution(date, selectedPoolId, distributions)
        setSuccess('Distribution saved successfully.')
        setPreview([])
        setError(null)
      } catch (err) {
        setError('Failed to save distribution')
      }
    })
  }

  function loadHistory() {
    startTransition(async () => {
      try {
        const data = await getTipDistributionHistory(60)
        setHistory(data)
        setShowHistory(true)
        setError(null)
      } catch (err) {
        setError('Failed to load distribution history')
      }
    })
  }

  const totalPool = preview.reduce((s, p) => s + p.shareCents, 0)

  return (
    <div className="space-y-6">
      {/* Distribution Calculator */}
      <Card>
        <CardHeader>
          <CardTitle>Tip Distribution Calculator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeConfigs.length === 0 ? (
            <p className="text-sm text-stone-500">
              No active tip pool configurations. Create one in Pool Settings first.
            </p>
          ) : (
            <>
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-44"
                  />
                </div>
                <div>
                  <Label>Pool Configuration</Label>
                  <select
                    value={selectedPoolId}
                    onChange={(e) => setSelectedPoolId(e.target.value)}
                    className="block w-56 rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200"
                  >
                    {activeConfigs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.poolMethod.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>
                <Button onClick={handleCalculate} disabled={isPending}>
                  Calculate Pool
                </Button>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
              {success && <p className="text-sm text-emerald-400">{success}</p>}
            </>
          )}
        </CardContent>
      </Card>

      {/* Distribution Preview */}
      {preview.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Distribution Preview</CardTitle>
              <Badge variant="info">Total Pool: {formatCurrency(totalPool)}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700">
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                    Staff
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase">
                    Tips Contributed
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase">
                    Hours
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                    Share
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {preview.map((p) => (
                  <tr key={p.staffMemberId} className="hover:bg-stone-800">
                    <td className="px-6 py-3 font-medium text-stone-200">{p.staffName}</td>
                    <td className="px-4 py-3 text-right text-stone-400">
                      {formatCurrency(p.tipContributionCents)}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-400">
                      {p.hoursWorked != null ? `${p.hoursWorked}h` : '-'}
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-emerald-400">
                      {formatCurrency(p.shareCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 border-t border-stone-700">
              <Button onClick={handleSave} disabled={isPending}>
                Confirm and Save Distribution
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      <div>
        <Button variant="secondary" onClick={loadHistory} disabled={isPending}>
          {showHistory ? 'Refresh History' : 'View Distribution History'}
        </Button>
      </div>

      {showHistory && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Distributions (Last 60 Days)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700">
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase">
                    Staff
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase">
                    Method
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                    Share
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {history.map((d) => (
                  <tr key={d.id} className="hover:bg-stone-800">
                    <td className="px-6 py-3 text-stone-300">{d.distributionDate}</td>
                    <td className="px-4 py-3 text-stone-200">{d.staffName ?? 'Unknown'}</td>
                    <td className="px-4 py-3 text-stone-400">{d.methodUsed}</td>
                    <td className="px-6 py-3 text-right font-medium text-stone-100">
                      {formatCurrency(d.shareCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {showHistory && history.length === 0 && (
        <p className="text-sm text-stone-500">No distributions recorded in the last 60 days.</p>
      )}
    </div>
  )
}
