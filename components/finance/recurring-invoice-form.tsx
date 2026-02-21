'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  createRecurringInvoice,
  pauseRecurringInvoice,
  type RecurringInvoice,
} from '@/lib/finance/recurring-invoice-actions'
import { RefreshCw, Plus, Pause } from 'lucide-react'

type Client = { id: string; full_name: string }

type Props = {
  initialInvoices: RecurringInvoice[]
  clients: Client[]
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export function RecurringInvoiceForm({ initialInvoices, clients }: Props) {
  const [invoices, setInvoices] = useState(initialInvoices)
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({
    clientId: '',
    frequency: 'monthly' as 'weekly' | 'biweekly' | 'monthly' | 'quarterly',
    amountCents: 0,
    description: '',
    nextSendDate: '',
    lateFeeCents: 0,
    lateFeeDays: 30,
  })

  function handleCreate() {
    startTransition(async () => {
      const created = await createRecurringInvoice({
        clientId: form.clientId,
        frequency: form.frequency,
        amountCents: form.amountCents,
        description: form.description || undefined,
        nextSendDate: form.nextSendDate,
        lateFeeCents: form.lateFeeCents,
        lateFeeDays: form.lateFeeDays,
      })
      setInvoices((prev) => [created, ...prev])
      setShowCreate(false)
      setForm({ clientId: '', frequency: 'monthly', amountCents: 0, description: '', nextSendDate: '', lateFeeCents: 0, lateFeeDays: 30 })
    })
  }

  function handlePause(id: string) {
    startTransition(async () => {
      await pauseRecurringInvoice(id)
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, isActive: false } : inv)))
    })
  }

  const totalMonthlyCents = invoices
    .filter((i) => i.isActive)
    .reduce((sum, i) => {
      const multiplier = { weekly: 4.33, biweekly: 2.17, monthly: 1, quarterly: 0.33 }
      return sum + Math.round(i.amountCents * (multiplier[i.frequency] || 1))
    }, 0)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Active Invoices</p>
            <p className="text-2xl font-semibold text-stone-900">{invoices.filter((i) => i.isActive).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Est. Monthly Revenue</p>
            <p className="text-2xl font-semibold text-emerald-600">{formatCents(totalMonthlyCents)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Total</p>
            <p className="text-2xl font-semibold text-stone-600">{invoices.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          New Recurring Invoice
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="border-stone-300">
          <CardHeader className="py-3">
            <CardTitle className="text-base">New Recurring Invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Client</label>
              <select
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
                <option value="">Select client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Frequency</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as any })}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
              >
                {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <Input
              label="Amount ($)"
              type="number"
              min="0"
              step="0.01"
              value={(form.amountCents / 100).toString()}
              onChange={(e) => setForm({ ...form, amountCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
            />
            <Input
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g., Weekly meal prep service"
            />
            <Input
              label="Next Send Date"
              type="date"
              value={form.nextSendDate}
              onChange={(e) => setForm({ ...form, nextSendDate: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Late Fee ($)"
                type="number"
                min="0"
                step="0.01"
                value={(form.lateFeeCents / 100).toString()}
                onChange={(e) => setForm({ ...form, lateFeeCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
              />
              <Input
                label="Late After (days)"
                type="number"
                min="0"
                value={form.lateFeeDays.toString()}
                onChange={(e) => setForm({ ...form, lateFeeDays: parseInt(e.target.value || '0') })}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleCreate} loading={isPending} disabled={!form.clientId || !form.nextSendDate}>
                Create
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice List */}
      <div className="space-y-3">
        {invoices.map((inv) => (
          <Card key={inv.id} className={!inv.isActive ? 'opacity-60' : ''}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-stone-400" />
                    <span className="text-sm font-medium text-stone-900">
                      {inv.clientName || 'Client'}
                    </span>
                    <Badge variant={inv.isActive ? 'success' : 'default'}>
                      {inv.isActive ? FREQUENCY_LABELS[inv.frequency] : 'Paused'}
                    </Badge>
                  </div>
                  <p className="text-sm text-stone-600 mt-0.5">{formatCents(inv.amountCents)}</p>
                  {inv.description && <p className="text-xs text-stone-500">{inv.description}</p>}
                  <p className="text-xs text-stone-400 mt-1">
                    Next: {inv.nextSendDate}
                    {inv.lastSentAt && ` · Last: ${new Date(inv.lastSentAt).toLocaleDateString()}`}
                  </p>
                </div>
                {inv.isActive && (
                  <Button size="sm" variant="ghost" onClick={() => handlePause(inv.id)} disabled={isPending}>
                    <Pause className="h-3.5 w-3.5" />
                    Pause
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
