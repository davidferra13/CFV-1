/**
 * Remy Local Storage — IndexedDB wrapper for browser-local conversation storage.
 *
 * Privacy by architecture: conversations are stored ONLY in the browser.
 * ChefFlow's servers never see or store conversation content.
 *
 * - Persists across page refreshes (same device/browser)
 * - Does NOT sync across devices (this is a feature, not a bug)
 * - Chef can clear all history at any time
 * - "Send to Support" exports a specific conversation for voluntary sharing
 */

const DB_NAME = 'chefflow-remy'
const DB_VERSION = 1
const CONVERSATIONS_STORE = 'conversations'
const MESSAGES_STORE = 'messages'

// ─── Types ──────────────────────────────────────────────────────────

export interface LocalConversation {
  id: string
  title: string
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  messageCount: number
  /** Feature category for anonymous metrics (no content sent) */
  category?: 'recipe' | 'event' | 'client' | 'menu' | 'finance' | 'general'
}

export interface LocalMessage {
  id: string
  conversationId: string
  role: 'user' | 'remy'
  content: string
  tasks?: unknown // task result cards
  navSuggestions?: unknown // navigation suggestions
  createdAt: string // ISO timestamp
}

/** Exportable format for "Send to Support" */
export interface ExportedConversation {
  conversationId: string
  title: string
  messages: Array<{
    role: 'user' | 'remy'
    content: string
    createdAt: string
  }>
  exportedAt: string
}

// ─── Database ───────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(CONVERSATIONS_STORE)) {
        const convStore = db.createObjectStore(CONVERSATIONS_STORE, { keyPath: 'id' })
        convStore.createIndex('by-updated', 'updatedAt', { unique: false })
      }

      if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
        const msgStore = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id' })
        msgStore.createIndex('by-conversation', 'conversationId', { unique: false })
        msgStore.createIndex('by-created', 'createdAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Conversation CRUD ──────────────────────────────────────────────

export async function createConversation(title = 'New conversation'): Promise<LocalConversation> {
  const db = await openDB()
  const now = new Date().toISOString()
  const conversation: LocalConversation = {
    id: generateId(),
    title,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    category: 'general',
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONVERSATIONS_STORE, 'readwrite')
    tx.objectStore(CONVERSATIONS_STORE).add(conversation)
    tx.oncomplete = () => {
      db.close()
      resolve(conversation)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export async function getConversations(): Promise<LocalConversation[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONVERSATIONS_STORE, 'readonly')
    const index = tx.objectStore(CONVERSATIONS_STORE).index('by-updated')
    const request = index.getAll()

    request.onsuccess = () => {
      db.close()
      // Most recent first
      const results = (request.result as LocalConversation[]).reverse()
      resolve(results)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function getConversation(id: string): Promise<LocalConversation | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONVERSATIONS_STORE, 'readonly')
    const request = tx.objectStore(CONVERSATIONS_STORE).get(id)
    request.onsuccess = () => {
      db.close()
      resolve(request.result ?? null)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function updateConversation(
  id: string,
  updates: Partial<Pick<LocalConversation, 'title' | 'category'>>
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONVERSATIONS_STORE, 'readwrite')
    const store = tx.objectStore(CONVERSATIONS_STORE)
    const getReq = store.get(id)

    getReq.onsuccess = () => {
      const conv = getReq.result as LocalConversation | undefined
      if (!conv) {
        db.close()
        resolve()
        return
      }
      store.put({
        ...conv,
        ...updates,
        updatedAt: new Date().toISOString(),
      })
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

export async function deleteConversation(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readwrite')

    // Delete the conversation
    tx.objectStore(CONVERSATIONS_STORE).delete(id)

    // Delete all messages in this conversation
    const msgStore = tx.objectStore(MESSAGES_STORE)
    const index = msgStore.index('by-conversation')
    const cursorReq = index.openCursor(IDBKeyRange.only(id))

    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
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

// ─── Message CRUD ───────────────────────────────────────────────────

export async function addMessage(
  conversationId: string,
  role: 'user' | 'remy',
  content: string,
  extras?: { tasks?: unknown; navSuggestions?: unknown }
): Promise<LocalMessage> {
  const db = await openDB()
  const now = new Date().toISOString()
  const message: LocalMessage = {
    id: generateId(),
    conversationId,
    role,
    content,
    tasks: extras?.tasks,
    navSuggestions: extras?.navSuggestions,
    createdAt: now,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readwrite')

    // Add the message
    tx.objectStore(MESSAGES_STORE).add(message)

    // Update conversation's updatedAt and messageCount
    const convStore = tx.objectStore(CONVERSATIONS_STORE)
    const getReq = convStore.get(conversationId)
    getReq.onsuccess = () => {
      const conv = getReq.result as LocalConversation | undefined
      if (conv) {
        convStore.put({
          ...conv,
          updatedAt: now,
          messageCount: conv.messageCount + 1,
        })
      }
    }

    tx.oncomplete = () => {
      db.close()
      resolve(message)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export async function getMessages(conversationId: string): Promise<LocalMessage[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MESSAGES_STORE, 'readonly')
    const index = tx.objectStore(MESSAGES_STORE).index('by-conversation')
    const request = index.getAll(IDBKeyRange.only(conversationId))

    request.onsuccess = () => {
      db.close()
      const messages = (request.result as LocalMessage[]).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      resolve(messages)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

// ─── Export for Support ─────────────────────────────────────────────

export async function exportConversation(
  conversationId: string
): Promise<ExportedConversation | null> {
  const conv = await getConversation(conversationId)
  if (!conv) return null

  const messages = await getMessages(conversationId)

  return {
    conversationId: conv.id,
    title: conv.title,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
    exportedAt: new Date().toISOString(),
  }
}

// ─── Bulk Operations ────────────────────────────────────────────────

/** Clear all Remy conversation history from this browser */
export async function clearAllHistory(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([CONVERSATIONS_STORE, MESSAGES_STORE], 'readwrite')
    tx.objectStore(CONVERSATIONS_STORE).clear()
    tx.objectStore(MESSAGES_STORE).clear()
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

/** Get total conversation count (for anonymous metrics) */
export async function getConversationCount(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CONVERSATIONS_STORE, 'readonly')
    const request = tx.objectStore(CONVERSATIONS_STORE).count()
    request.onsuccess = () => {
      db.close()
      resolve(request.result)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

/** Check if IndexedDB is available for local storage */
export function isLocalStorageAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined'
  } catch {
    return false
  }
}
