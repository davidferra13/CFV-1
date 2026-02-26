/**
 * Gustav Storage — IndexedDB wrapper for Mission Control conversation management.
 *
 * Privacy by architecture: all data stored locally in the browser.
 * The server never sees or stores conversation content.
 *
 * Hierarchy: Project → Conversation → Message
 * Extras: Templates, Action Log, Bookmarks, Search, Export
 */

// ─── Constants ───────────────────────────────────────────────────────
const GUSTAV_DB = 'gustav-conversations'
const GUSTAV_DB_VERSION = 1
const STORES = {
  projects: 'projects',
  conversations: 'conversations',
  messages: 'messages',
  templates: 'templates',
}

const MAX_CONVERSATIONS = 500
const MAX_MESSAGES_PER_CONVERSATION = 1000

// ─── Database ───────────────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'))
      return
    }

    const request = indexedDB.open(GUSTAV_DB, GUSTAV_DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result

      // Projects store
      if (!db.objectStoreNames.contains(STORES.projects)) {
        const store = db.createObjectStore(STORES.projects, { keyPath: 'id' })
        store.createIndex('by-updated', 'updatedAt', { unique: false })
        store.createIndex('by-sort', 'sortOrder', { unique: false })
      }

      // Conversations store
      if (!db.objectStoreNames.contains(STORES.conversations)) {
        const store = db.createObjectStore(STORES.conversations, { keyPath: 'id' })
        store.createIndex('by-project', 'projectId', { unique: false })
        store.createIndex('by-updated', 'updatedAt', { unique: false })
      }

      // Messages store
      if (!db.objectStoreNames.contains(STORES.messages)) {
        const store = db.createObjectStore(STORES.messages, { keyPath: 'id' })
        store.createIndex('by-conversation', 'conversationId', { unique: false })
        store.createIndex('by-created', 'createdAt', { unique: false })
        store.createIndex('by-bookmarked', 'bookmarked', { unique: false })
      }

      // Templates store
      if (!db.objectStoreNames.contains(STORES.templates)) {
        const store = db.createObjectStore(STORES.templates, { keyPath: 'id' })
        store.createIndex('by-sort', 'sortOrder', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Project CRUD ───────────────────────────────────────────────────

async function createProject(name, icon = '📁') {
  const db = await openDB()
  const now = new Date().toISOString()
  const project = {
    id: generateId(),
    name,
    icon,
    createdAt: now,
    updatedAt: now,
    sortOrder: Date.now(),
    conversationCount: 0,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.projects, 'readwrite')
    tx.objectStore(STORES.projects).add(project)
    tx.oncomplete = () => { db.close(); resolve(project) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function getProjects() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.projects, 'readonly')
    const request = tx.objectStore(STORES.projects).index('by-sort').getAll()
    request.onsuccess = () => { db.close(); resolve(request.result || []) }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}

async function getProject(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.projects, 'readonly')
    const request = tx.objectStore(STORES.projects).get(id)
    request.onsuccess = () => { db.close(); resolve(request.result || null) }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}

async function updateProject(id, updates) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.projects, 'readwrite')
    const store = tx.objectStore(STORES.projects)
    const getReq = store.get(id)

    getReq.onsuccess = () => {
      const project = getReq.result
      if (!project) { db.close(); resolve(null); return }
      const updated = { ...project, ...updates, updatedAt: new Date().toISOString() }
      store.put(updated)
    }
    tx.oncomplete = () => { db.close(); resolve(true) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function deleteProject(id, moveConversationsTo = null) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.projects, STORES.conversations], 'readwrite')

    // Delete the project
    tx.objectStore(STORES.projects).delete(id)

    // Reassign conversations
    const convStore = tx.objectStore(STORES.conversations)
    const index = convStore.index('by-project')
    const cursorReq = index.openCursor(IDBKeyRange.only(id))

    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result
      if (cursor) {
        const conv = cursor.value
        conv.projectId = moveConversationsTo
        cursor.update(conv)
        cursor.continue()
      }
    }

    // Update target project conversation count if moving to a project
    if (moveConversationsTo) {
      const targetReq = tx.objectStore(STORES.projects).get(moveConversationsTo)
      targetReq.onsuccess = () => {
        const target = targetReq.result
        if (target) {
          // We'll recalculate later, just mark as updated
          target.updatedAt = new Date().toISOString()
          tx.objectStore(STORES.projects).put(target)
        }
      }
    }

    tx.oncomplete = () => { db.close(); resolve(true) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

// ─── Conversation CRUD ──────────────────────────────────────────────

async function createConversation(projectId = null, title = 'New conversation') {
  const db = await openDB()
  const now = new Date().toISOString()
  const conversation = {
    id: generateId(),
    projectId,
    title,
    summary: '',
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    bookmarkCount: 0,
    pinned: false,
    archived: false,
    templateId: null,
  }

  return new Promise((resolve, reject) => {
    const stores = [STORES.conversations]
    if (projectId) stores.push(STORES.projects)
    const tx = db.transaction(stores, 'readwrite')

    tx.objectStore(STORES.conversations).add(conversation)

    // Increment project conversation count
    if (projectId) {
      const projStore = tx.objectStore(STORES.projects)
      const getReq = projStore.get(projectId)
      getReq.onsuccess = () => {
        const proj = getReq.result
        if (proj) {
          proj.conversationCount = (proj.conversationCount || 0) + 1
          proj.updatedAt = now
          projStore.put(proj)
        }
      }
    }

    tx.oncomplete = () => { db.close(); resolve(conversation) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function getConversations(projectId = undefined, includeArchived = false) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.conversations, 'readonly')
    const store = tx.objectStore(STORES.conversations)
    let request

    if (projectId !== undefined) {
      // Filter by project (including null for uncategorized)
      request = store.index('by-project').getAll(IDBKeyRange.only(projectId === null ? '' : projectId))
      // IndexedDB can't index null, so we need to handle this differently
      // Instead, get all and filter
      request = store.getAll()
    } else {
      request = store.getAll()
    }

    request.onsuccess = () => {
      db.close()
      let results = request.result || []

      // Filter by project if specified
      if (projectId !== undefined) {
        results = results.filter(c => {
          if (projectId === null) return !c.projectId
          return c.projectId === projectId
        })
      }

      // Filter archived
      if (!includeArchived) {
        results = results.filter(c => !c.archived)
      }

      // Sort: pinned first, then by updatedAt descending
      results.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })

      resolve(results)
    }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}

async function getAllConversations(includeArchived = false) {
  return getConversations(undefined, includeArchived)
}

async function getArchivedConversations() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.conversations, 'readonly')
    const request = tx.objectStore(STORES.conversations).getAll()
    request.onsuccess = () => {
      db.close()
      const results = (request.result || [])
        .filter(c => c.archived)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      resolve(results)
    }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}

