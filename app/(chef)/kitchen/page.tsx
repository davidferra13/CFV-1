// Kitchen Mode Page
// Full-screen kitchen display for active service: steps derived from today's confirmed/in-progress event menu.

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { getKitchenModeContext } from '@/lib/kitchen/kitchen-steps-actions'
import { KitchenModeLauncher } from './kitchen-mode-launcher'

export const metadata: Metadata = { title: 'Kitchen Mode' }

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

async function KitchenContent({ eventId }: { eventId?: string }) {
  const context = await getKitchenModeContext(eventId)
  return <KitchenModeLauncher context={context} />
}

export default async function KitchenModePage({
  searchParams,
}: {
  searchParams: { eventId?: string }
}) {
  await requireChef()

  return (
    <Suspense fallback={<KitchenLoading />}>
      <KitchenContent eventId={searchParams.eventId} />
    </Suspense>
  )
}
