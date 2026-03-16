// Prospecting Hub - Main prospect database
// Admin-only. Shows all prospects with stats, filtering, and search.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { getProspects, getProspectStats } from '@/lib/prospecting/actions'
import { getConversionFunnelStats } from '@/lib/prospecting/pipeline-actions'
import { ProspectTable } from '@/components/prospecting/prospect-table'
import { BatchReEnrichButton } from '@/components/prospecting/batch-re-enrich-button'
import { ExportCSVButton } from '@/components/prospecting/export-csv-button'
import { FollowUpReminderButton } from '@/components/prospecting/follow-up-reminder-button'
import { AddProspectButton } from '@/components/prospecting/add-prospect-modal'
import { ConversionFunnelPanel } from '@/components/prospecting/conversion-funnel-panel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Search,
  Zap,
  Phone,
  Target,
  CheckCircle,
  BookOpen,
  ArrowRight,
  FileText,
  Kanban,
  MapPin,
  Upload,
} from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Prospecting - ChefFlow' }

export default async function ProspectingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; search?: string; region?: string }>
}) {
  await requireAdmin()
  await requireChef()

  const params = await searchParams
  const [prospects, stats, funnelData] = await Promise.all([
    getProspects({
      status: params.status || undefined,
      category: params.category || undefined,
      search: params.search || undefined,
      region: params.region || undefined,
    }),
    getProspectStats(),
    getConversionFunnelStats(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Prospecting Hub</h1>
          <p className="text-stone-400 mt-1">
            AI-powered lead scrubbing and outbound prospecting database
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/prospecting/scrub">
            <Button className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              AI Scrub
            </Button>
          </Link>
          <Link href="/prospecting/pipeline">
            <Button variant="secondary" className="flex items-center gap-2">
              <Kanban className="h-4 w-4" />
              Pipeline
            </Button>
          </Link>
          <Link href="/prospecting/queue">
            <Button variant="secondary" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Call Queue
            </Button>
          </Link>
          <Link href="/prospecting/clusters">
            <Button variant="secondary" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Clusters
            </Button>
          </Link>
          <Link href="/prospecting/import">
            <Button variant="secondary" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
          </Link>
          <AddProspectButton />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Prospects"
          value={stats.total}
          icon={<Target className="h-5 w-5 text-stone-400" />}
        />
        <StatCard
          label="New / Queued"
          value={stats.new + stats.queued}
          icon={<Search className="h-5 w-5 text-blue-400" />}
        />
        <StatCard
          label="Follow-ups Due"
          value={stats.follow_up}
          icon={<Phone className="h-5 w-5 text-orange-400" />}
        />
        <StatCard
          label="Converted"
          value={stats.converted}
          icon={<CheckCircle className="h-5 w-5 text-green-400" />}
        />
      </div>

      {/* Conversion Funnel */}
      {funnelData.totalProspects > 0 && (
        <ConversionFunnelPanel
          stages={funnelData.stages}
          totalProspects={funnelData.totalProspects}
        />
      )}

      {/* Filter bar */}
      <Card>
        <CardContent className="py-3">
          <form className="flex flex-wrap gap-3 items-center" method="GET">
            <input
              type="text"
              name="search"
              placeholder="Search prospects..."
              defaultValue={params.search ?? ''}
              className="rounded-lg border border-stone-700 px-3 py-1.5 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="text"
              name="region"
              placeholder="Region..."
              defaultValue={params.region ?? ''}
              className="rounded-lg border border-stone-700 px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <select
              name="status"
              defaultValue={params.status ?? ''}
              className="rounded-lg border border-stone-700 px-3 py-1.5 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="queued">Queued</option>
              <option value="called">Called</option>
              <option value="follow_up">Follow Up</option>
              <option value="converted">Converted</option>
              <option value="not_interested">Not Interested</option>
              <option value="dead">Dead</option>
            </select>
            <Button type="submit" variant="secondary" size="sm">
              Filter
            </Button>
            {(params.search || params.status || params.region || params.category) && (
              <Link href="/prospecting">
                <Button variant="ghost" size="sm">
                  Clear
                </Button>
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Getting Started Guide - only shows when database is empty */}
      {stats.total === 0 && (
        <Card className="border-brand-700 bg-gradient-to-br from-brand-50/50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-brand-300">
              <BookOpen className="h-5 w-5" />
              Getting Started with Prospecting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-stone-400">
              The Prospecting Hub is your outbound sales machine. Instead of waiting for clients to
              find you, you go out and find them. Here&apos;s how it works:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border border-stone-700 bg-stone-900 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-brand-900 text-brand-400 font-bold text-sm">
                    1
                  </div>
                  <h3 className="font-semibold text-stone-100">AI Scrub</h3>
                </div>
                <p className="text-sm text-stone-400">
                  Type any query like &ldquo;yacht clubs in Cape Cod&rdquo; or &ldquo;luxury wedding
                  planners in the Hamptons.&rdquo; AI researches real businesses, finds their
                  contact info, and writes you personalized approach strategies.
                </p>
                <Link
                  href="/prospecting/scrub"
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-400"
                >
                  Run your first scrub <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-lg border border-stone-700 bg-stone-900 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-brand-900 text-brand-400 font-bold text-sm">
                    2
                  </div>
                  <h3 className="font-semibold text-stone-100">Call Queue</h3>
                </div>
                <p className="text-sm text-stone-400">
                  Build a daily call list. The system prioritizes follow-ups first, then fresh
                  leads, then older contacts. Log each call&apos;s outcome and it automatically
                  moves prospects through your pipeline.
                </p>
                <Link
                  href="/prospecting/queue"
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-400"
                >
                  Build a call queue <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="rounded-lg border border-stone-700 bg-stone-900 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-brand-900 text-brand-400 font-bold text-sm">
                    3
                  </div>
                  <h3 className="font-semibold text-stone-100">Call Scripts</h3>
                </div>
                <p className="text-sm text-stone-400">
                  Write reusable cold-calling scripts for different prospect types. Assign scripts
                  to categories (yacht clubs, wedding planners, etc.) and they auto-suggest during
                  calls.
                </p>
                <Link
                  href="/prospecting/scripts"
                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-400"
                >
                  Create a script <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="rounded-lg bg-amber-950 border border-amber-200 p-4">
              <h4 className="font-medium text-amber-900 text-sm mb-2">How the Pipeline Works</h4>
              <div className="flex flex-wrap items-center gap-2 text-xs text-amber-800">
                <span className="rounded-full bg-blue-900 px-2.5 py-1 font-medium">New</span>
                <ArrowRight className="h-3 w-3" />
                <span className="rounded-full bg-amber-900 px-2.5 py-1 font-medium">Queued</span>
                <ArrowRight className="h-3 w-3" />
                <span className="rounded-full bg-stone-700 px-2.5 py-1 font-medium">Called</span>
                <ArrowRight className="h-3 w-3" />
                <span className="rounded-full bg-amber-900 px-2.5 py-1 font-medium">Follow Up</span>
                <ArrowRight className="h-3 w-3" />
                <span className="rounded-full bg-green-900 px-2.5 py-1 font-medium">
                  Converted!
                </span>
              </div>
              <p className="text-xs text-amber-700 mt-2">
                When a prospect books a tasting, they automatically convert into a real ChefFlow
                inquiry. &ldquo;Not interested&rdquo; and &ldquo;dead leads&rdquo; get archived but
                stay in your database in case things change later.
              </p>
            </div>

            <div className="rounded-lg bg-blue-950 border border-blue-200 p-4">
              <h4 className="font-medium text-blue-900 text-sm mb-2">Requires Ollama</h4>
              <p className="text-xs text-blue-700">
                AI Scrub uses your local Ollama installation to research prospects. Make sure Ollama
                is running before starting a scrub. Your data never leaves your machine.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Actions */}
      {stats.total > 0 && (
        <div className="flex items-center gap-3">
          <BatchReEnrichButton />
          <ExportCSVButton />
          <FollowUpReminderButton />
        </div>
      )}

      {/* Prospect Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {params.search || params.status || params.region
              ? `Filtered Results (${prospects.length})`
              : `All Prospects (${stats.total})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProspectTable prospects={prospects} />
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-stone-900 rounded-lg border border-stone-700 p-4 flex items-center gap-3">
      {icon}
      <div>
        <p className="text-2xl font-bold text-stone-100">{value}</p>
        <p className="text-xs text-stone-500">{label}</p>
      </div>
    </div>
  )
}
