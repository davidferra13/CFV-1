/**
 * MemPalace Bridge - semantic memory search for Remy
 *
 * Calls the local MemPalace Python bridge script and returns results.
 * 100% local, no cloud, no API keys. Non-blocking: returns empty array on any failure.
 *
 * Used by: remy-memory-actions.ts (Layer 0: semantic search)
 */

import { execFile } from 'child_process'
import path from 'path'

export interface MemPalaceResult {
  content: string
  wing: string
  room: string
  source: string
  similarity: number
  filedAt?: string
}

interface SearchResponse {
  results: MemPalaceResult[]
  query: string
  error?: string
}

export interface RemyConversationSummaryResult {
  summary: string
  topics: string[]
  entities: string[]
  messageCount: number | null
  generatedAt: string
  source: string
  similarity: number
}

const BRIDGE_SCRIPT = path.join(process.cwd(), 'scripts', 'mempalace-search.py')
const SEARCH_TIMEOUT_MS = 3000 // 3 second hard cap - Remy can't wait longer
const REMY_SUMMARY_WING = 'remy-sessions'
const REMY_SUMMARY_ROOM = 'conversation-summaries'

/**
 * Search MemPalace for semantically relevant memories.
 * Returns empty array on any failure (timeout, missing Python, missing MemPalace, etc.)
 * This is a non-blocking enhancement layer - never throws.
 */
export async function searchMemPalace(
  query: string,
  options?: { limit?: number; wing?: string; room?: string }
): Promise<MemPalaceResult[]> {
  const limit = options?.limit ?? 5
  const args = [BRIDGE_SCRIPT, query, '--limit', String(limit)]
  if (options?.wing) args.push('--wing', options.wing)
  if (options?.room) args.push('--room', options.room)

  return new Promise((resolve) => {
    const child = execFile(
      'py',
      args,
      {
        timeout: SEARCH_TIMEOUT_MS,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
        windowsHide: true,
      },
      (error, stdout) => {
        if (error) {
          // Non-blocking: log and return empty
          console.warn('[mempalace-bridge] Search failed:', error.message)
          resolve([])
          return
        }

        try {
          const parsed: SearchResponse = JSON.parse(stdout)
          if (parsed.error) {
            console.warn('[mempalace-bridge] Bridge error:', parsed.error)
            resolve([])
            return
          }
          resolve(parsed.results)
        } catch {
          console.warn('[mempalace-bridge] Failed to parse response')
          resolve([])
        }
      }
    )

    // Safety: kill if somehow the timeout doesn't work
    setTimeout(() => {
      try {
        child.kill('SIGTERM')
      } catch {
        // ignore
      }
    }, SEARCH_TIMEOUT_MS + 500)
  })
}

function parseDelimitedLine(content: string, prefix: string): string[] {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = content.match(new RegExp(`^${escapedPrefix}\\s*(.+)$`, 'im'))
  if (!match?.[1]) return []

  return match[1]
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function parseRemyConversationSummaryDocument(content: string): {
  summary: string
  topics: string[]
  entities: string[]
  messageCount: number | null
} | null {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return null

  const headerMatch = lines[0]?.match(/^Remy conversation \((\d+) messages?\)$/i)
  const summaryIndex = headerMatch ? 1 : 0
  const summary = lines[summaryIndex]?.trim()

  if (!summary) return null

  return {
    summary,
    topics: parseDelimitedLine(content, 'Topics:'),
    entities: parseDelimitedLine(content, 'People/things:'),
    messageCount: headerMatch ? Number(headerMatch[1]) : null,
  }
}

export async function searchRemyConversationSummaries(
  query: string,
  options?: { limit?: number }
): Promise<RemyConversationSummaryResult[]> {
  const results = await searchMemPalace(query, {
    limit: options?.limit ?? 3,
    wing: REMY_SUMMARY_WING,
    room: REMY_SUMMARY_ROOM,
  })

  return results
    .map((result) => {
      const parsed = parseRemyConversationSummaryDocument(result.content)
      if (!parsed) return null

      return {
        ...parsed,
        generatedAt: result.filedAt ?? '',
        source: result.source,
        similarity: result.similarity,
      }
    })
    .filter((result): result is RemyConversationSummaryResult => Boolean(result))
}

/**
 * Check if MemPalace is available (Python + mempalace installed + palace exists).
 * Used for health checks and conditional UI.
 */
export async function isMemPalaceAvailable(): Promise<boolean> {
  try {
    const results = await searchMemPalace('test', { limit: 1 })
    return true // If it doesn't throw/timeout, it's available
  } catch {
    return false
  }
}
