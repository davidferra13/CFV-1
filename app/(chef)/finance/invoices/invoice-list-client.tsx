'use client'

import { useMemo } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BulkSelectTable, type BulkAction } from '@/components/ui/bulk-select-table'
import { InvoicePaymentLinkButton } from '@/components/finance/invoice-payment-link-button'
import { generateHostedInvoicePaymentLink } from '@/lib/finance/invoice-payment-link-actions'
import { sendInvoiceReminder } from '@/lib/dashboard/widget-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { usePersistentViewState } from '@/lib/view-state/use-persistent-view-state'

type BadgeVariant = 'default' | 'warning' | 'success' | 'error'

export type InvoiceListItem = {
  id: string
  eventDate: string
  clientId: string | null
  clientName: string | null
  occasion: string | null
  guestCount: number | null
  valueCents: number
  statusLabel?: string | null
  statusVariant?: BadgeVariant
  paymentStatusLabel?: string | null
  paymentStatusVariant?: BadgeVariant
  outstandingCents?: number | null
  daysOverdue?: number | null
}

type Props = {
  items: InvoiceListItem[]
  scopeKey: string
  mode: 'draft' | 'sent' | 'paid' | 'overdue'
}

function parseCurrencyInput(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value.replace(/[$,\s]/g, ''))
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100)
}

function isWithinDateRange(dateValue: string, from: string, to: string) {
  const normalized = dateValue.slice(0, 10)
  if (from && normalized < from) return false
  if (to && normalized > to) return false
  return true
}

