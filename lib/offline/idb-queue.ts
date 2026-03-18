// IndexedDB Offline Queue - stores pending actions when offline.
// Actions are replayed in order when connectivity returns.
// Uses raw IndexedDB (no dependencies) for maximum reliability.

const DB_NAME = 'chefflow-offline'
const DB_VERSION = 1
const STORE_NAME = 'pending-actions'

export interface QueuedAction {
  id: string
  /** Server action module path (e.g. 'events/actions') */
  actionName: string
  /** Serializable arguments for the server action */
  args: unknown[]
  /** ISO timestamp when the action was queued */
  queuedAt: string
  /** Number of replay attempts so far */
  retries: number
  /** 'pending' | 'syncing' | 'failed' */
  status: 'pending' | 'syncing' | 'failed'
  /** Last error message if failed */
  lastError?: string
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('by-status', 'status', { unique: false })
        store.createIndex('by-queued', 'queuedAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Generate a unique ID for a queued action */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** Add a new action to the offline queue */
export async function enqueueAction(actionName: string, args: unknown[]): Promise<string> {
  const db = await openDB()
  const id = generateId()
  const action: QueuedAction = {
    id,
    actionName,
    args,
    queuedAt: new Date().toISOString(),
    retries: 0,
    status: 'pending',
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).add(action)
    tx.oncomplete = () => {
      db.close()
      resolve(id)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/** Get all pending actions in queue order (oldest first) */
export async function getPendingActions(): Promise<QueuedAction[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const index = tx.objectStore(STORE_NAME).index('by-queued')
    const request = index.getAll()

    request.onsuccess = () => {
      db.close()
      const all = request.result as QueuedAction[]
      resolve(all.filter((a) => a.status === 'pending'))
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/** Get count of all pending actions */
export async function getPendingCount(): Promise<number> {
  const actions = await getPendingActions()
  return actions.length
}

/** Get all actions regardless of status */
export async function getAllActions(): Promise<QueuedAction[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const index = tx.objectStore(STORE_NAME).index('by-queued')
    const request = index.getAll()

    request.onsuccess = () => {
      db.close()
      resolve(request.result as QueuedAction[])
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/** Update an action's status */
export async function updateActionStatus(
  id: string,
  status: QueuedAction['status'],
  lastError?: string
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getReq = store.get(id)

    getReq.onsuccess = () => {
      const action = getReq.result as QueuedAction | undefined
      if (!action) {
        db.close()
        resolve()
        return
      }
      action.status = status
      if (status === 'syncing' || status === 'failed') {
        action.retries += 1
      }
      if (lastError) {
        action.lastError = lastError
      }
      store.put(action)
    }

    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/** Remove a successfully synced action from the queue */
export async function removeAction(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/** Clear all completed/failed actions */
export async function clearCompleted(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => {
      const all = request.result as QueuedAction[]
      for (const action of all) {
        if (action.status === 'failed') {
          store.delete(action.id)
        }
      }
    }

    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/** Check if IndexedDB is available */
export function isIDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined'
  } catch {
    return false
  }
}
