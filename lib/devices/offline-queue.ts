// Offline Inquiry Queue - stores failed submissions in localStorage and replays when online
// Used by the kiosk inquiry form to handle spotty WiFi at events/pop-ups

const QUEUE_KEY = 'chefflow_kiosk_offline_queue'

export interface QueuedInquiry {
  id: string
  payload: Record<string, unknown>
  token: string
  queuedAt: string
  attempts: number
}

export function getQueuedInquiries(): QueuedInquiry[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function enqueueInquiry(token: string, payload: Record<string, unknown>): void {
  const queue = getQueuedInquiries()
  queue.push({
    id: crypto.randomUUID(),
    payload,
    token,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  })
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

function removeFromQueue(id: string): void {
  const queue = getQueuedInquiries().filter((q) => q.id !== id)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

function incrementAttempts(id: string): void {
  const queue = getQueuedInquiries().map((q) =>
    q.id === id ? { ...q, attempts: q.attempts + 1 } : q
  )
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

/**
 * Attempt to replay all queued inquiries.
 * Returns the number of successfully submitted inquiries.
 * Items that fail after 5 attempts are discarded.
 */
export async function replayQueue(): Promise<number> {
  const queue = getQueuedInquiries()
  if (queue.length === 0) return 0

  let successCount = 0

  for (const item of queue) {
    if (item.attempts >= 5) {
      // Too many failures - discard to prevent stale data buildup
      removeFromQueue(item.id)
      continue
    }

    try {
      const res = await fetch('/api/kiosk/inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${item.token}`,
        },
        body: JSON.stringify(item.payload),
      })

      if (res.ok) {
        removeFromQueue(item.id)
        successCount++
      } else {
        incrementAttempts(item.id)
      }
    } catch {
      incrementAttempts(item.id)
    }
  }

  return successCount
}

export function getQueueSize(): number {
  return getQueuedInquiries().length
}
