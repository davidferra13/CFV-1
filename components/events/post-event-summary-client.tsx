'use client'

// Post-Event Summary — shows proposed menu, expense breakdown, timeline
// Gives clients full transparency on what happened at their event.

import { formatCurrency } from '@/lib/utils/currency'
import { format, parseISO } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ChevronRight, Share2, FileText, Clock, Receipt } from 'lucide-react'

interface Menu {
  id: string
  name: string
  description: string | null
  service_style: string | null
}

interface LedgerEntry {
  id: string
  description: string
  amount_cents: number
  entry_type: string
  created_at: string
}

interface EventTransition {
  to_status: string
  transitioned_at: string
}

interface PostEventSummaryClientProps {
  event: {
    id: string
    occasion: string | null
    event_date: string
    guest_count: number | null
    serve_time: string | null
    location_city: string | null
    location_state: string | null
  }
  menus: Menu[]
  ledgerEntries: LedgerEntry[]
  transitions: EventTransition[]
  financial: {
    totalPaidCents: number
    quotedPriceCents: number
    outstandingBalanceCents: number
  } | null
  hasPhotos: boolean
}

const STATUS_LABELS: Record<string, string> = {
  proposed: 'Proposal Sent',
  accepted: 'Accepted',
  paid: 'Deposit Paid',
  confirmed: 'Confirmed',
  in_progress: 'Event Started',
  completed: 'Completed',
}

function ShareButton({ shareText }: { shareText: string }) {
  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text: shareText })
      } catch {
        /* cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText)
        alert('Copied!')
      } catch {
        /* no-op */
      }
    }
  }
  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-500 hover:text-brand-600 transition-colors"
    >
      <Share2 className="w-4 h-4" />
      Share this event
    </button>
  )
}

export function PostEventSummaryClient({
  event,
  menus,
  ledgerEntries,
  transitions,
  financial,
  hasPhotos,
}: PostEventSummaryClientProps) {
  const occasion = event.occasion || 'Private Chef Dinner'
  const shareText = `Just had an incredible private chef dinner — ${occasion}! 🌟`

  // Build timeline from transitions
  const timeline = transitions
    .filter((t) => STATUS_LABELS[t.to_status])
    .map((t) => ({
      label: STATUS_LABELS[t.to_status],
      at: t.transitioned_at,
    }))

  // Split ledger entries: payments vs. expenses
  const payments = ledgerEntries.filter((e) =>
    ['payment', 'deposit', 'balance_payment', 'tip'].includes(e.entry_type)
  )
  const expenses = ledgerEntries.filter((e) =>
    ['expense', 'ingredient', 'grocery'].includes(e.entry_type)
  )

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/my-events/${event.id}`}
          className="text-brand-600 hover:text-brand-700 flex items-center gap-2 mb-4 text-sm"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Back to Event
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 mb-1">Event Summary</h1>
            <p className="text-stone-600 text-sm">
              {occasion} · {format(new Date(event.event_date), 'MMMM d, yyyy')}
              {event.guest_count ? ` · ${event.guest_count} guests` : ''}
            </p>
          </div>
          <Badge variant="success">Completed</Badge>
        </div>
        <div className="mt-3">
          <ShareButton shareText={shareText} />
        </div>
      </div>

      {/* Financial Snapshot */}
      {financial && (
        <Card className="mb-4 border-emerald-200 bg-emerald-50">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-stone-500 mb-0.5">Total Price</div>
                <div className="text-lg font-bold text-stone-900">
                  {formatCurrency(financial.quotedPriceCents)}
                </div>
              </div>
              <div>
                <div className="text-xs text-stone-500 mb-0.5">Amount Paid</div>
                <div className="text-lg font-bold text-emerald-700">
                  {formatCurrency(financial.totalPaidCents)}
                </div>
              </div>
              <div>
                <div className="text-xs text-stone-500 mb-0.5">Balance</div>
                <div
                  className={`text-lg font-bold ${financial.outstandingBalanceCents > 0 ? 'text-red-700' : 'text-stone-500'}`}
                >
                  {financial.outstandingBalanceCents > 0
                    ? formatCurrency(financial.outstandingBalanceCents)
                    : 'Settled'}
                </div>
              </div>
            </div>
            {financial.outstandingBalanceCents > 0 && (
              <div className="mt-3 text-center">
                <Link
                  href={`/my-events/${event.id}/pay`}
                  className="inline-block text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-lg transition"
                >
                  Pay Remaining Balance
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Menu */}
      {menus.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-stone-400" />
              <CardTitle className="text-base">Menu Served</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {menus.map((menu) => (
              <div key={menu.id}>
                <p className="font-semibold text-stone-900">{menu.name}</p>
                {menu.service_style && (
                  <Badge variant="info" className="text-xs mt-1">
                    {menu.service_style}
                  </Badge>
                )}
                {menu.description && (
                  <p className="text-sm text-stone-600 mt-1.5 leading-relaxed">
                    {menu.description}
                  </p>
                )}
              </div>
            ))}
            {/* Printable menu link */}
            <div className="pt-2 border-t border-stone-100">
              <Link
                href={`/api/documents/foh-menu/${event.id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                <FileText className="w-4 h-4" />
                Download Printable Menu
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-stone-400" />
                <CardTitle className="text-base">Payment History</CardTitle>
              </div>
              <Link
                href={`/api/documents/receipt/${event.id}`}
                target="_blank"
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                Download Receipt
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {payments.map((entry) => (
              <div
                key={entry.id}
                className="flex justify-between items-center py-1.5 border-b last:border-b-0"
              >
                <div>
                  <p className="text-sm font-medium text-stone-900">{entry.description}</p>
                  <p className="text-xs text-stone-500">
                    {format(parseISO(entry.created_at), 'PPP')}
                  </p>
                </div>
                <span className="text-sm font-semibold text-stone-900">
                  {formatCurrency(entry.amount_cents)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Event Timeline */}
      {timeline.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-stone-400" />
              <CardTitle className="text-base">Event Timeline</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timeline.map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="font-medium text-stone-700">{item.label}</span>
                  <span className="text-stone-400 text-xs ml-auto">
                    {format(parseISO(item.at), 'MMM d, h:mm a')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photos Available */}
      {hasPhotos && (
        <Card className="mb-4 border-purple-100 bg-purple-50">
          <CardContent className="p-4 text-center">
            <p className="text-sm font-medium text-purple-900 mb-2">
              Your chef uploaded photos from the event!
            </p>
            <Link
              href={`/my-events/${event.id}`}
              className="inline-block text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 px-4 py-1.5 rounded-lg transition"
            >
              View Event Photos
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Review CTA */}
      <div className="text-center mt-8 p-6 bg-stone-50 rounded-xl border border-stone-200">
        <p className="text-stone-700 font-medium mb-1">How was your experience?</p>
        <p className="text-stone-500 text-sm mb-4">
          Your feedback helps the chef continue to grow and improve.
        </p>
        <Link href={`/my-events/${event.id}#review`}>
          <button
            type="button"
            className="bg-brand-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-brand-700 transition text-sm"
          >
            Leave a Review
          </button>
        </Link>
      </div>
    </div>
  )
}
