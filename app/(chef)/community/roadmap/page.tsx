import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { isAdmin } from '@/lib/auth/admin'
import { FeatureBoard } from '@/components/community/feature-board'
import { FeatureAdminPanel } from '@/components/community/feature-admin-panel'
import { RoadmapView } from '@/components/community/roadmap-view'
import { ArrowLeft } from '@/components/ui/icons'
import { getFeatureRequests } from '@/lib/community/feature-voting-actions'

export const metadata: Metadata = { title: 'Feature Board | Community' }

export default async function RoadmapPage() {
  await requireChef()
  const admin = await isAdmin()

  const allFeatures = await getFeatureRequests()
  const planned = allFeatures.filter((f) => f.status === 'planned')
  const inProgress = allFeatures.filter((f) => f.status === 'in_progress')
  const shipped = allFeatures.filter((f) => f.status === 'shipped')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/community"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-300"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold text-stone-100">Feature Board</h1>
      </div>

      <RoadmapView initialData={{ planned, in_progress: inProgress, shipped }} />
      <FeatureBoard initialFeatures={allFeatures} />
      {admin && <FeatureAdminPanel initialFeatures={allFeatures} isAdminUser={admin} />}
    </div>
  )
}
