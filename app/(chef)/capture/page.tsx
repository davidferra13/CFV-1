import { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import {
  getInstantNoteActions,
  getInstantNoteReviewQueue,
} from '@/lib/quick-notes/intelligence-actions'
import { WhiteboardCapture } from './whiteboard-capture'

export const metadata: Metadata = {
  title: 'Capture | ChefFlow',
}

export default async function CapturePage() {
  await requireChef()

  let reviewQueue: Awaited<ReturnType<typeof getInstantNoteReviewQueue>> = []
  let trackedActions: Awaited<ReturnType<typeof getInstantNoteActions>> = []
  let loadError: string | null = null

  try {
    ;[reviewQueue, trackedActions] = await Promise.all([
      getInstantNoteReviewQueue(),
      getInstantNoteActions(12),
    ])
  } catch (err) {
    console.error('[CapturePage] note intelligence load failed:', err)
    loadError = 'Note intelligence could not be loaded. Raw capture still works.'
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Capture</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Drop a thought, save the raw note, and let ChefFlow turn it into routed work.
        </p>
      </div>
      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
          {loadError}
        </div>
      ) : null}
      <WhiteboardCapture initialReviewQueue={reviewQueue} initialTrackedActions={trackedActions} />
    </div>
  )
}
