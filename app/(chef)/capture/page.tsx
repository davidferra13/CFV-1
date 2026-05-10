import { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getCaptures } from '@/lib/capture/actions'
import { CapturePageClient } from './capture-page-client'

export const metadata: Metadata = {
  title: 'Capture | ChefFlow',
}

export default async function CapturePage() {
  await requireChef()
  const captures = await getCaptures({ limit: 50 })

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Capture</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Snap your whiteboard, notes, or recipe cards. Everything gets structured and routed.
        </p>
      </div>
      <CapturePageClient initialCaptures={captures} />
    </div>
  )
}