async function getConversation(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.conversations, 'readonly')
    const request = tx.objectStore(STORES.conversations).get(id)
    request.onsuccess = () => { db.close(); resolve(request.result || null) }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}

async function updateConversation(id, updates) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.conversations, 'readwrite')
    const store = tx.objectStore(STORES.conversations)
    const getReq = store.get(id)

    getReq.onsuccess = () => {
      const conv = getReq.result
      if (!conv) { db.close(); resolve(null); return }
      const updated = { ...conv, ...updates, updatedAt: new Date().toISOString() }
      store.put(updated)
    }
    tx.oncomplete = () => { db.close(); resolve(true) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function deleteConversation(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.conversations, STORES.messages, STORES.projects], 'readwrite')

    // Get the conversation first to update project count
    const convStore = tx.objectStore(STORES.conversations)
    const getReq = convStore.get(id)

    getReq.onsuccess = () => {
      const conv = getReq.result
      if (conv && conv.projectId) {
        // Decrement project conversation count
        const projStore = tx.objectStore(STORES.projects)
        const projReq = projStore.get(conv.projectId)
        projReq.onsuccess = () => {
          const proj = projReq.result
          if (proj) {
            proj.conversationCount = Math.max(0, (proj.conversationCount || 1) - 1)
            projStore.put(proj)
          }
        }
      }
    }

    // Delete the conversation
    convStore.delete(id)

    // Delete all messages in this conversation
    const msgStore = tx.objectStore(STORES.messages)
    const index = msgStore.index('by-conversation')
    const cursorReq = index.openCursor(IDBKeyRange.only(id))

    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      }
    }

    tx.oncomplete = () => { db.close(); resolve(true) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function moveConversation(conversationId, targetProjectId) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.conversations, STORES.projects], 'readwrite')
    const convStore = tx.objectStore(STORES.conversations)
    const projStore = tx.objectStore(STORES.projects)

    const getReq = convStore.get(conversationId)
    getReq.onsuccess = () => {
      const conv = getReq.result
      if (!conv) return

      const oldProjectId = conv.projectId
      conv.projectId = targetProjectId
      conv.updatedAt = new Date().toISOString()
      convStore.put(conv)

      // Decrement old project count
      if (oldProjectId) {
        const oldReq = projStore.get(oldProjectId)
        oldReq.onsuccess = () => {
          const old = oldReq.result
          if (old) {
            old.conversationCount = Math.max(0, (old.conversationCount || 1) - 1)
            projStore.put(old)
          }
        }
      }

      // Increment new project count
      if (targetProjectId) {
        const newReq = projStore.get(targetProjectId)
        newReq.onsuccess = () => {
          const proj = newReq.result
          if (proj) {
            proj.conversationCount = (proj.conversationCount || 0) + 1
            proj.updatedAt = new Date().toISOString()
            projStore.put(proj)
          }
        }
      }
    }

    tx.oncomplete = () => { db.close(); resolve(true) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function archiveConversation(id) {
  return updateConversation(id, { archived: true })
}

async function unarchiveConversation(id) {
  return updateConversation(id, { archived: false })
}

async function pinConversation(id) {
  return updateConversation(id, { pinned: true })
}

async function unpinConversation(id) {
  return updateConversation(id, { pinned: false })
}

// ─── Message CRUD ───────────────────────────────────────────────────

async function addMessage(conversationId, role, content, extras = {}) {
  const db = await openDB()
  const now = new Date().toISOString()
  const message = {
    id: generateId(),
    conversationId,
    role,
    content,
    actions: extras.actions || null,
    actionResults: extras.actionResults || null,
    bookmarked: false,
    createdAt: now,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.conversations, STORES.messages], 'readwrite')

    // Add the message
    tx.objectStore(STORES.messages).add(message)

    // Update conversation metadata
    const convStore = tx.objectStore(STORES.conversations)
    const getReq = convStore.get(conversationId)
    getReq.onsuccess = () => {
      const conv = getReq.result
      if (conv) {
        conv.updatedAt = now
        conv.messageCount = (conv.messageCount || 0) + 1
        // Set summary from first user message
        if (role === 'user' && !conv.summary) {
          conv.summary = content.slice(0, 100)
        }
        convStore.put(conv)
      }
    }

    tx.oncomplete = () => { db.close(); resolve(message) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function getMessages(conversationId) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.messages, 'readonly')
    const index = tx.objectStore(STORES.messages).index('by-conversation')
    const request = index.getAll(IDBKeyRange.only(conversationId))

    request.onsuccess = () => {
      db.close()
      const messages = (request.result || []).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      resolve(messages)
    }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}

