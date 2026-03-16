// Prospecting Clusters - Geographic Grouping
// Groups prospects by region for efficient route-based outreach planning.

import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { getGeoClusters } from '@/lib/prospecting/pipeline-actions'
import { GeoClusterView } from '@/components/prospecting/geo-cluster-view'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Prospect Clusters - ChefFlow' }

export default async function ClustersPage() {
  await requireAdmin()
  await requireChef()

  const clusters = await getGeoClusters()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/prospecting"
          className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 mb-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Prospects
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">Geographic Clusters</h1>
        <p className="text-stone-400 mt-1">
          Prospects grouped by region for efficient outreach days
        </p>
      </div>

      <GeoClusterView clusters={clusters} />
    </div>
  )
}
