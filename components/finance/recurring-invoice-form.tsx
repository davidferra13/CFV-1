'use client'

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  createRecurringSchedule,
  updateRecurringSchedule,
  pauseRecurringSchedule,
  resumeRecurringSchedule,
  cancelRecurringSchedule,
  generateDueInvoices,
  getRecurringScheduleHistory,
  type RecurringInvoice,
  type RecurringInvoiceHistoryEntry,
} from '@/lib/finance/recurring-invoice-actions'
import { RefreshCw, Plus, Pause, Play, History } from '@/components/ui/icons'
import { toast } from 'sonner'
import { FREQUENCY_LABELS, estimateMonthlyRevenue } from '@/lib/recurring/scheduler'

type Client = { id: string; full_name: string }

type Props = {
  initialInvoices: RecurringInvoice[]
  clients: Client[]
}

const WEEK_DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export function RecurringInvoiceForm({ initialInvoices, clients }: Props) {
  const [invoices, setInvoices] = useState(initialInvoices)
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [history, setHistory] = useState<RecurringInvoiceHistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'cancelled'>('all')

  const [form, setForm] = useState({
    clientId: '',
    name: '',
    frequency: 'monthly' as 'weekly' | 'biweekly' | 'monthly' | 'quarterly',
    amountDollars: '',
    description: '',
    nextSendDate: '',
    dayOfWeek: null as number | null,
    dayOfMonth: null as number | null,
    startDate: '',
    endDate: '',
    isAutopay: false,
    lateFeeDollars: '0',
    lateFeeDays: 30,
  })

  function resetForm() {
    setForm({
      clientId: '',
      name: '',
      frequency: 'monthly',
      amountDollars: '',
      description: '',
      nextSendDate: '',
      dayOfWeek: null,
      dayOfMonth: null,
      startDate: '',
      endDate: '',
      isAutopay: false,
      lateFeeDollars: '0',
      lateFeeDays: 30,
    })
  }

  function handleCreate() {
    const amountCents = Math.round(parseFloat(form.amountDollars || '0') * 100)
    if (amountCents <= 0) {
      toast.error('Amount must be greater than $0')
      return
    }
    if (!form.clientId) {
      toast.error('Please select a client')
      return
    }
    if (!form.nextSendDate) {
      toast.error('Please set the first invoice date')
      return
    }

    const previous = [...invoices]
    startTransition(async () => {
      try {
        const created = await createRecurringSchedule({
          clientId: form.clientId,
          name: form.name || undefined,
          frequency: form.frequency,
          amountCents,
          description: form.description || undefined,
          nextSendDate: form.nextSendDate,
          dayOfWeek: form.dayOfWeek,
          dayOfMonth: form.dayOfMonth,
          startDate: form.startDate || undefined,
          endDate: form.endDate || null,
          isAutopay: form.isAutopay,
          lateFeeCents: Math.round(parseFloat(form.lateFeeDollars || '0') * 100),
          lateFeeDays: form.lateFeeDays,
        })
        setInvoices((prev) => [created, ...prev])
        setShowCreate(false)
        resetForm()
        toast.success('Recurring schedule created')
      } catch (err) {
        setInvoices(previous)
        toast.error('Failed to create recurring schedule')
      }
    })
  }

  function handleUpdate(id: string) {
    const amountCents = Math.round(parseFloat(form.amountDollars || '0') * 100)
    const previous = [...invoices]
    startTransition(async () => {
      try {
        const updated = await updateRecurringSchedule({
          id,
          name: form.name || undefined,
          frequency: form.frequency,
          amountCents: amountCents > 0 ? amountCents : undefined,
          description: form.description || undefined,
          nextSendDate: form.nextSendDate || undefined,
          dayOfWeek: form.dayOfWeek,
          dayOfMonth: form.dayOfMonth,
          endDate: form.endDate || null,
          isAutopay: form.isAutopay,
          lateFeeCents: Math.round(parseFloat(form.lateFeeDollars || '0') * 100),
          lateFeeDays: form.lateFeeDays,
        })
        setInvoices((prev) => prev.map((inv) => (inv.id === id ? updated : inv)))
        setEditingId(null)
        resetForm()
        toast.success('Schedule updated')
      } catch (err) {
        setInvoices(previous)
        toast.error('Failed to update schedule')
      }
    })
  }

  function handlePause(id: string) {
    const previous = [...invoices]
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id ? { ...inv, isActive: false, status: 'paused' as const } : inv
      )
    )
    startTransition(async () => {
      try {
        await pauseRecurringSchedule(id)
        toast.success('Schedule paused')
      } catch (err) {
        setInvoices(previous)
        toast.error('Failed to pause schedule')
      }
    })
  }

  function handleResume(id: string) {
    const previous = [...invoices]
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id ? { ...inv, isActive: true, status: 'active' as const } : inv
      )
    )
    startTransition(async () => {
      try {
        await resumeRecurringSchedule(id)
        toast.success('Schedule resumed')
      } catch (err) {
        setInvoices(previous)
        toast.error('Failed to resume schedule')
      }
    })
  }

  function handleCancel(id: string) {
    if (!confirm('Cancel this recurring schedule permanently? This cannot be undone.')) return
    const previous = [...invoices]
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id ? { ...inv, isActive: false, status: 'cancelled' as const } : inv
      )
    )
    startTransition(async () => {
      try {
        await cancelRecurringSchedule(id)
        toast.success('Schedule cancelled')
      } catch (err) {
        setInvoices(previous)
        toast.error('Failed to cancel schedule')
      }
    })
  }

  function handleGenerateDue() {
    startTransition(async () => {
      try {
        const result = await generateDueInvoices()
        if (result.generated === 0 && result.errors.length === 0) {
          toast.info('No invoices are due right now')
        } else {
          toast.success(
            `Generated ${result.generated} invoice(s). ` +
              (result.autopaySuccesses > 0 ? `${result.autopaySuccesses} autopaid. ` : '') +
              (result.autopayFailures > 0 ? `${result.autopayFailures} payment failures. ` : '') +
              (result.errors.length > 0 ? `${result.errors.length} error(s).` : '')
          )
        }
        // Refresh page data
        window.location.reload()
      } catch (err) {
        toast.error('Failed to generate invoices')
      }
    })
  }

  async function handleViewHistory(scheduleId: string) {
    if (historyId === scheduleId) {
      setHistoryId(null)
      setHistory([])
      return
    }
    setHistoryId(scheduleId)
    setLoadingHistory(true)
    try {
      const entries = await getRecurringScheduleHistory(scheduleId)
      setHistory(entries)
    } catch (err) {
      toast.error('Failed to load history')
      setHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  function startEdit(inv: RecurringInvoice) {
    setEditingId(inv.id)
    setShowCreate(false)
    setForm({
      clientId: inv.clientId,
      name: inv.name || '',
      frequency: inv.frequency,
      amountDollars: (inv.amountCents / 100).toString(),
      description: inv.description || '',
      nextSendDate: inv.nextSendDate || '',
      dayOfWeek: inv.dayOfWeek,
      dayOfMonth: inv.dayOfMonth,
      startDate: inv.startDate || '',
      endDate: inv.endDate || '',
      isAutopay: inv.isAutopay,
      lateFeeDollars: (inv.lateFeeCents / 100).toString(),
      lateFeeDays: inv.lateFeeDays,
    })
  }

  // Filtered invoices
  const filtered = filter === 'all' ? invoices : invoices.filter((i) => i.status === filter)

  // Summary stats
  const activeInvoices = invoices.filter((i) => i.status === 'active')
  const totalMonthlyCents = activeInvoices.reduce(
    (sum, i) => sum + estimateMonthlyRevenue(i.amountCents, i.frequency),
    0
  )

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Active Schedules</p>
            <p className="text-2xl font-semibold text-stone-100">{activeInvoices.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Est. Monthly Revenue</p>
            <p className="text-2xl font-semibold text-emerald-500">
              {formatCents(totalMonthlyCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Due This Week</p>
            <p className="text-2xl font-semibold text-amber-500">
              {
                activeInvoices.filter((i) => {
                  if (!i.nextSendDate) return false
                  const d = new Date(i.nextSendDate)
                  const now = new Date()
                  const weekOut = new Date()
                  weekOut.setDate(weekOut.getDate() + 7)
                  return d >= now && d <= weekOut
                }).length
              }
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Total</p>
            <p className="text-2xl font-semibold text-stone-400">{invoices.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {(['all', 'active', 'paused', 'cancelled'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                filter === f ? 'bg-stone-700 text-stone-100' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={handleGenerateDue} disabled={isPending}>
            <RefreshCw className="h-4 w-4" />
            Generate Due
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setShowCreate(true)
              setEditingId(null)
              resetForm()
            }}
          >
            <Plus className="h-4 w-4" />
            New Schedule
          </Button>
        </div>
      </div>

      {/* Create / Edit Form */}
      {(showCreate || editingId) && (
        <Card className="border-stone-600">
          <CardHeader className="py-3">
            <CardTitle className="text-base">
              {editingId ? 'Edit Schedule' : 'New Recurring Invoice Schedule'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!editingId && (
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1.5">Client</label>
                <select
                  value={form.clientId}
                  onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                  className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                >
                  <option value="">Select client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Input
              label="Schedule Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Weekly Meal Prep"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1.5">Frequency</label>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value as any })}
                  className="w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100"
                >
                  {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Amount ($)"
                type="number"
                min="0"
                step="0.01"
                value={form.amountDollars}
                onChange={(e) => setForm({ ...form, amountDollars: e.target.value })}
                placeholder="500.00"
              />
            </div>

            {/* Day selector based on frequency */}
            {(form.frequency === 'weekly' || form.frequency === 'biweekly') && (
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1.5">
                  Invoice Day
                </label>
                <div className="flex flex-wrap gap-2">
                  {WEEK_DAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      className={`rounded-md border px-3 py-1.5 text-xs transition ${
                        form.dayOfWeek === day.value
                          ? 'border-brand-500 bg-brand-500/20 text-brand-200'
                          : 'border-stone-700 bg-stone-900 text-stone-400 hover:border-stone-500'
                      }`}
                      onClick={() =>
                        setForm({
                          ...form,
                          dayOfWeek: form.dayOfWeek === day.value ? null : day.value,
                        })
                      }
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(form.frequency === 'monthly' || form.frequency === 'quarterly') && (
              <div>
                <label className="block text-sm font-medium text-stone-300 mb-1.5">
                  Day of Month (1-28)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="28"
                  value={form.dayOfMonth?.toString() || ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      dayOfMonth: e.target.value ? parseInt(e.target.value) : null,
                    })
                  }
                  placeholder="1"
                />
              </div>
            )}

            <Input
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g., Weekly meal prep for family of 4"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Invoice Date"
                type="date"
                value={form.nextSendDate}
                onChange={(e) => setForm({ ...form, nextSendDate: e.target.value })}
              />
              <Input
                label="Start Date"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>

            <Input
              label="End Date (optional, leave blank for indefinite)"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />

            {/* Autopay toggle */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isAutopay}
                  onChange={(e) => setForm({ ...form, isAutopay: e.target.checked })}
                  className="rounded border-stone-600"
                />
                <span className="text-sm text-stone-300">Enable autopay</span>
              </label>
              {form.isAutopay && (
                <span className="text-xs text-stone-500">
                  Client will need to save a payment method
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Late Fee ($)"
                type="number"
                min="0"
                step="0.01"
                value={form.lateFeeDollars}
                onChange={(e) => setForm({ ...form, lateFeeDollars: e.target.value })}
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
              <Button
                size="sm"
                onClick={() => (editingId ? handleUpdate(editingId) : handleCreate())}
                loading={isPending}
                disabled={!editingId && (!form.clientId || !form.nextSendDate)}
              >
                {editingId ? 'Save Changes' : 'Create Schedule'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowCreate(false)
                  setEditingId(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice List */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-stone-500">
          <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">
            {filter === 'all'
              ? 'No recurring invoices yet. Create your first schedule to get started.'
              : `No ${filter} schedules.`}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((inv) => (
          <div key={inv.id}>
            <Card
              className={
                inv.status === 'cancelled'
                  ? 'opacity-50'
                  : inv.status === 'paused'
                    ? 'opacity-75'
                    : ''
              }
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <RefreshCw className="h-4 w-4 text-stone-400 shrink-0" />
                      <span className="text-sm font-medium text-stone-100 truncate">
                        {inv.name || inv.clientName || 'Unnamed Schedule'}
                      </span>
                      {inv.name && inv.clientName && (
                        <span className="text-xs text-stone-500">{inv.clientName}</span>
                      )}
                      <Badge
                        variant={
                          inv.status === 'active'
                            ? 'success'
                            : inv.status === 'paused'
                              ? 'warning'
                              : 'default'
                        }
                      >
                        {inv.status === 'active'
                          ? FREQUENCY_LABELS[inv.frequency]
                          : inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </Badge>
                      {inv.isAutopay && <Badge variant="info">Autopay</Badge>}
                    </div>
                    <p className="text-sm text-stone-400 mt-0.5">
                      {formatCents(inv.amountCents)} per{' '}
                      {inv.frequency === 'biweekly' ? '2 weeks' : inv.frequency.replace('ly', '')}
                    </p>
                    {inv.description && (
                      <p className="text-xs text-stone-500 mt-0.5">{inv.description}</p>
                    )}
                    <p className="text-xs text-stone-400 mt-1">
                      Next: {inv.nextSendDate}
                      {inv.lastSentAt &&
                        ` · Last: ${new Date(inv.lastSentAt).toLocaleDateString()}`}
                      {inv.endDate && ` · Ends: ${inv.endDate}`}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {inv.status === 'active' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(inv)}
                          disabled={isPending}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePause(inv.id)}
                          disabled={isPending}
                        >
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {inv.status === 'paused' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResume(inv.id)}
                          disabled={isPending}
                        >
                          <Play className="h-3.5 w-3.5" />
                          Resume
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleCancel(inv.id)}
                          disabled={isPending}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    {inv.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewHistory(inv.id)}
                        disabled={isPending}
                      >
                        <History className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* History Panel */}
            {historyId === inv.id && (
              <Card className="mt-1 border-stone-700">
                <CardContent className="py-3">
                  <h4 className="text-xs font-semibold text-stone-400 uppercase mb-2">
                    Invoice History
                  </h4>
                  {loadingHistory && <p className="text-xs text-stone-500">Loading...</p>}
                  {!loadingHistory && history.length === 0 && (
                    <p className="text-xs text-stone-500">
                      No invoices generated yet for this schedule.
                    </p>
                  )}
                  {!loadingHistory && history.length > 0 && (
                    <div className="space-y-2">
                      {history.map((h) => (
                        <div
                          key={h.id}
                          className="flex items-center justify-between text-xs border-b border-stone-800 pb-2 last:border-0"
                        >
                          <div>
                            <span className="font-mono text-stone-300">{h.invoiceNumber}</span>
                            <span className="text-stone-500 ml-2">
                              {h.periodStart} to {h.periodEnd}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-stone-300">{formatCents(h.amountCents)}</span>
                            <Badge
                              variant={
                                h.status === 'paid'
                                  ? 'success'
                                  : h.status === 'overdue'
                                    ? 'error'
                                    : h.status === 'sent'
                                      ? 'info'
                                      : 'default'
                              }
                            >
                              {h.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
