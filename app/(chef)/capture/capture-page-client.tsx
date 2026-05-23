'use client'

import { useRouter } from 'next/navigation'
import { WhiteboardCapture } from './whiteboard-capture'
import { CaptureInbox } from './capture-inbox'
import { MobileFieldCaptureShell } from './mobile-field-capture-shell'
import type { Capture } from '@/lib/capture/actions'

export function CapturePageClient({ initialCaptures }: { initialCaptures: Capture[] }) {
  const router = useRouter()

  return (
    <div className="space-y-8">
      <MobileFieldCaptureShell />
      <WhiteboardCapture onCaptureSaved={() => router.refresh()} />
      <hr className="border-stone-200 dark:border-stone-800" />
      <CaptureInbox initialCaptures={initialCaptures} />
    </div>
  )
}