async function deleteMessage(messageId) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.messages, STORES.conversations], 'readwrite')
    const msgStore = tx.objectStore(STORES.messages)

    // Get message first to find its conversation
    const getReq = msgStore.get(messageId)
    getReq.onsuccess = () => {
      const msg = getReq.result
      if (msg) {
        msgStore.delete(messageId)

        // Decrement conversation count
        const convStore = tx.objectStore(STORES.conversations)
        const convReq = convStore.get(msg.conversationId)
        convReq.onsuccess = () => {
          const conv = convReq.result
          if (conv) {
            conv.messageCount = Math.max(0, (conv.messageCount || 1) - 1)
            if (msg.bookmarked) {
              conv.bookmarkCount = Math.max(0, (conv.bookmarkCount || 1) - 1)
            }
            convStore.put(conv)
          }
        }
      }
    }

    tx.oncomplete = () => { db.close(); resolve(true) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function toggleBookmark(messageId) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.messages, STORES.conversations], 'readwrite')
    const msgStore = tx.objectStore(STORES.messages)
    const getReq = msgStore.get(messageId)

    getReq.onsuccess = () => {
      const msg = getReq.result
      if (!msg) return
      const wasBookmarked = msg.bookmarked
      msg.bookmarked = !wasBookmarked
      msgStore.put(msg)

      // Update conversation bookmark count
      const convStore = tx.objectStore(STORES.conversations)
      const convReq = convStore.get(msg.conversationId)
      convReq.onsuccess = () => {
        const conv = convReq.result
        if (conv) {
          conv.bookmarkCount = (conv.bookmarkCount || 0) + (wasBookmarked ? -1 : 1)
          convStore.put(conv)
        }
      }
    }

    tx.oncomplete = () => { db.close(); resolve(true) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function getBookmarkedMessages() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.messages, STORES.conversations], 'readonly')
    const request = tx.objectStore(STORES.messages).getAll()

    request.onsuccess = () => {
      db.close()
      const bookmarked = (request.result || [])
        .filter(m => m.bookmarked)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      resolve(bookmarked)
    }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}

