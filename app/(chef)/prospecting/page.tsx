// Prospecting Hub — Main prospect database
// Admin-only. Shows all prospects with stats, filtering, and search.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { getProspects, getProspectStats } from '@/lib/prospecting/actions'
import { ProspectTable } from '@/components/prospecting/prospect-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Search, Zap, Phone, Target, CheckCircle, XCircle } from 'lucide-react'

export const metadata: Metadata = { title: 'Prospecting - ChefFlow' }

export default async function ProspectingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category?: string; search?: string; region?: string }>
}) {
  await requireAdmin()
  await requireChef()

  const params = await searchParams
  const [prospects, stats] = await Promise.all([
    getProspects({
      status: params.status || undefined,
      category: params.category || undefined,
      search: params.search || undefined,
      region: params.region || undefined,
    }),
    getProspectStats(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Prospecting Hub</h1>
          <p className="text-stone-600 mt-1">
            AI-powered lead scrubbing and outbound prospecting database
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/prospecting/scrub">
            <Button className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              AI Scrub
            </Button>
          </Link>
          <Link href="/prospecting/queue">
            <Button variant="secondary" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Call Queue
            </Button>
          </Link>
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

      {/* Filter bar */}
      <Card>
        <CardContent className="py-3">
          <form className="flex flex-wrap gap-3 items-center" method="GET">
            <input
              type="text"
              name="search"
              placeholder="Search prospects..."
              defaultValue={params.search ?? ''}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <input
              type="text"
              name="region"
              placeholder="Region..."
              defaultValue={params.region ?? ''}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <select
              name="status"
              defaultValue={params.status ?? ''}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm"
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
    <div className="bg-white rounded-lg border border-stone-200 p-4 flex items-center gap-3">
      {icon}
      <div>
        <p className="text-2xl font-bold text-stone-900">{value}</p>
        <p className="text-xs text-stone-500">{label}</p>
      </div>
    </div>
  )
}
