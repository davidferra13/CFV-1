import { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import {
  getInstantNoteActions,
  getInstantNoteContextBindings,
  getInstantNoteDigestItems,
  getInstantNoteLearningRules,
  getInstantNoteReviewQueue,
  getInstantNoteRouteAdapters,
  getInstantNoteSeasonalityWindows,
  getInstantNoteSummary,
  getInstantNoteTraceLinks,
  getInstantNoteThreads,
  getInstantNoteWatchdogEvents,
} from '@/lib/quick-notes/intelligence-actions'
import { WhiteboardCapture } from './whiteboard-capture'

export const metadata: Metadata = {
  title: 'Capture | ChefFlow',
}

export default async function CapturePage() {
  await requireChef()

  let reviewQueue: Awaited<ReturnType<typeof getInstantNoteReviewQueue>> = []
  let trackedActions: Awaited<ReturnType<typeof getInstantNoteActions>> = []
  let traceLinks: Awaited<ReturnType<typeof getInstantNoteTraceLinks>> = []
  let learningRules: Awaited<ReturnType<typeof getInstantNoteLearningRules>> = []
  let threads: Awaited<ReturnType<typeof getInstantNoteThreads>> = []
  let digestItems: Awaited<ReturnType<typeof getInstantNoteDigestItems>> = []
  let watchdogEvents: Awaited<ReturnType<typeof getInstantNoteWatchdogEvents>> = []
  let contextBindings: Awaited<ReturnType<typeof getInstantNoteContextBindings>> = []
  let routeAdapters: Awaited<ReturnType<typeof getInstantNoteRouteAdapters>> = []
  let seasonalityWindows: Awaited<ReturnType<typeof getInstantNoteSeasonalityWindows>> = []
  let summary: Awaited<ReturnType<typeof getInstantNoteSummary>> | null = null
  let loadError: string | null = null

  try {
    ;[
      reviewQueue,
      trackedActions,
      traceLinks,
      learningRules,
      threads,
      digestItems,
      watchdogEvents,
      contextBindings,
      routeAdapters,
      seasonalityWindows,
      summary,
    ] = await Promise.all([
      getInstantNoteReviewQueue(),
      getInstantNoteActions(12),
      getInstantNoteTraceLinks(30),
      getInstantNoteLearningRules(8),
      getInstantNoteThreads(12),
      getInstantNoteDigestItems(12),
      getInstantNoteWatchdogEvents(12),
      getInstantNoteContextBindings(20),
      getInstantNoteRouteAdapters(20),
      getInstantNoteSeasonalityWindows(12),
      getInstantNoteSummary(),
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
      <WhiteboardCapture
        initialReviewQueue={reviewQueue}
        initialTrackedActions={trackedActions}
        initialTraceLinks={traceLinks}
        initialLearningRules={learningRules}
        initialThreads={threads}
        initialDigestItems={digestItems}
        initialWatchdogEvents={watchdogEvents}
        initialContextBindings={contextBindings}
        initialRouteAdapters={routeAdapters}
        initialSeasonalityWindows={seasonalityWindows}
        initialSummary={summary}
      />
    </div>
  )
}