// ─── Template CRUD ──────────────────────────────────────────────────

async function createTemplate(name, prompt, projectId = null, icon = '⚡') {
  const db = await openDB()
  const now = new Date().toISOString()
  const template = {
    id: generateId(),
    name,
    prompt,
    projectId,
    icon,
    sortOrder: Date.now(),
    createdAt: now,
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.templates, 'readwrite')
    tx.objectStore(STORES.templates).add(template)
    tx.oncomplete = () => { db.close(); resolve(template) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function getTemplates() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.templates, 'readonly')
    const request = tx.objectStore(STORES.templates).index('by-sort').getAll()
    request.onsuccess = () => { db.close(); resolve(request.result || []) }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}

async function updateTemplate(id, updates) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.templates, 'readwrite')
    const store = tx.objectStore(STORES.templates)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const tmpl = getReq.result
      if (tmpl) store.put({ ...tmpl, ...updates })
    }
    tx.oncomplete = () => { db.close(); resolve(true) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function deleteTemplate(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.templates, 'readwrite')
    tx.objectStore(STORES.templates).delete(id)
    tx.oncomplete = () => { db.close(); resolve(true) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

// ─── Action Log ─────────────────────────────────────────────────────

async function getActionLog(options = {}) {
  const { limit = 100, actionType = null, dateFrom = null, dateTo = null } = options
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.messages, STORES.conversations], 'readonly')
    const request = tx.objectStore(STORES.messages).getAll()

    request.onsuccess = () => {
      db.close()
      let results = (request.result || [])
        .filter(m => m.actions && m.actions.length > 0)

      // Filter by action type
      if (actionType) {
        results = results.filter(m =>
          m.actions.some(a => a === actionType || (typeof a === 'object' && a.action === actionType))
        )
      }

      // Filter by date range
      if (dateFrom) {
        results = results.filter(m => new Date(m.createdAt) >= new Date(dateFrom))
      }
      if (dateTo) {
        results = results.filter(m => new Date(m.createdAt) <= new Date(dateTo))
      }

      // Sort by most recent first
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      // Apply limit
      results = results.slice(0, limit)

      resolve(results)
    }
    request.onerror = () => { db.close(); reject(request.error) }
  })
}

// ─── Search ─────────────────────────────────────────────────────────

