'use server'

/**
 * MemPalace Persistence - save Remy conversation summaries to MemPalace
 *
 * Called when a Remy conversation ends or reaches 10+ messages.
 * Non-blocking: if MemPalace is unavailable, silently skips.
 * This enables cross-conversation context in future sessions.
 */

import { execFile } from 'child_process'
import path from 'path'

const PERSIST_SCRIPT = path.join(process.cwd(), 'scripts', 'mempalace-persist.py')
const PERSIST_TIMEOUT_MS = 5000

/**
 * Persist a conversation summary to MemPalace.
 * Non-blocking: never throws, never blocks Remy's response.
 */
export async function persistConversationSummary(summary: {
  conversationId: string
  summary: string
  topics: string[]
  entities: string[]
  messageCount: number
}): Promise<void> {
  const content = [
    `Remy conversation (${summary.messageCount} messages)`,
    summary.summary,
    summary.topics.length > 0 ? `Topics: ${summary.topics.join(', ')}` : '',
    summary.entities.length > 0 ? `People/things: ${summary.entities.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    await addToMemPalace({
      wing: 'remy-sessions',
      room: 'conversation-summaries',
      content,
      source: `remy:${summary.conversationId}`,
    })
  } catch {
    // Non-blocking: MemPalace is optional
  }
}

/**
 * Add content to MemPalace via the Python bridge.
 * Generic writer for any wing/room.
 */
async function addToMemPalace(params: {
  wing: string
  room: string
  content: string
  source?: string
}): Promise<void> {
  return new Promise((resolve) => {
    execFile(
      'py',
      [
        PERSIST_SCRIPT,
        '--wing',
        params.wing,
        '--room',
        params.room,
        '--content',
        params.content,
        ...(params.source ? ['--source', params.source] : []),
      ],
      {
        timeout: PERSIST_TIMEOUT_MS,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        windowsHide: true,
      },
      (error) => {
        if (error) {
          console.warn('[mempalace-persist] Failed:', error.message)
        }
        resolve()
      }
    )
  })
}
