// Remy - Shared SSE Stream Parser
// Parses Server-Sent Events from /api/remy/stream into typed callbacks.
// Used by both the drawer (use-remy-send.ts) and the mascot chat (use-remy-mascot-send.ts).

import type { RemyTaskResult, RemyMemoryItem, NavigationSuggestion } from '@/lib/ai/remy-types'

export interface StreamCallbacks {
  onToken: (token: string) => void
  onTasks?: (tasks: RemyTaskResult[]) => void
  onNav?: (navs: NavigationSuggestion[]) => void
  onMemories?: (memories: RemyMemoryItem[]) => void
  onIntent?: (intent: string) => void
  onError?: (error: string) => void
  onDone?: () => void
}

export interface StreamResult {
  fullContent: string
  isError: boolean
  tasks?: RemyTaskResult[]
  navSuggestions?: NavigationSuggestion[]
  memoryItems?: RemyMemoryItem[]
}

/**
 * Parse an SSE stream from the Remy streaming endpoint.
 * Returns accumulated content and structured data.
 */
export async function parseRemyStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  callbacks: StreamCallbacks
): Promise<StreamResult> {
  const decoder = new TextDecoder()
  let fullContent = ''
  let isError = false
  let tasks: RemyTaskResult[] | undefined
  let navSuggestions: NavigationSuggestion[] | undefined
  let memoryItems: RemyMemoryItem[] | undefined
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const event = JSON.parse(line.slice(6)) as { type: string; data: unknown }

        switch (event.type) {
          case 'token':
            fullContent += event.data as string
            callbacks.onToken(event.data as string)
            break
          case 'tasks':
            tasks = event.data as RemyTaskResult[]
            callbacks.onTasks?.(tasks)
            break
          case 'nav':
            navSuggestions = event.data as NavigationSuggestion[]
            callbacks.onNav?.(navSuggestions)
            break
          case 'memories':
            memoryItems = event.data as RemyMemoryItem[]
            callbacks.onMemories?.(memoryItems)
            break
          case 'intent':
            callbacks.onIntent?.(event.data as string)
            break
          case 'error':
            fullContent = event.data as string
            isError = true
            callbacks.onError?.(event.data as string)
            break
          case 'done':
            callbacks.onDone?.()
            break
        }
      } catch {
        // Skip malformed SSE lines
      }
    }
  }

  return { fullContent, isError, tasks, navSuggestions, memoryItems }
}