async function searchConversations(query) {
  if (!query || query.trim().length === 0) return []
  const q = query.toLowerCase().trim()

  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.conversations, STORES.messages], 'readonly')
    const convRequest = tx.objectStore(STORES.conversations).getAll()
    const msgRequest = tx.objectStore(STORES.messages).getAll()

    let convs = []
    let msgs = []

    convRequest.onsuccess = () => { convs = convRequest.result || [] }
    msgRequest.onsuccess = () => { msgs = msgRequest.result || [] }

    tx.oncomplete = () => {
      db.close()
      const results = []
      const convMap = new Map(convs.map(c => [c.id, c]))

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

      // Search message content
      const matchedConvIds = new Set(results.map(r => r.conversation.id))
      for (const msg of msgs) {
        if (matchedConvIds.has(msg.conversationId)) continue
        if (msg.content.toLowerCase().includes(q)) {
          const conv = convMap.get(msg.conversationId)
          if (conv) {
            // Extract snippet around match
            const idx = msg.content.toLowerCase().indexOf(q)
            const start = Math.max(0, idx - 40)
            const end = Math.min(msg.content.length, idx + q.length + 40)
            const snippet = (start > 0 ? '...' : '') +
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
      results.sort((a, b) =>
        new Date(b.conversation.updatedAt).getTime() - new Date(a.conversation.updatedAt).getTime()
      )

      resolve(results)
    }

    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

// ─── Export / Import ────────────────────────────────────────────────

async function exportConversationJSON(conversationId) {
  const conv = await getConversation(conversationId)
  if (!conv) return null
  const messages = await getMessages(conversationId)
  let projectName = 'Uncategorized'
  if (conv.projectId) {
    const proj = await getProject(conv.projectId)
    if (proj) projectName = proj.name
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    conversation: {
      id: conv.id,
      title: conv.title,
      projectName,
      createdAt: conv.createdAt,
      messageCount: messages.length,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        actions: m.actions,
        actionResults: m.actionResults,
        bookmarked: m.bookmarked,
        createdAt: m.createdAt,
      })),
    },
  }
}

async function exportConversationMarkdown(conversationId) {
  const conv = await getConversation(conversationId)
  if (!conv) return null
  const messages = await getMessages(conversationId)
  let projectName = 'Uncategorized'
  if (conv.projectId) {
    const proj = await getProject(conv.projectId)
    if (proj) projectName = proj.name
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
    const speaker = msg.role === 'user' ? '**You**' : '**Gustav**'
    const bookmark = msg.bookmarked ? ' 🔖' : ''

    lines.push(`### ${speaker} — ${time}${bookmark}`)
    lines.push('')
    lines.push(msg.content)

    if (msg.actions && msg.actions.length > 0) {
      lines.push('')
      lines.push('**Actions executed:**')
      for (let i = 0; i < msg.actions.length; i++) {
        const action = msg.actions[i]
        const result = msg.actionResults?.[i]
        const status = result?.ok ? '✅' : '❌'
        lines.push(`- \`${typeof action === 'string' ? action : action.action}\` ${status}`)
      }
    }

    lines.push('')
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

async function exportProjectJSON(projectId) {
  const project = await getProject(projectId)
  if (!project) return null
  const convs = await getConversations(projectId, true)
  const conversationsWithMessages = []

  for (const conv of convs) {
    const messages = await getMessages(conv.id)
    conversationsWithMessages.push({
      ...conv,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        actions: m.actions,
        actionResults: m.actionResults,
        bookmarked: m.bookmarked,
        createdAt: m.createdAt,
      })),
    })
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    project: {
      name: project.name,
      icon: project.icon,
      conversationCount: conversationsWithMessages.length,
      conversations: conversationsWithMessages,
    },
  }
}

async function importConversation(jsonData, targetProjectId = null) {
  if (!jsonData?.conversation) throw new Error('Invalid import data')
  const { conversation: data } = jsonData

  const conv = await createConversation(targetProjectId, data.title || 'Imported conversation')
  if (data.messages) {
    for (const msg of data.messages) {
      await addMessage(conv.id, msg.role, msg.content, {
        actions: msg.actions,
        actionResults: msg.actionResults,
      })
    }
  }
  return conv
}

// ─── Utilities ──────────────────────────────────────────────────────

