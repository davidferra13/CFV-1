// The one surface.
//
// This used to be a twenty section compositor. It is now two things: Today, and a box you type
// into. Everything the old page reached for still exists on disk and is still reachable by URL.
// It stopped being the first thing a chef has to wade through.
//
// Route note: the slice spec names app/(chef)/page.tsx, but "/" already belongs to
// app/(public)/page.tsx and a second page at "/" is a build breaking route conflict. The chef's
// real home is /dashboard (lib/auth/route-policy.ts, ROLE_HOME_PATHS.chef), so the one surface
// lives here.

import { Suspense } from 'react'
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { verbExamples } from '@/lib/remy/verbs/registry'
import { OneSurfaceInput } from './_components/one-surface-input'
import { TodayBlock, TodayBlockSkeleton } from './_components/today-block'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

export default async function ChefDashboard() {
  // Same gate every other chef page uses. requireChef also guarantees a tenant id, which is
  // the chef id every read below is scoped to.
  const user = await requireChef()
  const chefId = user.tenantId as string

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <Suspense fallback={<TodayBlockSkeleton />}>
        <TodayBlock chefId={chefId} />
      </Suspense>

      <div className="mt-8 border-t border-stone-200 pt-6 dark:border-stone-800">
        <OneSurfaceInput examples={verbExamples} />
      </div>
    </div>
  )
}
