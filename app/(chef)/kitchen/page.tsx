// Kitchen Mode Page
// Full-screen kitchen display for active service: tasks, timers, and station assignments.
// The KitchenMode component is a full-screen overlay, so this page serves as the launcher.

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { KitchenMode } from '@/components/kitchen/kitchen-mode'

export const metadata: Metadata = { title: 'Kitchen Mode | ChefFlow' }

function KitchenLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <div className="h-12 w-12 rounded-full bg-stone-800 animate-pulse mx-auto" />
        <p className="text-sm text-stone-500">Loading kitchen mode...</p>
      </div>
    </div>
  )
}

export default async function KitchenModePage() {
  await requireChef()

  return (
    <Suspense fallback={<KitchenLoading />}>
      <KitchenMode />
    </Suspense>
  )
}
