import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { Card } from '@/components/ui/card'
import { AlertTriangle } from '@/components/ui/icons'

/**
 * Overwhelm Detection Banner
 *
 * Shows when a chef has too many stale items piling up (inquiries waiting,
 * draft events uncommitted). Collapses the noise into a single triage action.
 *
 * Thresholds:
 *   - stale inquiries >= 5
 *   - OR total stuck items (stale inquiries + draft events) >= 8
 */
export async function OverwhelmTriageBanner() {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    const [staleInquiriesResult, draftEventsResult] = await Promise.all([
      db
        .from('inquiries')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', user.tenantId!)
        .in('status', ['new', 'awaiting_chef']),
      db
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', user.tenantId!)
        .eq('status', 'draft'),
    ])

    const staleInquiries = Number(staleInquiriesResult?.count ?? 0)
    const draftEvents = Number(draftEventsResult?.count ?? 0)
    const totalStuck = staleInquiries + draftEvents

    // Only show when overwhelmed
    if (staleInquiries < 5 && totalStuck < 8) return null

    return (
      <Card className="p-5 border-amber-700/50 bg-gradient-to-r from-amber-950/40 to-orange-950/30">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="rounded-lg bg-amber-900/50 p-2 shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-amber-200">
                You have a lot on your plate
              </h3>
              <p className="text-sm text-amber-300/80 mt-0.5">
                {staleInquiries > 0 && (
                  <span>
                    {staleInquiries} {staleInquiries === 1 ? 'inquiry' : 'inquiries'} waiting
                  </span>
                )}
                {staleInquiries > 0 && draftEvents > 0 && <span>, </span>}
                {draftEvents > 0 && (
                  <span>
                    {draftEvents} draft {draftEvents === 1 ? 'event' : 'events'}
                  </span>
                )}
                {'. '}
                Let&apos;s focus on the most urgent.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 sm:ml-auto">
            {draftEvents > 0 && (
              <Link
                href="/events?status=draft"
                className="text-sm text-amber-400/80 hover:text-amber-300 whitespace-nowrap transition-colors"
              >
                Review drafts
              </Link>
            )}
            <Link
              href="/inquiries?status=respond_next"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium whitespace-nowrap transition-colors"
            >
              Start Triage
            </Link>
          </div>
        </div>
      </Card>
    )
  } catch (err) {
    console.error('[Dashboard] OverwhelmTriageBanner failed:', err)
    return null
  }
}
