/**
 * Remy Local Storage — IndexedDB wrapper for browser-local conversation storage.
 *
 * Privacy by architecture: conversations are stored ONLY in the browser.
 * ChefFlow's servers never see or store conversation content.
 *
 * v2 Hierarchy: Project → Conversation → Message
 * Extras: Templates, Action Log, Bookmarks, Search, Export
 *
 * - Persists across page refreshes (same device/browser)
 * - Does NOT sync across devices (this is a feature, not a bug)
 * - Chef can clear all history at any time
 * - "Send to Support" exports a specific conversation for voluntary sharing
 */

import type { LocalProject, LocalTemplate, ActionLogEntry, SearchResult } from './remy-types'

const DB_NAME = 'chefflow-remy'
const DB_VERSION = 2
const STORES = {
  conversations: 'conversations',
  messages: 'messages',
  projects: 'projects',
  templates: 'templates',
  actionLog: 'actionLog',
}

// ─── Types ──────────────────────────────────────────────────────────

export interface LocalConversation {
  id: string
  title: string
  projectId: string | null
  pinned: boolean
  archived: boolean
  bookmarkCount: number
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
  bookmarked: boolean
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

    request.onupgradeneeded = (event) => {
      const db = request.result
      const oldVersion = event.oldVersion

      // ── v1 stores (conversations + messages) ──
      if (oldVersion < 1) {
        const convStore = db.createObjectStore(STORES.conversations, { keyPath: 'id' })
        convStore.createIndex('by-updated', 'updatedAt', { unique: false })
        convStore.createIndex('by-project', 'projectId', { unique: false })

        const msgStore = db.createObjectStore(STORES.messages, { keyPath: 'id' })
        msgStore.createIndex('by-conversation', 'conversationId', { unique: false })
        msgStore.createIndex('by-created', 'createdAt', { unique: false })
        msgStore.createIndex('by-bookmarked', 'bookmarked', { unique: false })
      }

      // ── v2 stores (projects, templates, actionLog) + field migration ──
      if (oldVersion < 2) {
        // Add new stores
        if (!db.objectStoreNames.contains(STORES.projects)) {
          const projStore = db.createObjectStore(STORES.projects, { keyPath: 'id' })
          projStore.createIndex('by-updated', 'updatedAt', { unique: false })
          projStore.createIndex('by-sort', 'sortOrder', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.templates)) {
          const tmplStore = db.createObjectStore(STORES.templates, { keyPath: 'id' })
          tmplStore.createIndex('by-sort', 'sortOrder', { unique: false })
        }

        if (!db.objectStoreNames.contains(STORES.actionLog)) {
          const logStore = db.createObjectStore(STORES.actionLog, { keyPath: 'id' })
          logStore.createIndex('by-conversation', 'conversationId', { unique: false })
          logStore.createIndex('by-created', 'createdAt', { unique: false })
        }

        // Add indexes to existing stores if upgrading from v1
        if (oldVersion >= 1) {
          const convStore = request.transaction!.objectStore(STORES.conversations)
          if (!convStore.indexNames.contains('by-project')) {
            convStore.createIndex('by-project', 'projectId', { unique: false })
          }

          const msgStore = request.transaction!.objectStore(STORES.messages)
          if (!msgStore.indexNames.contains('by-bookmarked')) {
            msgStore.createIndex('by-bookmarked', 'bookmarked', { unique: false })
          }

          // Migrate existing conversations: add new fields
          const cursorReq = convStore.openCursor()
          cursorReq.onsuccess = () => {
            const cursor = cursorReq.result
            if (cursor) {
              const conv = cursor.value
              if (conv.projectId === undefined) conv.projectId = null
              if (conv.pinned === undefined) conv.pinned = false
              if (conv.archived === undefined) conv.archived = false
              if (conv.bookmarkCount === undefined) conv.bookmarkCount = 0
              cursor.update(conv)
              cursor.continue()
            }
          }

          // Migrate existing messages: add bookmarked field
          const msgCursorReq = msgStore.openCursor()
          msgCursorReq.onsuccess = () => {
            const cursor = msgCursorReq.result
            if (cursor) {
              const msg = cursor.value
              if (msg.bookmarked === undefined) msg.bookmarked = false
              cursor.update(msg)
              cursor.continue()
            }
          }
        }
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Project CRUD ──────────────────────────────────────────────────

export async function createProject(name: string, icon = '📁'): Promise<LocalProject> {
  const db = await openDB()
  const now = new Date().toISOString()
  const project: LocalProject = {
    id: generateId(),
    name,
    icon,
    createdAt: now,
    updatedAt: now,
    sortOrder: Date.now(),
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.projects, 'readwrite')
    tx.objectStore(STORES.projects).add(project)
    tx.oncomplete = () => {
      db.close()
      resolve(project)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export async function getProjects(): Promise<LocalProject[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.projects, 'readonly')
    const request = tx.objectStore(STORES.projects).index('by-sort').getAll()
    request.onsuccess = () => {
      db.close()
      resolve((request.result as LocalProject[]) || [])
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function getProject(id: string): Promise<LocalProject | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.projects, 'readonly')
    const request = tx.objectStore(STORES.projects).get(id)
    request.onsuccess = () => {
      db.close()
      resolve((request.result as LocalProject) ?? null)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function updateProject(
  id: string,
  updates: Partial<Pick<LocalProject, 'name' | 'icon' | 'sortOrder'>>
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.projects, 'readwrite')
    const store = tx.objectStore(STORES.projects)
    const getReq = store.get(id)

    getReq.onsuccess = () => {
      const project = getReq.result as LocalProject | undefined
      if (!project) {
        db.close()
        resolve()
        return
      }
      store.put({ ...project, ...updates, updatedAt: new Date().toISOString() })
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

export async function deleteProject(
  id: string,
  moveConversationsTo: string | null = null
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.projects, STORES.conversations], 'readwrite')

    // Delete the project
    tx.objectStore(STORES.projects).delete(id)

    // Reassign conversations to the target project (or uncategorized if null)
    const convStore = tx.objectStore(STORES.conversations)
    const allConvReq = convStore.getAll()

    allConvReq.onsuccess = () => {
      const convs = (allConvReq.result || []) as LocalConversation[]
      for (const conv of convs) {
        if (conv.projectId === id) {
          conv.projectId = moveConversationsTo
          convStore.put(conv)
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

// ─── Conversation CRUD ──────────────────────────────────────────────

export async function createConversation(
  title = 'New conversation',
  projectId: string | null = null
): Promise<LocalConversation> {
  const db = await openDB()
  const now = new Date().toISOString()
  const conversation: LocalConversation = {
    id: generateId(),
    title,
    projectId,
    pinned: false,
    archived: false,
    bookmarkCount: 0,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    category: 'general',
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.conversations, 'readwrite')
    tx.objectStore(STORES.conversations).add(conversation)
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

export async function getConversations(includeArchived = false): Promise<LocalConversation[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.conversations, 'readonly')
    const request = tx.objectStore(STORES.conversations).getAll()

    request.onsuccess = () => {
      db.close()
      let results = (request.result as LocalConversation[]) || []

      // Filter archived unless requested
      if (!includeArchived) {
        results = results.filter((c) => !c.archived)
      }

      // Sort: pinned first, then by updatedAt descending
      results.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })

      resolve(results)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function getArchivedConversations(): Promise<LocalConversation[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.conversations, 'readonly')
    const request = tx.objectStore(STORES.conversations).getAll()
    request.onsuccess = () => {
      db.close()
      const results = ((request.result as LocalConversation[]) || [])
        .filter((c) => c.archived)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
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
    const tx = db.transaction(STORES.conversations, 'readonly')
    const request = tx.objectStore(STORES.conversations).get(id)
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
  updates: Partial<
    Pick<LocalConversation, 'title' | 'category' | 'projectId' | 'pinned' | 'archived'>
  >
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.conversations, 'readwrite')
    const store = tx.objectStore(STORES.conversations)
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
    const tx = db.transaction(
      [STORES.conversations, STORES.messages, STORES.actionLog],
      'readwrite'
    )

    // Delete the conversation
    tx.objectStore(STORES.conversations).delete(id)

    // Delete all messages in this conversation
    const msgStore = tx.objectStore(STORES.messages)
    const msgIndex = msgStore.index('by-conversation')
    const msgCursorReq = msgIndex.openCursor(IDBKeyRange.only(id))

    msgCursorReq.onsuccess = () => {
      const cursor = msgCursorReq.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    // Delete all action log entries for this conversation
    const logStore = tx.objectStore(STORES.actionLog)
    const logIndex = logStore.index('by-conversation')
    const logCursorReq = logIndex.openCursor(IDBKeyRange.only(id))

    logCursorReq.onsuccess = () => {
      const cursor = logCursorReq.result
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

// ─── Pin / Archive / Move ──────────────────────────────────────────

export async function togglePin(id: string): Promise<boolean> {
  const conv = await getConversation(id)
  if (!conv) return false
  const newPinned = !conv.pinned
  await updateConversation(id, { pinned: newPinned })
  return newPinned
}

export async function toggleArchive(id: string): Promise<boolean> {
  const conv = await getConversation(id)
  if (!conv) return false
  const newArchived = !conv.archived
  await updateConversation(id, { archived: newArchived })
  return newArchived
}

export async function moveConversation(
  conversationId: string,
  targetProjectId: string | null
): Promise<void> {
  await updateConversation(conversationId, { projectId: targetProjectId })
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
    bookmarked: false,
    tasks: extras?.tasks,
    navSuggestions: extras?.navSuggestions,
    createdAt: now,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.conversations, STORES.messages], 'readwrite')

    // Add the message
    tx.objectStore(STORES.messages).add(message)

    // Update conversation's updatedAt and messageCount
    const convStore = tx.objectStore(STORES.conversations)
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
    const tx = db.transaction(STORES.messages, 'readonly')
    const index = tx.objectStore(STORES.messages).index('by-conversation')
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

export async function deleteMessage(messageId: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.messages, STORES.conversations], 'readwrite')
    const msgStore = tx.objectStore(STORES.messages)

    const getReq = msgStore.get(messageId)
    getReq.onsuccess = () => {
      const msg = getReq.result as LocalMessage | undefined
      if (msg) {
        msgStore.delete(messageId)

        // Update conversation counts
        const convStore = tx.objectStore(STORES.conversations)
        const convReq = convStore.get(msg.conversationId)
        convReq.onsuccess = () => {
          const conv = convReq.result as LocalConversation | undefined
          if (conv) {
            conv.messageCount = Math.max(0, conv.messageCount - 1)
            if (msg.bookmarked) {
              conv.bookmarkCount = Math.max(0, conv.bookmarkCount - 1)
            }
            convStore.put(conv)
          }
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

// ─── Bookmarks ─────────────────────────────────────────────────────

export async function toggleBookmark(messageId: string): Promise<boolean> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.messages, STORES.conversations], 'readwrite')
    const msgStore = tx.objectStore(STORES.messages)
    const getReq = msgStore.get(messageId)

    let newBookmarked = false

    getReq.onsuccess = () => {
      const msg = getReq.result as LocalMessage | undefined
      if (!msg) return
      const wasBookmarked = msg.bookmarked
      newBookmarked = !wasBookmarked
      msg.bookmarked = newBookmarked
      msgStore.put(msg)

      // Update conversation bookmark count
      const convStore = tx.objectStore(STORES.conversations)
      const convReq = convStore.get(msg.conversationId)
      convReq.onsuccess = () => {
        const conv = convReq.result as LocalConversation | undefined
        if (conv) {
          conv.bookmarkCount = Math.max(0, (conv.bookmarkCount || 0) + (wasBookmarked ? -1 : 1))
          convStore.put(conv)
        }
      }
    }

    tx.oncomplete = () => {
      db.close()
      resolve(newBookmarked)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export async function getBookmarkedMessages(): Promise<LocalMessage[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.messages, 'readonly')
    const request = tx.objectStore(STORES.messages).getAll()

    request.onsuccess = () => {
      db.close()
      const bookmarked = ((request.result as LocalMessage[]) || [])
        .filter((m) => m.bookmarked)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      resolve(bookmarked)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

// ─── Template CRUD ─────────────────────────────────────────────────

export async function createTemplate(
  name: string,
  prompt: string,
  projectId: string | null = null,
  icon = '⚡'
): Promise<LocalTemplate> {
  const db = await openDB()
  const template: LocalTemplate = {
    id: generateId(),
    name,
    prompt,
    projectId,
    icon,
    sortOrder: Date.now(),
    createdAt: new Date().toISOString(),
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.templates, 'readwrite')
    tx.objectStore(STORES.templates).add(template)
    tx.oncomplete = () => {
      db.close()
      resolve(template)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export async function getTemplates(): Promise<LocalTemplate[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.templates, 'readonly')
    const request = tx.objectStore(STORES.templates).index('by-sort').getAll()
    request.onsuccess = () => {
      db.close()
      resolve((request.result as LocalTemplate[]) || [])
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function updateTemplate(
  id: string,
  updates: Partial<Pick<LocalTemplate, 'name' | 'prompt' | 'projectId' | 'icon'>>
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.templates, 'readwrite')
    const store = tx.objectStore(STORES.templates)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const tmpl = getReq.result as LocalTemplate | undefined
      if (tmpl) store.put({ ...tmpl, ...updates })
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

export async function deleteTemplate(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.templates, 'readwrite')
    tx.objectStore(STORES.templates).delete(id)
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

// ─── Action Log ────────────────────────────────────────────────────

export async function logAction(
  entry: Omit<ActionLogEntry, 'id' | 'createdAt'>
): Promise<ActionLogEntry> {
  const db = await openDB()
  const logEntry: ActionLogEntry = {
    ...entry,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.actionLog, 'readwrite')
    tx.objectStore(STORES.actionLog).add(logEntry)
    tx.oncomplete = () => {
      db.close()
      resolve(logEntry)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

export async function getActionLog(limit = 200): Promise<ActionLogEntry[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.actionLog, 'readonly')
    const request = tx.objectStore(STORES.actionLog).index('by-created').getAll()

    request.onsuccess = () => {
      db.close()
      const results = ((request.result as ActionLogEntry[]) || [])
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit)
      resolve(results)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function getActionsByConversation(conversationId: string): Promise<ActionLogEntry[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.actionLog, 'readonly')
    const index = tx.objectStore(STORES.actionLog).index('by-conversation')
    const request = index.getAll(IDBKeyRange.only(conversationId))

    request.onsuccess = () => {
      db.close()
      const results = ((request.result as ActionLogEntry[]) || []).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      resolve(results)
    }
    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

// ─── Search ────────────────────────────────────────────────────────

export async function searchConversations(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) return []
  const q = query.toLowerCase().trim()

  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.conversations, STORES.messages], 'readonly')
    const convRequest = tx.objectStore(STORES.conversations).getAll()
    const msgRequest = tx.objectStore(STORES.messages).getAll()

    let convs: LocalConversation[] = []
    let msgs: LocalMessage[] = []

    convRequest.onsuccess = () => {
      convs = (convRequest.result as LocalConversation[]) || []
    }
    msgRequest.onsuccess = () => {
      msgs = (msgRequest.result as LocalMessage[]) || []
    }

    tx.oncomplete = () => {
      db.close()
      const results: SearchResult[] = []
      const convMap = new Map(convs.map((c) => [c.id, c]))

      // Search conversation titles
      for (const conv of convs) {
        if (conv.title.toLowerCase().includes(q)) {
          results.push({
            conversation: conv,
            matchSource: 'title',
            matchingSnippet: conv.title,
          })
        }
      }

      // Search message content (skip conversations already matched by title)
      const matchedConvIds = new Set(results.map((r) => r.conversation.id))
      for (const msg of msgs) {
        if (matchedConvIds.has(msg.conversationId)) continue
        if (msg.content.toLowerCase().includes(q)) {
          const conv = convMap.get(msg.conversationId)
          if (conv) {
            // Extract snippet around match
            const idx = msg.content.toLowerCase().indexOf(q)
            const start = Math.max(0, idx - 40)
            const end = Math.min(msg.content.length, idx + q.length + 40)
            const snippet =
              (start > 0 ? '...' : '') +
              msg.content.slice(start, end) +
              (end < msg.content.length ? '...' : '')

            results.push({
              conversation: conv,
              matchSource: 'message',
              matchingSnippet: snippet,
            })
            matchedConvIds.add(msg.conversationId)
          }
        }
      }

      // Sort by most recently updated
      results.sort(
        (a, b) =>
          new Date(b.conversation.updatedAt).getTime() -
          new Date(a.conversation.updatedAt).getTime()
      )

      resolve(results)
    }

    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

// ─── Export ─────────────────────────────────────────────────────────

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

export async function exportConversationMarkdown(conversationId: string): Promise<string | null> {
  const conv = await getConversation(conversationId)
  if (!conv) return null
  const messages = await getMessages(conversationId)

  let projectName = 'Uncategorized'
  if (conv.projectId) {
    const proj = await getProject(conv.projectId)
    if (proj) projectName = `${proj.icon} ${proj.name}`
  }

  const lines = [
    `# ${conv.title}`,
    '',
    `**Project:** ${projectName}`,
    `**Date:** ${new Date(conv.createdAt).toLocaleDateString()}`,
    `**Messages:** ${messages.length}`,
    '',
    '---',
    '',
  ]

  for (const msg of messages) {
    const time = new Date(msg.createdAt).toLocaleTimeString()
    const speaker = msg.role === 'user' ? '**You**' : '**Remy**'
    const bookmark = msg.bookmarked ? ' ⭐' : ''

    lines.push(`### ${speaker} — ${time}${bookmark}`)
    lines.push('')
    lines.push(msg.content)
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

export async function exportConversationJSON(conversationId: string): Promise<unknown | null> {
  const conv = await getConversation(conversationId)
  if (!conv) return null
  const messages = await getMessages(conversationId)

  let projectName = 'Uncategorized'
  if (conv.projectId) {
    const proj = await getProject(conv.projectId)
    if (proj) projectName = proj.name
  }

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    conversation: {
      id: conv.id,
      title: conv.title,
      projectName,
      createdAt: conv.createdAt,
      messageCount: messages.length,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        bookmarked: m.bookmarked,
        createdAt: m.createdAt,
      })),
    },
  }
}

export async function exportProjectJSON(projectId: string): Promise<unknown | null> {
  const project = await getProject(projectId)
  if (!project) return null
  const allConvs = await getConversations(true)
  const projectConvs = allConvs.filter((c) => c.projectId === projectId)
  const conversationsWithMessages = []

  for (const conv of projectConvs) {
    const messages = await getMessages(conv.id)
    conversationsWithMessages.push({
      ...conv,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        bookmarked: m.bookmarked,
        createdAt: m.createdAt,
      })),
    })
  }

  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    project: {
      name: project.name,
      icon: project.icon,
      conversationCount: conversationsWithMessages.length,
      conversations: conversationsWithMessages,
    },
  }
}

// ─── Auto-Suggest Project ──────────────────────────────────────────

export const AUTO_PROJECT_RULES = [
  {
    keywords: ['event', 'dinner', 'party', 'guest', 'catering', 'brunch', 'reception', 'gala'],
    project: 'Events',
    icon: '🎉',
  },
  {
    keywords: ['recipe', 'menu', 'ingredient', 'dish', 'plating', 'course', 'appetizer', 'dessert'],
    project: 'Recipes & Menus',
    icon: '🍽️',
  },
  {
    keywords: ['client', 'follow-up', 'inquiry', 'lead', 'booking', 'prospect'],
    project: 'Clients',
    icon: '👥',
  },
  {
    keywords: ['revenue', 'payment', 'invoice', 'expense', 'profit', 'budget', 'quote', 'pricing'],
    project: 'Finance',
    icon: '💰',
  },
  {
    keywords: ['email', 'draft', 'message', 'reply', 'thank you', 'follow up', 'outreach'],
    project: 'Communications',
    icon: '✉️',
  },
  {
    keywords: ['prep', 'timeline', 'schedule', 'calendar', 'availability', 'block', 'date'],
    project: 'Planning',
    icon: '📅',
  },
] as const

export function autoSuggestProject(message: string): { name: string; icon: string } | null {
  if (!message) return null
  const lower = message.toLowerCase()
  for (const rule of AUTO_PROJECT_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return { name: rule.project, icon: rule.icon }
    }
  }
  return null
}

// ─── Auto-Title ────────────────────────────────────────────────────

export function autoTitle(firstMessage: string): string {
  if (!firstMessage) return 'New conversation'
  let title = firstMessage.trim()

  // Strip common filler prefixes
  const prefixes = [
    /^(can you |could you |please |hey |hi |ok |okay |so |um |uh |what is the |what's the )/i,
    /^(tell me |show me |give me |get me |help me |check |what are |remy |hey remy )/i,
  ]
  for (const prefix of prefixes) {
    title = title.replace(prefix, '')
  }

  // Capitalize first letter
  title = title.charAt(0).toUpperCase() + title.slice(1)

  // Truncate at word boundary around 50 chars
  if (title.length > 50) {
    const truncated = title.slice(0, 50)
    const lastSpace = truncated.lastIndexOf(' ')
    title = (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + '...'
  }

  // Remove trailing punctuation except ...
  title = title.replace(/[?.!,;:]+$/, '')

  return title || 'New conversation'
}

// ─── Bulk Operations ────────────────────────────────────────────────

/** Clear all Remy conversation history from this browser */
// ─── Session Summaries (stored alongside conversations in IndexedDB) ──────

import type { ConversationSummary } from './remy-conversation-summary'

const SUMMARY_STORAGE_KEY = 'remy-conversation-summaries'

/**
 * Save a conversation summary to localStorage (keyed by conversationId).
 * Summaries are lightweight metadata, so localStorage is fine (no IndexedDB needed).
 */
export function saveSummary(conversationId: string, summary: ConversationSummary): void {
  try {
    const stored = localStorage.getItem(SUMMARY_STORAGE_KEY)
    const summaries: Record<string, ConversationSummary> = stored ? JSON.parse(stored) : {}
    summaries[conversationId] = summary

    // Keep at most 50 summaries (prune oldest)
    const entries = Object.entries(summaries)
    if (entries.length > 50) {
      entries.sort(
        ([, a], [, b]) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
      )
      const pruned = Object.fromEntries(entries.slice(0, 50))
      localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(pruned))
    } else {
      localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(summaries))
    }
  } catch {
    // localStorage unavailable (SSR, private browsing) - silently skip
  }
}

/**
 * Get recent conversation summaries (excluding the current conversation).
 * Returns the most recent 3 summaries for context in new conversations.
 */
export function getRecentSummaries(excludeConversationId: string | null): ConversationSummary[] {
  try {
    const stored = localStorage.getItem(SUMMARY_STORAGE_KEY)
    if (!stored) return []

    const summaries: Record<string, ConversationSummary> = JSON.parse(stored)
    return Object.entries(summaries)
      .filter(([id]) => id !== excludeConversationId)
      .map(([, summary]) => summary)
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      .slice(0, 3)
  } catch {
    return []
  }
}

/**
 * Get the last session summary (most recent conversation summary).
 * Used to provide continuity context when starting a new conversation.
 */
export async function getLastSessionSummary(
  excludeConversationId: string | null
): Promise<ConversationSummary | null> {
  try {
    const recent = getRecentSummaries(excludeConversationId)
    return recent.length > 0 ? recent[0] : null
  } catch {
    return null
  }
}

// ─── Bulk Operations ────────────────────────────────────────────────

export async function clearAllHistory(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const storeNames = Object.values(STORES)
    const tx = db.transaction(storeNames, 'readwrite')
    for (const name of storeNames) {
      tx.objectStore(name).clear()
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

/** Get total conversation count (for anonymous metrics) */
export async function getConversationCount(): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.conversations, 'readonly')
    const request = tx.objectStore(STORES.conversations).count()
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

/** Get storage stats */
export async function getStats(): Promise<{
  projectCount: number
  conversationCount: number
  messageCount: number
  templateCount: number
  actionLogCount: number
}> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const storeNames = Object.values(STORES)
    const tx = db.transaction(storeNames, 'readonly')

    const counts: Record<string, number> = {}
    const requests = storeNames.map((name) => {
      const req = tx.objectStore(name).count()
      req.onsuccess = () => {
        counts[name] = req.result
      }
      return req
    })

    // Wait for last request to know all are done
    void requests

    tx.oncomplete = () => {
      db.close()
      resolve({
        projectCount: counts[STORES.projects] || 0,
        conversationCount: counts[STORES.conversations] || 0,
        messageCount: counts[STORES.messages] || 0,
        templateCount: counts[STORES.templates] || 0,
        actionLogCount: counts[STORES.actionLog] || 0,
      })
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
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

// ─── Auto-Pruning ─────────────────────────────────────────────────────

/** Max conversations before oldest are deleted */
const MAX_CONVERSATIONS = 200

/** Max messages per conversation before oldest are trimmed */
const MAX_MESSAGES_PER_CONVERSATION = 500

/**
 * Prune old conversations if the total exceeds MAX_CONVERSATIONS.
 * Prefers pruning archived conversations first.
 * Call this periodically (e.g., after creating a new conversation).
 */
export async function pruneOldConversations(): Promise<number> {
  const conversations = await getConversations(true) // include archived
  if (conversations.length <= MAX_CONVERSATIONS) return 0

  // Prune archived first, then oldest non-pinned
  const archived = conversations.filter((c) => c.archived)
  const nonPinned = conversations.filter((c) => !c.archived && !c.pinned)

  const candidates = [...archived, ...nonPinned]
  // Take from the end (oldest) of the candidates
  const toDelete = candidates.slice(-(conversations.length - MAX_CONVERSATIONS))

  for (const conv of toDelete) {
    await deleteConversation(conv.id)
  }

  console.log(
    `[remy-storage] Pruned ${toDelete.length} old conversations (was ${conversations.length}, now ${MAX_CONVERSATIONS})`
  )
  return toDelete.length
}

/**
 * Trim messages in a conversation if they exceed MAX_MESSAGES_PER_CONVERSATION.
 * Keeps the most recent messages, deletes the oldest.
 */
export async function trimConversationMessages(conversationId: string): Promise<number> {
  const messages = await getMessages(conversationId)
  if (messages.length <= MAX_MESSAGES_PER_CONVERSATION) return 0

  // messages are sorted oldest-first; delete from the beginning
  const toDelete = messages.slice(0, messages.length - MAX_MESSAGES_PER_CONVERSATION)
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.messages, 'readwrite')
    const store = tx.objectStore(STORES.messages)
    for (const msg of toDelete) {
      store.delete(msg.id)
    }
    tx.oncomplete = () => {
      db.close()
      console.log(
        `[remy-storage] Trimmed ${toDelete.length} old messages from conversation ${conversationId}`
      )
      resolve(toDelete.length)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}
