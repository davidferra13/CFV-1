import { getResponseQueue } from '@/lib/inquiries/actions'
import { getOverdueInquiries } from '@/lib/lifecycle/next-action'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

export async function RespondNextCard() {
  let queue: Awaited<ReturnType<typeof getResponseQueue>>
  let overdueCount = 0
  try {
    const [q, overdue] = await Promise.all([
      getResponseQueue(1),
      getOverdueInquiries().catch(() => []),
    ])
    queue = q
    overdueCount = overdue.length
  } catch {
    return null
  }

  if (queue.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
              Inquiries
            </p>
            <p className="text-sm text-muted-foreground">All caught up.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/import?mode=inquiries"
              className="inline-block rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
            >
              Paste from Email
            </Link>
            <Link
              href="/marketplace/capture"
              className="inline-block rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
            >
              Capture Platform Inquiry
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const item = queue[0]

  const urgencyColor =
    item.waitingHours >= 48
      ? 'text-red-600 dark:text-red-400'
      : item.waitingHours >= 24
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-muted-foreground'

  const readinessColor =
    item.readiness.level === 'ready'
      ? 'text-emerald-600 dark:text-emerald-400'
      : item.readiness.level === 'almost'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-muted-foreground'

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Respond Next
        </h3>
        <span className={`text-xs font-medium ${urgencyColor}`}>waiting {item.waitingHours}h</span>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{item.clientName}</p>
        {item.occasion && <p className="text-xs text-muted-foreground">{item.occasion}</p>}
        <div className="flex items-center gap-3 text-xs">
          {item.confirmedDate && (
            <span className="text-muted-foreground">
              {formatDistanceToNow(new Date(item.confirmedDate), { addSuffix: true })}
            </span>
          )}
          {item.guestCount && (
            <span className="text-muted-foreground">{item.guestCount} guests</span>
          )}
          <span className={readinessColor}>{item.readiness.percent}% ready</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Link
          href={`/inquiries/${item.id}`}
          className="inline-block rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-orange-500"
        >
          View Inquiry
        </Link>
        {overdueCount > 0 && (
          <Link
            href="/inquiries?filter=respond_next"
            className="text-xs text-red-400 hover:text-red-300"
          >
            {overdueCount} overdue
          </Link>
        )}
      </div>
    </div>
  )
}
