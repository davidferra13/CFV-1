'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Receipt, AlertTriangle, CheckCircle, ArrowRight } from '@/components/ui/icons'
import { formatCurrency } from '@/lib/utils/currency'
import { sendInvoiceReminder } from '@/lib/dashboard/widget-actions'

// ── Types ──────────────────────────────────────────────────────────────

export interface InvoicePulseItem {
  id: string
  clientName: string
  amountCents: number
  status: 'draft' | 'sent' | 'overdue' | 'paid' | 'void'
  sentAt: string | null
  dueDate: string | null
  eventOccasion: string
}

export interface InvoicePulseMonthlyStats {
  totalSentCents: number
  totalPaidCents: number
  collectionRate: number // 0-100
}

interface InvoicePulseWidgetProps {
  invoices: InvoicePulseItem[]
  monthlyStats: InvoicePulseMonthlyStats
}

// ── Helpers ────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  draft: { label: 'Draft', variant: 'default' },
  sent: { label: 'Sent', variant: 'info' },
  overdue: { label: 'Overdue', variant: 'error' },
  paid: { label: 'Paid', variant: 'success' },
  void: { label: 'Void', variant: 'default' },
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / 86400000)
}

function sortByUrgency(a: InvoicePulseItem, b: InvoicePulseItem): number {
  // Overdue first
  if (a.status === 'overdue' && b.status !== 'overdue') return -1
  if (b.status === 'overdue' && a.status !== 'overdue') return 1
  // Then by amount descending
  return b.amountCents - a.amountCents
}

// ── Component ──────────────────────────────────────────────────────────

export function InvoicePulseWidget({ invoices, monthlyStats }: InvoicePulseWidgetProps) {
  const [items, setItems] = useState(invoices)
  const [pending, startTransition] = useTransition()
  const [sendingId, setSendingId] = useState<string | null>(null)

  if (items.length === 0 && monthlyStats.totalSentCents === 0) return null

  const outstanding = items.filter((i) => i.status === 'sent' || i.status === 'overdue')
  const overdueCount = items.filter((i) => i.status === 'overdue').length
  const totalOutstandingCents = outstanding.reduce((sum, i) => sum + i.amountCents, 0)
  const sorted = [...items]
    .filter((i) => i.status !== 'draft' && i.status !== 'void')
    .sort(sortByUrgency)
    .slice(0, 5)

  function handleSendReminder(invoiceId: string) {
    setSendingId(invoiceId)
    const previous = [...items]

    startTransition(async () => {
      try {
        const result = await sendInvoiceReminder(invoiceId)
        if (!result.success) {
          setItems(previous)
          setSendingId(null)
        } else {
          setSendingId(null)
        }
      } catch {
        setItems(previous)
        setSendingId(null)
      }
    })
  }

  // Collection rate ring
  const rate = Math.round(monthlyStats.collectionRate)
  const circumference = 2 * Math.PI * 18
  const offset = circumference - (rate / 100) * circumference

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-stone-400" />
            <CardTitle>Invoice Pulse</CardTitle>
          </div>
          <Link
            href="/events?status=accepted,paid,confirmed"
            className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-400"
          >
            All events <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm font-semibold text-stone-100">
                {outstanding.length} outstanding
              </span>
              <span className="text-xs text-stone-500">
                {formatCurrency(totalOutstandingCents)} total
              </span>
            </div>
            {overdueCount > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <AlertTriangle className="h-3 w-3 text-red-400" />
                <span className="text-xs text-red-400 font-medium">{overdueCount} overdue</span>
              </div>
            )}
          </div>

          {/* Collection rate ring */}
          <div className="relative shrink-0">
            <svg width="48" height="48" className="-rotate-90">
              <circle
                cx="24"
                cy="24"
                r="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-stone-800"
              />
              <circle
                cx="24"
                cy="24"
                r="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={
                  rate >= 80 ? 'text-emerald-500' : rate >= 50 ? 'text-amber-500' : 'text-red-500'
                }
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-stone-200">
              {rate}%
            </span>
          </div>
        </div>

        {/* Monthly context */}
        <div className="flex justify-between text-xs text-stone-500 border-t border-stone-800 pt-2">
          <span>Sent this month: {formatCurrency(monthlyStats.totalSentCents)}</span>
          <span>Collected: {formatCurrency(monthlyStats.totalPaidCents)}</span>
        </div>

        {/* Invoice list */}
        {sorted.length > 0 && (
          <ul className="space-y-1.5">
            {sorted.map((inv) => {
              const badge = STATUS_BADGE[inv.status] ?? STATUS_BADGE.sent
              const days = daysSince(inv.sentAt)
              const isOverdue = inv.status === 'overdue'
              const isSending = sendingId === inv.id && pending

              return (
                <li
                  key={inv.id}
                  className={`flex items-center justify-between rounded-md px-2 py-1.5 transition-colors ${
                    isOverdue ? 'bg-red-950/30 hover:bg-red-950/50' : 'hover:bg-stone-800'
                  }`}
                >
                  <Link href={`/events/${inv.id}`} className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-100 truncate">
                      {inv.eventOccasion}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-stone-500 truncate">{inv.clientName}</span>
                      {days !== null && (
                        <span className="text-xs text-stone-600">
                          {days === 0 ? 'today' : `${days}d ago`}
                        </span>
                      )}
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                    <span
                      className={`text-sm font-semibold ${isOverdue ? 'text-red-400' : 'text-stone-200'}`}
                    >
                      {formatCurrency(inv.amountCents)}
                    </span>
                    {isOverdue && (
                      <Button
                        variant="ghost"
                        className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
                        onClick={(e) => {
                          e.preventDefault()
                          handleSendReminder(inv.id)
                        }}
                        disabled={isSending}
                      >
                        {isSending ? 'Sending...' : 'Remind'}
                      </Button>
                    )}
                    {inv.status === 'paid' && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
