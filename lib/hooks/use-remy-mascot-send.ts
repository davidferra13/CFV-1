// Remy Mascot Chat - Lightweight Send Hook
// Ephemeral (session-only) message sending for the mascot's inline chat.
// No IndexedDB persistence, no memory extraction, no conversation management.
// Uses the same /api/remy/stream endpoint and shared SSE parser.

import { useState, useRef, useCallback, useEffect, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import { parseRemyStream } from '@/lib/ai/remy-stream-parser'
import {
  getSessionActivity,
  updateChannelDigest,
  getOtherChannelDigest,
} from '@/lib/ai/remy-activity-tracker'
import { extractSurveyAnswer } from '@/lib/ai/remy-survey-extraction'
import type { BodyEvent } from '@/lib/ai/remy-body-state'
import type { RemyMessage, RemyTaskResult, NavigationSuggestion } from '@/lib/ai/remy-types'

function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
      return (crypto as any).randomUUID()
  } catch {
    // fallback
  }
  return 'mc_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Debug commands - same as the drawer for consistency
const DEBUG_COMMANDS: Record<string, BodyEvent['type']> = {
  'remy wave': 'DRAWER_OPENED',
  'remy think': 'RESPONSE_STARTED',
  'remy speak': 'FIRST_TOKEN',
  'remy done': 'RESPONSE_ENDED',
  'remy celebrate': 'SUCCESS',
  'remy error': 'ERROR',
  'remy nudge': 'NUDGE',
  'remy sleep': 'IDLE_TIMEOUT',
  'remy wake': 'INTERACT',
  'remy whisk': 'WHISKING',
  'remy idle': 'INTERACT',
}

export interface UseRemyMascotSendConfig {
  messages: RemyMessage[]
  setMessages: Dispatch<SetStateAction<RemyMessage[]>>
  pathname: string | null
  feedText: (text: string) => void
  lipSyncStop: () => void
  resetLipSync: () => void
  dispatchBody: (event: BodyEvent) => void
  setMascotLoading: (v: boolean) => void
  /** Whether the drawer is currently streaming (blocks mascot send) */
  drawerBusy: boolean
  /** When true, overrides activeForm to 'remy-survey' for survey mode */
  surveyActive?: boolean
  /** Current survey question info - used for post-response extraction */
  currentSurveyQuestion?: { key: string; prompt: string } | null
}

