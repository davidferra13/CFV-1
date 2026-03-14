'use client'

import { useState, useTransition, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, AlertCircle } from '@/components/ui/icons'
import { setSplitBilling } from '@/lib/operations/split-billing-actions'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
  id: string
  name: string
}

interface SplitEntry {
  clientId: string
  percentage: number
  amountCents: number
}

interface SplitBillingFormProps {
  eventId: string
  totalCents: number
  clients: Client[]
  currentSplits?: SplitEntry[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SplitBillingForm({
  eventId,
  totalCents,
  clients,
  currentSplits,
}: SplitBillingFormProps) {
  const [isPending, startTransition] = useTransition()

  const defaultSplits: SplitEntry[] =
    currentSplits && currentSplits.length > 0
      ? currentSplits
      : clients.length > 0
        ? [{ clientId: clients[0].id, percentage: 100, amountCents: totalCents }]
        : []

  const [splits, setSplits] = useState<SplitEntry[]>(defaultSplits)

  // Derived calculations
  const totalPercentage = useMemo(() => splits.reduce((sum, s) => sum + s.percentage, 0), [splits])

  const isValid =
    totalPercentage === 100 &&
    splits.length > 0 &&
    splits.every((s) => s.clientId && s.percentage > 0)

  function recalculateAmounts(updatedSplits: SplitEntry[]): SplitEntry[] {
    return updatedSplits.map((s) => ({
      ...s,
      amountCents: Math.round((s.percentage / 100) * totalCents),
    }))
  }

  function handleAddPayer() {
    const usedClientIds = splits.map((s) => s.clientId)
    const availableClient = clients.find((c) => !usedClientIds.includes(c.id))
    if (!availableClient) {
      toast.error('All clients have been added')
      return
    }

    const updated = [...splits, { clientId: availableClient.id, percentage: 0, amountCents: 0 }]
    setSplits(updated)
  }

  function handleRemovePayer(index: number) {
    const updated = splits.filter((_, i) => i !== index)
    setSplits(recalculateAmounts(updated))
  }

  function handleClientChange(index: number, clientId: string) {
    const updated = splits.map((s, i) => (i === index ? { ...s, clientId } : s))
    setSplits(updated)
  }

  function handlePercentageChange(index: number, value: string) {
    const percentage = Math.max(0, Math.min(100, parseFloat(value) || 0))
    const updated = splits.map((s, i) => (i === index ? { ...s, percentage } : s))
    setSplits(recalculateAmounts(updated))
  }

  function handleEvenSplit() {
    if (splits.length === 0) return
    const evenPct = Math.floor(100 / splits.length)
    const remainder = 100 - evenPct * splits.length
    const updated = splits.map((s, i) => ({
      ...s,
      percentage: evenPct + (i === 0 ? remainder : 0),
    }))
    setSplits(recalculateAmounts(updated))
  }

  function handleSave() {
    if (!isValid) {
      toast.error('Percentages must total 100%')
      return
    }

    startTransition(async () => {
      try {
        await setSplitBilling(eventId, splits)
        toast.success('Split billing saved')
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to save split billing'
        toast.error(message)
      }
    })
  }

  function getClientName(clientId: string): string {
    return clients.find((c) => c.id === clientId)?.name || 'Unknown'
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Split Billing</CardTitle>
          <p className="text-sm text-stone-500 mt-1">
            Total:{' '}
            <span className="font-medium text-stone-100">${(totalCents / 100).toFixed(2)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={handleEvenSplit}>
            Even Split
          </Button>
          <Button size="sm" variant="ghost" onClick={handleAddPayer}>
            <Plus className="h-4 w-4 mr-1" />
            Add Payer
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payer rows */}
        {splits.map((split, index) => {
          const usedClientIds = splits.filter((_, i) => i !== index).map((s) => s.clientId)
          const availableClients = clients.filter(
            (c) => c.id === split.clientId || !usedClientIds.includes(c.id)
          )

          return (
            <div
              key={index}
              className="flex items-center gap-3 rounded-lg border border-stone-700 p-3"
            >
              {/* Client select */}
              <div className="flex-1">
                <select
                  value={split.clientId}
                  onChange={(e) => handleClientChange(index, e.target.value)}
                  className="w-full border border-stone-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {availableClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Percentage input */}
              <div className="w-28">
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={split.percentage}
                    onChange={(e) => handlePercentageChange(index, e.target.value)}
                    className="w-full border border-stone-600 rounded-lg px-3 py-2 pr-8 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                    %
                  </span>
                </div>
              </div>

              {/* Calculated amount */}
              <div className="w-28 text-right">
                <p className="text-sm font-medium text-stone-100">
                  ${(split.amountCents / 100).toFixed(2)}
                </p>
              </div>

              {/* Remove button */}
              {splits.length > 1 && (
                <button
                  onClick={() => handleRemovePayer(index)}
                  className="p-1.5 rounded text-stone-400 hover:text-red-500 hover:bg-stone-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )
        })}

        {/* Total indicator */}
        <div
          className={`flex items-center justify-between rounded-lg p-3 ${
            totalPercentage === 100
              ? 'bg-emerald-950 border border-emerald-200'
              : 'bg-red-950 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {totalPercentage !== 100 && <AlertCircle className="h-4 w-4 text-red-500" />}
            <span
              className={`text-sm font-medium ${
                totalPercentage === 100 ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              Total: {totalPercentage}%
            </span>
          </div>
          <span
            className={`text-sm font-medium ${
              totalPercentage === 100 ? 'text-emerald-700' : 'text-red-700'
            }`}
          >
            ${(splits.reduce((sum, s) => sum + s.amountCents, 0) / 100).toFixed(2)}
            {totalPercentage !== 100 && ` of $${(totalCents / 100).toFixed(2)}`}
          </span>
        </div>

        {/* Save button */}
        <Button onClick={handleSave} loading={isPending} disabled={!isValid}>
          Save Split Billing
        </Button>
      </CardContent>
    </Card>
  )
}