function autoTitle(firstMessage) {
  if (!firstMessage) return 'New conversation'
  let title = firstMessage.trim()

  // Strip common filler prefixes
  const prefixes = [
    /^(can you |could you |please |hey |hi |ok |okay |so |um |uh |what is the |what's the )/i,
    /^(tell me |show me |give me |get me |run |do |check |start |stop )/i,
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

// Keyword-based project suggestion (deterministic, no AI)
const AUTO_PROJECT_RULES = [
  { keywords: ['deploy', 'beta', 'rollback', 'pm2', 'production', 'vercel'], project: 'Deployments', icon: '🚀' },
  { keywords: ['ollama', 'model', 'gpu', 'inference', 'qwen', 'llm'], project: 'AI / Ollama', icon: '🤖' },
  { keywords: ['build', 'typecheck', 'tsc', 'compile', 'next build', 'webpack'], project: 'Builds', icon: '🔨' },
  { keywords: ['git', 'push', 'branch', 'commit', 'merge', 'pull'], project: 'Git', icon: '🌿' },
  { keywords: ['status', 'health', 'check', 'ping', 'uptime'], project: 'Status Checks', icon: '📊' },
]

function autoSuggestProject(message) {
  if (!message) return null
  const lower = message.toLowerCase()
  for (const rule of AUTO_PROJECT_RULES) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return { name: rule.project, icon: rule.icon }
    }
  }
  return null
}

async function pruneOldConversations(maxConversations = MAX_CONVERSATIONS) {
  const allConvs = await getAllConversations(true)
  if (allConvs.length <= maxConversations) return 0

  // Only prune archived conversations first
  const archived = allConvs.filter(c => c.archived)
  const toDelete = archived.slice(0, allConvs.length - maxConversations)

  for (const conv of toDelete) {
    await deleteConversation(conv.id)
  }

  console.log(`[gustav-storage] Pruned ${toDelete.length} old conversations`)
  return toDelete.length
}

async function trimMessages(conversationId, maxMessages = MAX_MESSAGES_PER_CONVERSATION) {
  const messages = await getMessages(conversationId)
  if (messages.length <= maxMessages) return 0

  const toDelete = messages.slice(0, messages.length - maxMessages)
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.messages, 'readwrite')
    const store = tx.objectStore(STORES.messages)
    for (const msg of toDelete) {
      store.delete(msg.id)
    }
    tx.oncomplete = () => {
      db.close()
      console.log(`[gustav-storage] Trimmed ${toDelete.length} messages from ${conversationId}`)
      resolve(toDelete.length)
    }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function getStats() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.projects, STORES.conversations, STORES.messages], 'readonly')
    const projReq = tx.objectStore(STORES.projects).count()
    const convReq = tx.objectStore(STORES.conversations).count()
    const msgReq = tx.objectStore(STORES.messages).count()

    const stats = {}
    projReq.onsuccess = () => { stats.projectCount = projReq.result }
    convReq.onsuccess = () => { stats.conversationCount = convReq.result }
    msgReq.onsuccess = () => { stats.messageCount = msgReq.result }

    tx.oncomplete = () => { db.close(); resolve(stats) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function clearAllData() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [STORES.projects, STORES.conversations, STORES.messages, STORES.templates],
      'readwrite'
    )
    tx.objectStore(STORES.projects).clear()
    tx.objectStore(STORES.conversations).clear()
    tx.objectStore(STORES.messages).clear()
    tx.objectStore(STORES.templates).clear()
    tx.oncomplete = () => { db.close(); resolve(true) }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

// ─── Public API ─────────────────────────────────────────────────────

// ─── Smoke Test (run from browser console: GustavStorage.smokeTest()) ──