export function useRemyMascotSend(config: UseRemyMascotSendConfig) {
  const {
    messages,
    setMessages,
    pathname,
    feedText,
    lipSyncStop,
    resetLipSync,
    dispatchBody,
    setMascotLoading,
    drawerBusy,
    surveyActive = false,
    currentSurveyQuestion = null,
  } = config

  const [input, setInput] = useState('')
  const [loading, setLoadingInternal] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)

  const setLoading = useCallback(
    (val: boolean) => {
      setLoadingInternal(val)
      setMascotLoading(val)
      if (val) dispatchBody({ type: 'RESPONSE_STARTED' })
    },
    [setMascotLoading, dispatchBody]
  )

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setLoading(false)
    setStreamingContent('')
    resetLipSync()
    dispatchBody({ type: 'RESPONSE_ENDED' })
  }, [resetLipSync, setLoading, dispatchBody])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const handleSend = useCallback(
    async (text?: string) => {
      const message = (text ?? input).trim()
      if (!message || loading || drawerBusy) return

      // Debug commands
      const debugEvent = DEBUG_COMMANDS[message.toLowerCase()]
      if (debugEvent) {
        setInput('')
        dispatchBody({ type: debugEvent } as BodyEvent)
        const debugMsg: RemyMessage = {
          id: generateId(),
          role: 'remy',
          content: `[Debug] Fired \`${debugEvent}\``,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, debugMsg])
        return
      }

      setInput('')

      const userMsg: RemyMessage = {
        id: generateId(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])
      setLoading(true)
      setStreamingContent('')
      resetLipSync()

      let timeoutId: ReturnType<typeof setTimeout> | undefined
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined

      try {
        const controller = new AbortController()
        abortControllerRef.current = controller
        timeoutId = setTimeout(() => controller.abort(), 120_000)

        const activity = getSessionActivity()
        const otherDigest = getOtherChannelDigest('mascot')
        const response = await fetch('/api/remy/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            history: messages.slice(-10),
            currentPage: pathname,
            recentPages: activity.recentPages,
            recentActions: activity.recentActions,
            recentErrors: activity.recentErrors,
            sessionMinutes: activity.sessionMinutes,
            activeForm: surveyActive ? 'remy-survey' : activity.activeForm,
            ...(otherDigest && { otherChannelDigest: otherDigest }),
          }),
          signal: controller.signal,
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        let hasReceivedFirstToken = false

        const result = await parseRemyStream(reader, {
          onToken: (token) => {
            if (!hasReceivedFirstToken) {
              hasReceivedFirstToken = true
              dispatchBody({ type: 'FIRST_TOKEN' })
            }
            setStreamingContent((prev) => prev + token)
            feedText(token)
          },
          onError: () => {
            setStreamingContent('')
          },
        })

        const cleanContent = result.fullContent
          .replace(/\nNAV_SUGGESTIONS:\s*\[[\s\S]*\]/, '')
          .trim()

        const remyMsg: RemyMessage = {
          id: generateId(),
          role: 'remy',
          content: cleanContent,
          timestamp: new Date().toISOString(),
          tasks: result.tasks,
          navSuggestions: result.navSuggestions,
          ...(result.isError && { isRetryable: true, retryMessage: message }),
        }
        setMessages((prev) => [...prev, remyMsg])
        setStreamingContent('')
        lipSyncStop()

        // Cross-chat digest - record this exchange for the drawer to reference
        updateChannelDigest('mascot', message, cleanContent)

        // Survey answer extraction - non-blocking Ollama fast-tier extraction
        if (surveyActive && currentSurveyQuestion) {
          extractSurveyAnswer(
            currentSurveyQuestion.key,
            currentSurveyQuestion.prompt,
            message
          ).catch((err) => console.error('[non-blocking] Survey extraction failed:', err))
        }

        const hasTasks =
          result.tasks && result.tasks.length > 0 && result.tasks.some((t) => t.status === 'done')
        dispatchBody({ type: hasTasks ? 'SUCCESS' : 'RESPONSE_ENDED' })
      } catch (err: unknown) {
        resetLipSync()
        if (err instanceof DOMException && err.name === 'AbortError') {
          dispatchBody({ type: 'RESPONSE_ENDED' })
          const cancelMsg: RemyMessage = {
            id: generateId(),
            role: 'remy',
            content:
              'Request timed out - the AI model was probably still loading. Hit retry and I should be ready!',
            timestamp: new Date().toISOString(),
            isRetryable: true,
            retryMessage: message,
          }
          setMessages((prev) => [...prev, cancelMsg])
        } else {
          dispatchBody({ type: 'ERROR' })
          const errMsg = err instanceof Error ? err.message : 'Something went wrong. Try again.'
          const isOllamaOffline =
            errMsg.includes('Local AI is offline') || errMsg.includes('Ollama')
          const errorReply: RemyMessage = {
            id: generateId(),
            role: 'remy',
            content: isOllamaOffline
              ? "I'm offline right now - Ollama needs to be running for me to help. Start it up and try again!"
              : errMsg,
            timestamp: new Date().toISOString(),
            isRetryable: true,
            retryMessage: message,
          }
          setMessages((prev) => [...prev, errorReply])
          if (!isOllamaOffline) toast.error(errMsg)
        }
        setStreamingContent('')
      } finally {
        clearTimeout(timeoutId)
        reader?.cancel().catch(() => {})
        abortControllerRef.current = null
        setLoading(false)
      }
    },
    [
      input,
      loading,
      drawerBusy,
      messages,
      pathname,
      feedText,
      lipSyncStop,
      resetLipSync,
      dispatchBody,
      setMessages,
      setLoading,
      surveyActive,
      currentSurveyQuestion,
    ]
  )

  return {
    input,
    setInput,
    loading,
    streamingContent,
    handleSend,
    handleCancel,
  }
}