export function InvoiceListClient({ items, scopeKey, mode }: Props) {
  const { state, setState, reset } = usePersistentViewState(scopeKey, {
    strategy: 'url',
    defaults: {
      search: '',
      minAmount: '',
      maxAmount: '',
      dateFrom: '',
      dateTo: '',
    },
  })

  const filteredItems = useMemo(() => {
    const search = String(state.search || '')
      .trim()
      .toLowerCase()
    const minAmountCents = parseCurrencyInput(String(state.minAmount || ''))
    const maxAmountCents = parseCurrencyInput(String(state.maxAmount || ''))
    const dateFrom = String(state.dateFrom || '')
    const dateTo = String(state.dateTo || '')

    return items.filter((item) => {
      if (search) {
        const haystack = [item.clientName, item.occasion].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(search)) {
          return false
        }
      }

      if (minAmountCents !== null && item.valueCents < minAmountCents) {
        return false
      }

      if (maxAmountCents !== null && item.valueCents > maxAmountCents) {
        return false
      }

      if (!isWithinDateRange(item.eventDate, dateFrom, dateTo)) {
        return false
      }

      return true
    })
  }, [items, state.dateFrom, state.dateTo, state.maxAmount, state.minAmount, state.search])

  const hasActiveFilters = Boolean(
    state.search || state.minAmount || state.maxAmount || state.dateFrom || state.dateTo
  )

  const bulkActions: BulkAction[] = []

  if (mode === 'sent') {
    bulkActions.push({
      label: 'Send Reminders',
      onClick: async (selectedIds) => {
        let sentCount = 0
        let failedCount = 0

        for (const id of selectedIds) {
          try {
            const result = await sendInvoiceReminder(id)
            if (result.success) {
              sentCount += 1
            } else {
              failedCount += 1
            }
          } catch {
            failedCount += 1
          }
        }

        if (sentCount > 0) {
          toast.success(
            `Sent ${sentCount} reminder${sentCount === 1 ? '' : 's'}${failedCount > 0 ? `, ${failedCount} failed` : ''}`
          )
        } else {
          toast.error('Failed to send reminders')
        }
      },
    })

    bulkActions.push({
      label: 'Copy Payment Links',
      onClick: async (selectedIds) => {
        const copied: string[] = []
        let failedCount = 0

        for (const id of selectedIds) {
          try {
            const item = items.find((row) => row.id === id)
            const result = await generateHostedInvoicePaymentLink(id)
            copied.push(`${item?.clientName || 'Invoice'}: ${result.url}`)
          } catch {
            failedCount += 1
          }
        }

        if (copied.length === 0) {
          toast.error('Failed to generate payment links')
          return
        }

        try {
          await navigator.clipboard.writeText(copied.join('\n'))
          toast.success(
            `Copied ${copied.length} payment link${copied.length === 1 ? '' : 's'}${failedCount > 0 ? `, ${failedCount} failed` : ''}`
          )
        } catch {
          toast.error('Failed to copy payment links')
        }
      },
    })
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">
              Search
            </label>
            <Input
              type="search"
              value={String(state.search || '')}
              onChange={(event) => setState({ search: event.target.value })}
              placeholder="Client or occasion"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">
              Min Amount
            </label>
            <Input
              inputMode="decimal"
              value={String(state.minAmount || '')}
              onChange={(event) => setState({ minAmount: event.target.value })}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">
              Max Amount
            </label>
            <Input
              inputMode="decimal"
              value={String(state.maxAmount || '')}
              onChange={(event) => setState({ maxAmount: event.target.value })}
              placeholder="5000.00"
            />
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="w-full min-h-[44px]"
              onClick={() => reset()}
              disabled={!hasActiveFilters}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:max-w-[420px]">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">
              Event Date From
            </label>
            <Input
              type="date"
              value={String(state.dateFrom || '')}
              onChange={(event) => setState({ dateFrom: event.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">
              Event Date To
            </label>
            <Input
              type="date"
              value={String(state.dateTo || '')}
              onChange={(event) => setState({ dateTo: event.target.value })}
            />
          </div>
        </div>
      </Card>

      <p className="text-sm text-stone-400">
        Showing {filteredItems.length} of {items.length} invoices
      </p>

      {filteredItems.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-medium text-stone-300">No invoices match the current filters.</p>
          <p className="mt-1 text-sm text-stone-500">
            Clear the date or amount filters to see the full list again.
          </p>
        </Card>
      ) : (
        <BulkSelectTable
          items={filteredItems}
          bulkActions={bulkActions}
          renderHeader={() => (
            <>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-400">
                Event Date
              </th>
              {mode === 'overdue' && (
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-400">
                  Days Overdue
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-400">
                Client
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-400">
                Occasion
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-400 lg:table-cell">
                Guests
              </th>
              {(mode === 'draft' || mode === 'paid' || mode === 'overdue') && (
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-400 md:table-cell">
                  Status
                </th>
              )}
              {mode === 'sent' && (
                <>
                  <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-400 md:table-cell">
                    Payment Status
                  </th>
                  <th className="hidden px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-400 md:table-cell">
                    Outstanding
                  </th>
                </>
              )}
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-400">
                Value
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-400">
                Actions
              </th>
            </>
          )}
          renderRow={(item) => (
            <>
              <td className="px-4 py-3 text-sm text-stone-400">
                {new Date(item.eventDate).toLocaleDateString()}
              </td>
              {mode === 'overdue' && (
                <td
                  className={`px-4 py-3 text-sm font-semibold ${
                    (item.daysOverdue ?? 0) > 30 ? 'text-red-400' : 'text-amber-400'
                  }`}
                >
                  {item.daysOverdue ?? 0}d
                </td>
              )}
              <td className="px-4 py-3">
                {item.clientId && item.clientName ? (
                  <Button
                    href={`/clients/${item.clientId}`}
                    variant="ghost"
                    size="md"
                    className="h-auto min-h-[44px] px-0 text-left text-brand-600 hover:bg-transparent hover:text-brand-300"
                  >
                    {item.clientName}
                  </Button>
                ) : (
                  <span className="text-sm text-stone-500">-</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-stone-400">
                {item.occasion?.replace(/_/g, ' ') || '-'}
              </td>
              <td className="hidden px-4 py-3 text-sm text-stone-400 lg:table-cell">
                {item.guestCount ?? '-'}
              </td>
              {(mode === 'draft' || mode === 'paid' || mode === 'overdue') && (
                <td className="hidden px-4 py-3 md:table-cell">
                  {item.statusLabel ? (
                    <Badge variant={item.statusVariant || 'default'}>{item.statusLabel}</Badge>
                  ) : (
                    <span className="text-sm text-stone-500">-</span>
                  )}
                </td>
              )}
              {mode === 'sent' && (
                <>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {item.paymentStatusLabel ? (
                      <Badge variant={item.paymentStatusVariant || 'default'}>
                        {item.paymentStatusLabel}
                      </Badge>
                    ) : (
                      <span className="text-sm text-stone-500">-</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-sm text-stone-400 md:table-cell">
                    {item.outstandingCents != null ? formatCurrency(item.outstandingCents) : '-'}
                  </td>
                </>
              )}
              <td className="px-4 py-3 text-right text-sm font-semibold text-stone-100">
                {formatCurrency(item.valueCents)}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {mode === 'sent' && <InvoicePaymentLinkButton eventId={item.id} />}
                  <Button
                    href={`/events/${item.id}`}
                    variant="secondary"
                    size="md"
                    className="min-h-[44px]"
                  >
                    View
                  </Button>
                </div>
              </td>
            </>
          )}
        />
      )}
    </div>
  )
}
