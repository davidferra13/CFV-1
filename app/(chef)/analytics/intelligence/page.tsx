import { Suspense } from 'react'
import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { requireChef } from '@/lib/auth/get-user'

const IntelligenceHubContent = dynamic(
  () => import('@/components/intelligence/intelligence-hub').then((m) => m.IntelligenceHubContent),
  {
    loading: () => (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    ),
  }
)

export const metadata: Metadata = {
  title: 'Intelligence',
  description: '24 deterministic intelligence engines analyzing your real business data',
}

export default async function IntelligenceSubPage() {
  await requireChef()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Intelligence</h1>
        <p className="text-muted-foreground mt-1">
          24 intelligence engines working for you. All deterministic, all instant, all from your
          real data.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        }
      >
        <IntelligenceHubContent />
      </Suspense>
    </div>
  )
}