async function smokeTest() {
  const log = (msg) => console.log(`[gustav-test] ${msg}`)
  const assert = (cond, msg) => { if (!cond) throw new Error(`FAIL: ${msg}`) }
  let passed = 0

  try {
    log('Starting smoke test...')

    // Project CRUD
    const proj = await createProject('Test Project', '🧪')
    assert(proj.id, 'Project created')
    passed++

    const projects = await getProjects()
    assert(projects.some(p => p.id === proj.id), 'Project in list')
    passed++

    await updateProject(proj.id, { name: 'Renamed Project' })
    const updatedProj = await getProject(proj.id)
    assert(updatedProj.name === 'Renamed Project', 'Project renamed')
    passed++

    // Conversation CRUD
    const conv = await createConversation(proj.id, 'Test Conversation')
    assert(conv.id, 'Conversation created')
    passed++

    const convs = await getConversations(proj.id)
    assert(convs.some(c => c.id === conv.id), 'Conversation in project')
    passed++

    // Message CRUD
    const msg1 = await addMessage(conv.id, 'user', 'Hello Gustav')
    assert(msg1.id, 'User message saved')
    passed++

    const msg2 = await addMessage(conv.id, 'assistant', 'Hello! How can I help?', {
      actions: ['status/all'],
      actionResults: [{ action: 'status/all', ok: true }],
    })
    assert(msg2.id, 'Assistant message with actions saved')
    passed++

    const msgs = await getMessages(conv.id)
    assert(msgs.length === 2, `Got ${msgs.length} messages (expected 2)`)
    passed++

    // Bookmarks
    await toggleBookmark(msg1.id)
    const bookmarked = await getBookmarkedMessages()
    assert(bookmarked.some(m => m.id === msg1.id), 'Message bookmarked')
    passed++

    await toggleBookmark(msg1.id) // unbookmark
    passed++

    // Pin/Archive
    await pinConversation(conv.id)
    let pinnedConv = await getConversation(conv.id)
    assert(pinnedConv.pinned, 'Conversation pinned')
    passed++

    await unpinConversation(conv.id)
    await archiveConversation(conv.id)
    const archived = await getArchivedConversations()
    assert(archived.some(c => c.id === conv.id), 'Conversation archived')
    passed++

    await unarchiveConversation(conv.id)
    passed++

    // Move
    const proj2 = await createProject('Target Project', '🎯')
    await moveConversation(conv.id, proj2.id)
    const movedConv = await getConversation(conv.id)
    assert(movedConv.projectId === proj2.id, 'Conversation moved')
    passed++

    // Templates
    const tmpl = await createTemplate('Test Template', 'Show status', null, '⚡')
    assert(tmpl.id, 'Template created')
    passed++

    const templates = await getTemplates()
    assert(templates.some(t => t.id === tmpl.id), 'Template in list')
    passed++

    await deleteTemplate(tmpl.id)
    passed++

    // Search
    const results = await searchConversations('Hello')
    assert(results.length > 0, 'Search found results')
    passed++

    // Action log
    const actions = await getActionLog()
    assert(actions.length > 0, 'Action log has entries')
    passed++

    // Export
    const jsonExport = await exportConversationJSON(conv.id)
    assert(jsonExport?.conversation?.messages?.length === 2, 'JSON export has messages')
    passed++

    const mdExport = await exportConversationMarkdown(conv.id)
    assert(mdExport.includes('Gustav'), 'Markdown export has content')
    passed++

    // Auto-title
    assert(autoTitle('Can you show me the current status?') === 'Show me the current status', 'Auto-title works')
    passed++

    // Auto-suggest project
    const suggest = autoSuggestProject('deploy to beta now')
    assert(suggest?.name === 'Deployments', 'Auto-suggest works')
    passed++

    // Stats
    const stats = await getStats()
    assert(stats.conversationCount >= 1, 'Stats work')
    passed++

    // Cleanup test data
    await deleteConversation(conv.id)
    await deleteProject(proj.id, null)
    await deleteProject(proj2.id, null)
    passed++

    log(`✅ ALL ${passed} TESTS PASSED`)
    return { passed, failed: 0 }
  } catch (err) {
    log(`❌ FAILED after ${passed} passed: ${err.message}`)
    console.error(err)
    return { passed, failed: 1, error: err.message }
  }
}

window.GustavStorage = {
  // Projects
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,

  // Conversations
  createConversation,
  getConversations,
  getAllConversations,
  getArchivedConversations,
  getConversation,
  updateConversation,
  deleteConversation,
  moveConversation,
  archiveConversation,
  unarchiveConversation,
  pinConversation,
  unpinConversation,

  // Messages
  addMessage,
  getMessages,
  deleteMessage,
  toggleBookmark,
  getBookmarkedMessages,

  // Templates
  createTemplate,
  getTemplates,
  updateTemplate,
  deleteTemplate,

  // Action Log
  getActionLog,

  // Search
  searchConversations,

  // Export / Import
  exportConversationJSON,
  exportConversationMarkdown,
  exportProjectJSON,
  importConversation,

  // Utilities
  autoTitle,
  autoSuggestProject,
  pruneOldConversations,
  trimMessages,
  getStats,
  clearAllData,

  // Testing
  smokeTest,

  // Constants (exposed for UI)
  AUTO_PROJECT_RULES,
}
