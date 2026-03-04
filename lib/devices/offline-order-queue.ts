const ORDER_QUEUE_KEY = 'chefflow_kiosk_order_queue'

function readClientCheckoutId(payload: Record<string, unknown>): string | null {
  const candidate = payload.client_checkout_id
  if (typeof candidate !== 'string') return null
  const normalized = candidate.trim()
  return normalized.length > 0 ? normalized : null
}

export interface QueuedOrderCheckout {
  id: string
  token: string
  payload: Record<string, unknown>
  queuedAt: string
  attempts: number
}

export function getQueuedOrderCheckouts(): QueuedOrderCheckout[] {
  try {
    const raw = localStorage.getItem(ORDER_QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function enqueueOrderCheckout(token: string, payload: Record<string, unknown>): void {
  const queue = getQueuedOrderCheckouts()
  const clientCheckoutId = readClientCheckoutId(payload)
  if (
    clientCheckoutId &&
    queue.some(
      (item) =>
        item.token === token && readClientCheckoutId(item.payload) === clientCheckoutId
    )
  ) {
    return
  }

  queue.push({
    id: crypto.randomUUID(),
    token,
    payload,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  })
  localStorage.setItem(ORDER_QUEUE_KEY, JSON.stringify(queue))
}

function removeFromQueue(id: string): void {
  const queue = getQueuedOrderCheckouts().filter((item) => item.id !== id)
  localStorage.setItem(ORDER_QUEUE_KEY, JSON.stringify(queue))
}

function incrementAttempts(id: string): void {
  const queue = getQueuedOrderCheckouts().map((item) =>
    item.id === id ? { ...item, attempts: item.attempts + 1 } : item
  )
  localStorage.setItem(ORDER_QUEUE_KEY, JSON.stringify(queue))
}

export async function replayOrderCheckoutQueue(): Promise<number> {
  const queue = getQueuedOrderCheckouts()
  if (queue.length === 0) return 0

  let successCount = 0

  for (const item of queue) {
    if (item.attempts >= 5) {
      removeFromQueue(item.id)
      continue
    }

    try {
      const response = await fetch('/api/kiosk/order/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${item.token}`,
        },
        body: JSON.stringify(item.payload),
      })

      if (response.ok) {
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

export function getOrderQueueSize(): number {
  return getQueuedOrderCheckouts().length
}
