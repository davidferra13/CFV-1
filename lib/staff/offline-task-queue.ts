// Offline Task Queue - stores task completions in localStorage when offline
// and replays them when connectivity returns.
// Pattern follows lib/devices/offline-queue.ts (kiosk offline queue).

const QUEUE_KEY = 'chefflow_staff_task_queue'
const MAX_QUEUE_SIZE = 50
const MAX_ATTEMPTS = 5

export interface QueuedTaskAction {
  id: string
  taskId: string
  action: 'complete' | 'uncomplete'
  timestamp: string
  attempts: number
}

export function getQueuedActions(): QueuedTaskAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveQueue(queue: QueuedTaskAction[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

/**
 * Add a task action to the offline queue.
 * If the queue already has an entry for the same taskId, replace it
 * (only the latest toggle matters).
 * Enforces a max of 50 queued items.
 */
export function enqueueTaskAction(
  taskId: string,
  action: 'complete' | 'uncomplete'
): void {
  let queue = getQueuedActions()

  // Deduplicate: remove any existing entry for this task
  queue = queue.filter((q) => q.taskId !== taskId)

  // Enforce max size (drop oldest if full)
  if (queue.length >= MAX_QUEUE_SIZE) {
    queue = queue.slice(queue.length - MAX_QUEUE_SIZE + 1)
  }

  queue.push({
    id: crypto.randomUUID(),
    taskId,
    action,
    timestamp: new Date().toISOString(),
    attempts: 0,
  })

  saveQueue(queue)
}

function removeFromQueue(id: string): void {
  const queue = getQueuedActions().filter((q) => q.id !== id)
  saveQueue(queue)
}

function incrementAttempts(id: string): void {
  const queue = getQueuedActions().map((q) =>
    q.id === id ? { ...q, attempts: q.attempts + 1 } : q
  )
  saveQueue(queue)
}

/**
 * Check whether a specific task has a queued (pending) action.
 */
export function isTaskQueued(taskId: string): boolean {
  return getQueuedActions().some((q) => q.taskId === taskId)
}

/**
 * Get the queued action for a specific task, if any.
 */
export function getQueuedActionForTask(
  taskId: string
): QueuedTaskAction | undefined {
  return getQueuedActions().find((q) => q.taskId === taskId)
}

export function getQueueSize(): number {
  return getQueuedActions().length
}

/**
 * Replay all queued task actions by calling the provided executor.
 * The executor should call the appropriate server action.
 * Returns the number of successfully replayed actions.
 * Items that fail after 5 attempts are discarded.
 */
export async function replayTaskQueue(
  executor: (taskId: string, action: 'complete' | 'uncomplete') => Promise<void>
): Promise<number> {
  const queue = getQueuedActions()
  if (queue.length === 0) return 0

  let successCount = 0

  for (const item of queue) {
    if (item.attempts >= MAX_ATTEMPTS) {
      removeFromQueue(item.id)
      continue
    }

    try {
      await executor(item.taskId, item.action)
      removeFromQueue(item.id)
      successCount++
    } catch {
      incrementAttempts(item.id)
    }
  }

  return successCount
}
