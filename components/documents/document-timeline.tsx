'use client'

// Document Lifecycle Timeline
// Shows the full audit trail for a receipt: uploaded -> OCR processed -> reviewed -> approved -> expense created.
// Can be used on receipt detail views and document detail views.

import { format } from 'date-fns'

export type TimelineEvent = {
  id: string
  action: string
  detail: string | null
  timestamp: string
  status: 'completed' | 'current' | 'pending' | 'error'
}

type Props = {
  events: TimelineEvent[]
  compact?: boolean
}

const STATUS_STYLES: Record<TimelineEvent['status'], { dot: string; line: string; text: string }> =
  {
    completed: {
      dot: 'bg-green-500',
      line: 'bg-green-800',
      text: 'text-stone-300',
    },
    current: {
      dot: 'bg-amber-500 animate-pulse',
      line: 'bg-stone-700',
      text: 'text-stone-200 font-medium',
    },
    pending: {
      dot: 'bg-stone-600',
      line: 'bg-stone-700',
      text: 'text-stone-500',
    },
    error: {
      dot: 'bg-red-500',
      line: 'bg-red-900',
      text: 'text-red-400',
    },
  }

export function DocumentTimeline({ events, compact }: Props) {
  if (events.length === 0) return null

  return (
    <div className={compact ? 'space-y-1' : 'space-y-0'}>
      {events.map((event, index) => {
        const styles = STATUS_STYLES[event.status]
        const isLast = index === events.length - 1

        return (
          <div key={event.id} className="flex gap-3">
            {/* Timeline track */}
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${styles.dot}`} />
              {!isLast && <div className={`w-0.5 flex-1 min-h-[16px] ${styles.line}`} />}
            </div>

            {/* Content */}
            <div className={`pb-3 ${isLast ? '' : ''}`}>
              <p className={`text-sm ${styles.text}`}>{event.action}</p>
              {event.detail && <p className="text-xs text-stone-500 mt-0.5">{event.detail}</p>}
              <p className="text-[10px] text-stone-600 mt-0.5">
                {format(new Date(event.timestamp), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Build timeline events for a receipt based on its current state.
 */
export function buildReceiptTimeline(receipt: {
  createdAt: string
  uploadStatus: string
  approvedAt: string | null
  extraction?: {
    storeName: string | null
    extractionConfidence: number | null
  } | null
}): TimelineEvent[] {
  const events: TimelineEvent[] = []
  const now = new Date().toISOString()

  // 1. Uploaded
  events.push({
    id: 'uploaded',
    action: 'Receipt uploaded',
    detail: null,
    timestamp: receipt.createdAt,
    status: 'completed',
  })

  // 2. OCR Processing
  if (receipt.uploadStatus === 'processing') {
    events.push({
      id: 'ocr',
      action: 'Processing OCR extraction',
      detail: 'Analyzing receipt image...',
      timestamp: now,
      status: 'current',
    })
    return events
  }

  if (receipt.uploadStatus === 'pending') {
    events.push({
      id: 'ocr',
      action: 'Awaiting OCR extraction',
      detail: 'Queued for processing',
      timestamp: now,
      status: 'pending',
    })
    return events
  }

  // OCR completed
  const confidenceLabel = receipt.extraction?.extractionConfidence
    ? receipt.extraction.extractionConfidence >= 0.8
      ? 'high confidence'
      : receipt.extraction.extractionConfidence >= 0.5
        ? 'medium confidence'
        : 'low confidence'
    : null

  events.push({
    id: 'ocr',
    action: `Data extracted${receipt.extraction?.storeName ? ` from ${receipt.extraction.storeName}` : ''}`,
    detail: confidenceLabel ? `Extraction: ${confidenceLabel}` : null,
    timestamp: receipt.createdAt, // Approximate; extraction time not stored separately
    status: 'completed',
  })

  // 3. Review status
  if (receipt.uploadStatus === 'needs_review') {
    events.push({
      id: 'review',
      action: 'Needs manual review',
      detail: 'Low confidence extraction. Please verify the data.',
      timestamp: now,
      status: 'current',
    })
    return events
  }

  if (receipt.uploadStatus === 'extracted') {
    events.push({
      id: 'review',
      action: 'Ready for approval',
      detail: 'Review line items and approve to create expenses',
      timestamp: now,
      status: 'current',
    })
    return events
  }

  // 4. Approved
  if (receipt.uploadStatus === 'approved' && receipt.approvedAt) {
    events.push({
      id: 'approved',
      action: 'Approved',
      detail: 'Business items added to expenses',
      timestamp: receipt.approvedAt,
      status: 'completed',
    })

    events.push({
      id: 'expense',
      action: 'Expenses created',
      detail: 'Business line items copied to expense records',
      timestamp: receipt.approvedAt,
      status: 'completed',
    })
  }

  return events
}
