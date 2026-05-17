// Dashboard Pipeline Snapshot - funnel visualization: inquiries -> quotes -> events

import { getPipelineSummary } from '@/lib/intelligence/pipeline-summary'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { formatCurrency } from '@/lib/utils/currency'
import { WidgetCardShell } from '@/components/dashboard/widget-cards/widget-card-shell'
import Link from 'next/link'

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    console.error(`[Dashboard/PipelineSnapshot] ${label} failed:`, err)
    return fallback
  }
}

interface StageCounts {
  inquiries: number
  quotes: number
  events: number
}

async function getStageCounts(): Promise<StageCounts> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const [inquiryRes, quoteRes, eventRes] = await Promise.all([
    db
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('status', 'in', '(converted,declined,expired,archived)'),
    db
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['draft', 'sent']),
    db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['confirmed', 'paid', 'in_progress'])
      .is('deleted_at', null),
  ])

  return {
    inquiries: inquiryRes.count ?? 0,
    quotes: quoteRes.count ?? 0,
    events: eventRes.count ?? 0,
  }
}

const FUNNEL_STAGES = [
  { key: 'inquiries', label: 'Inquiries', color: 'bg-brand-400', href: '/inquiries' },
  { key: 'quotes', label: 'Quotes', color: 'bg-amber-500', href: '/quotes' },
  { key: 'events', label: 'Confirmed', color: 'bg-green-500', href: '/events' },
] as const

export async function PipelineSnapshot() {
  const [pipeline, counts] = await Promise.all([
    safe('pipeline', getPipelineSummary, null),
    safe('stageCounts', getStageCounts, { inquiries: 0, quotes: 0, events: 0 }),
  ])

  // Return null if there is nothing to show
  if (counts.inquiries === 0 && counts.quotes === 0 && counts.events === 0) {
    return null
  }

  const maxCount = Math.max(counts.inquiries, counts.quotes, counts.events, 1)
  const conversionRate = pipeline?.historicalConversionRate ?? 0
  const pipelineValue = pipeline?.estimatedPipelineValueCents ?? 0
  const avgDays = pipeline?.avgDaysToConvert ?? null

  return (
    <WidgetCardShell
      widgetId="pipeline_snapshot"
      title="Pipeline"
      size="md"
      href="/analytics/pipeline"
    >
      <div className="space-y-3">
        {/* Funnel: three columns */}
        <div className="grid grid-cols-3 gap-3">
          {FUNNEL_STAGES.map((stage) => {
            const count = counts[stage.key]
            const barHeight = maxCount > 0 ? Math.max((count / maxCount) * 100, 8) : 8
            return (
              <Link
                key={stage.key}
                href={stage.href}
                className="flex flex-col items-center gap-1.5 group"
              >
                <span className="text-lg font-bold text-stone-100 tabular-nums group-hover:text-brand-400 transition-colors">
                  {count}
                </span>
                <div className="w-full h-10 bg-stone-800 rounded overflow-hidden flex items-end">
                  <div
                    className={`w-full rounded transition-all ${stage.color}`}
                    style={{ height: `${barHeight}%` }}
                  />
                </div>
                <span className="text-xxs text-stone-500 font-medium uppercase tracking-wide">
                  {stage.label}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Metrics row */}
        <div className="flex items-center justify-between border-t border-stone-800 pt-2 text-xs">
          <div className="text-stone-400">
            <span className="text-stone-300 font-medium">{conversionRate}%</span> booking rate
          </div>
          {pipelineValue > 0 && (
            <div className="text-stone-400">
              <span className="text-stone-300 font-medium">{formatCurrency(pipelineValue)}</span>{' '}
              pipeline
            </div>
          )}
          {avgDays !== null && (
            <div className="text-stone-400">
              <span className="text-stone-300 font-medium">{avgDays}d</span> avg close
            </div>
          )}
        </div>
      </div>
    </WidgetCardShell>
  )
}

// Loading skeleton
export function PipelineSnapshotSkeleton() {
  return (
    <div
      className="col-span-1 sm:col-span-2 rounded-2xl overflow-hidden animate-pulse"
      style={{
        border: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(120,113,108,0.06)',
      }}
    >
      <div className="px-4 pt-3.5 pb-1 flex items-center gap-2.5">
        <div className="w-4 h-4 loading-bone loading-bone-muted" />
        <div className="h-3 w-20 loading-bone loading-bone-muted" />
      </div>
      <div className="px-4 pb-4 pt-2">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="h-6 w-8 loading-bone loading-bone-muted rounded" />
              <div className="w-full h-10 loading-bone loading-bone-muted rounded" />
              <div className="h-3 w-12 loading-bone loading-bone-muted rounded" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-800">
          <div className="h-3 w-20 loading-bone loading-bone-muted rounded" />
          <div className="h-3 w-24 loading-bone loading-bone-muted rounded" />
          <div className="h-3 w-16 loading-bone loading-bone-muted rounded" />
        </div>
      </div>
    </div>
  )
}
