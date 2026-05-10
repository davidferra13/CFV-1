// Sales Pipeline - Operational view of leads from first contact to completed event

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getSalesPipelineOverview } from '@/lib/pipeline/queries'
import { CrossDomainLinks } from '@/components/ui/cross-domain-links'
import { PipelineFunnelChart } from '@/components/pipeline/pipeline-funnel-chart'
import { PipelineStageSection } from '@/components/pipeline/pipeline-stage-section'
import { PipelineAlerts } from '@/components/pipeline/pipeline-alerts'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Users, DollarSign, Send, FileCheck } from '@/components/ui/icons'

export const metadata: Metadata = {
  title: 'Sales Pipeline',
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch {
    return fallback
  }
}

export default async function PipelinePage() {
  await requireChef()

  const overview = await safe(getSalesPipelineOverview, {
    stages: [],
    totalPipelineValueCents: 0,
    conversions: [],
    alerts: [],
  })

  const leadsStage = overview.stages.find((s) => s.stage === 'leads')
  const proposalsStage = overview.stages.find((s) => s.stage === 'proposals')
  const contractsStage = overview.stages.find((s) => s.stage === 'contracts')

  const activeLeads = leadsStage?.count ?? 0
  const proposalsOut = proposalsStage?.count ?? 0
  // Signed contracts are not in active pipeline stages (only draft/sent/viewed are),
  // so we count the events stage as the "signed and confirmed" endpoint
  const eventsStage = overview.stages.find((s) => s.stage === 'events')
  const signedContracts = eventsStage?.count ?? 0

  const hasData = overview.stages.some((s) => s.count > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/events"
          className="text-stone-400 hover:text-stone-100 transition-colors"
          aria-label="Back to Events"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Sales Pipeline</h1>
          <p className="text-stone-400 mt-1">Track leads from first contact to completed event</p>
        </div>
      </div>

      {/* Cross-domain navigation */}
      <CrossDomainLinks
        links={[
          { label: 'Inquiries', href: '/inquiries' },
          { label: 'Quotes', href: '/quotes' },
          { label: 'Proposals', href: '/proposals' },
          { label: 'Contracts', href: '/contracts' },
          { label: 'Analytics Funnel', href: '/analytics/funnel' },
        ]}
      />

      {/* Alerts */}
      {overview.alerts.length > 0 && <PipelineAlerts alerts={overview.alerts} />}

      {hasData ? (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Leads */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-950 flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Active Leads</p>
                    <p className="text-xl font-bold text-stone-100">{activeLeads}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pipeline Value */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-950 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Pipeline Value</p>
                    <p className="text-xl font-bold text-stone-100">
                      ${(overview.totalPipelineValueCents / 100).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Proposals Out */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-950 flex items-center justify-center">
                    <Send className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Proposals Out</p>
                    <p className="text-xl font-bold text-stone-100">{proposalsOut}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Signed Contracts */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-950 flex items-center justify-center">
                    <FileCheck className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Confirmed Events</p>
                    <p className="text-xl font-bold text-stone-100">{signedContracts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Funnel Visualization */}
          <PipelineFunnelChart stages={overview.stages} conversions={overview.conversions} />

          {/* Stage Detail Sections */}
          {overview.stages.map((stage) => (
            <PipelineStageSection key={stage.stage} stage={stage} />
          ))}
        </>
      ) : (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            Your sales pipeline is empty. As inquiries come in, they will appear here.
          </p>
        </div>
      )}
    </div>
  )
}
