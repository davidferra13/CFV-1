import { useState, useRef, useCallback, useEffect, type Dispatch, type SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  createConversation as createLocalConversation,
  addMessage as saveLocalMessage,
  updateConversation as updateLocalConversation,
  pruneOldConversations,
  trimConversationMessages,
  logAction,
  autoSuggestProject,
  autoTitle,
} from '@/lib/ai/remy-local-storage'
import { approveTask } from '@/lib/ai/command-orchestrator'
import { saveRemyMessage, saveRemyTaskResult } from '@/lib/ai/remy-artifact-actions'
import { extractAndSaveMemories } from '@/lib/ai/remy-memory-actions'
import { getSessionActivity } from '@/lib/ai/remy-activity-tracker'
import type { BodyEvent } from '@/lib/ai/remy-body-state'
import type {
  RemyMessage,
  RemyTaskResult,
  RemyMemoryItem,
  NavigationSuggestion,
} from '@/lib/ai/remy-types'
import type { RemyConversation } from './use-conversation-management'

function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID)
      return (crypto as any).randomUUID()
    if (typeof window !== 'undefined' && window.crypto && (window.crypto as any).randomUUID)
      return (window.crypto as any).randomUUID()
  } catch (e) {
    // ignore and fallback
  }
  return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ─── Debug Commands ──────────────────────────────────────────────────────
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
  'remy exit': 'DRAWER_CLOSED',
  'remy idle': 'INTERACT',
}

export interface UseRemySendConfig {
  input: string
  setInput: Dispatch<SetStateAction<string>>
  messages: RemyMessage[]
  setMessages: Dispatch<SetStateAction<RemyMessage[]>>
  currentConversationId: string | null
  setCurrentConversationId: (id: string | null) => void
  conversations: RemyConversation[]
  setConversations: Dispatch<SetStateAction<RemyConversation[]>>
  isFirstExchange: boolean
  setIsFirstExchange: (v: boolean) => void
  setProjectSuggestion: (s: { name: string; icon: string } | null) => void
  pathname: string | null
  soundEnabled: boolean
  // Remy context callbacks
  feedText: (text: string) => void
  lipSyncStop: () => void
  resetLipSync: () => void
  dispatchBody: (event: BodyEvent) => void
  setContextLoading: (v: boolean) => void
  closeDrawer: () => void
}

export function useRemySend(config: UseRemySendConfig) {
  const {
    input,
    setInput,
    messages,
    setMessages,
    currentConversationId,
    setCurrentConversationId,
    conversations,
    setConversations,
    isFirstExchange,
    setIsFirstExchange,
    setProjectSuggestion,
    pathname,
    soundEnabled,
    feedText,
    lipSyncStop,
    resetLipSync,
    dispatchBody,
    setContextLoading,
    closeDrawer,
  } = config

  const [loadingInternal, setLoadingInternal] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingIntent, setStreamingIntent] = useState<string | undefined>()
  const [elapsedSec, setElapsedSec] = useState(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const router = useRouter()

  // Sync loading state to context so mascot shows thinking animation
  const setLoading = useCallback(
    (val: boolean) => {
      setLoadingInternal(val)
      setContextLoading(val)
      if (val) {
        dispatchBody({ type: 'RESPONSE_STARTED' })
      }
    },
    [setContextLoading, dispatchBody]
  )

  const loading = loadingInternal

  // Elapsed timer while loading
  useEffect(() => {
    if (!loading) {
      setElapsedSec(0)
      return
    }
    const interval = setInterval(() => setElapsedSec((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [loading])

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 800
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.1, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.3)
      osc.onended = () => ctx.close()
    } catch {
      // AudioContext not available
    }
  }, [soundEnabled])

  const autoSave = useCallback((userMessage: string, remyMsg: RemyMessage) => {
    const title =
      remyMsg.content.length > 60 ? remyMsg.content.slice(0, 57) + '...' : remyMsg.content
    saveRemyMessage({ title, content: remyMsg.content, sourceMessage: userMessage }).catch((err) =>
      console.error('[non-blocking] Auto-save message failed', err)
    )

    if (remyMsg.tasks?.length) {
      for (const task of remyMsg.tasks) {
        if (task.status === 'error') continue
        saveRemyTaskResult({
          taskType: task.taskType,
          taskName: task.name,
          data: task.data,
          sourceMessage: userMessage,
        }).catch((err) => console.error('[non-blocking] Auto-save task failed', err))
      }
    }

    extractAndSaveMemories(userMessage, remyMsg.content).catch((err) =>
      console.error('[non-blocking] Memory extraction failed', err)
    )
  }, [])

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setLoading(false)
    setStreamingContent('')
    setStreamingIntent(undefined)
    resetLipSync()
    dispatchBody({ type: 'RESPONSE_ENDED' })
    toast.success('Request cancelled')
  }, [resetLipSync, setLoading, dispatchBody])

  const handleSend = useCallback(
    async (text?: string) => {
      const message = (text ?? input).trim()
      if (!message || loading) return

      // Check for debug commands — intercept before API call
      const debugEvent = DEBUG_COMMANDS[message.toLowerCase()]
      if (debugEvent) {
        setInput('')
        dispatchBody({ type: debugEvent } as BodyEvent)
        const debugMsg: RemyMessage = {
          id: generateId(),
          role: 'remy',
          content: `[Debug] Fired \`${debugEvent}\` → body state transition`,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, debugMsg])
        return
      }

      setInput('')

      let convId = currentConversationId
      if (!convId) {
        try {
          const conv = await createLocalConversation()
          convId = conv.id
          setCurrentConversationId(conv.id)
          setConversations((prev) => [
            {
              id: conv.id,
              title: conv.title,
              isActive: true,
              createdAt: conv.createdAt,
              updatedAt: conv.updatedAt,
            },
            ...prev,
          ])
          pruneOldConversations().catch(() => {})
        } catch (err) {
          console.error('[remy] Failed to create conversation:', err)
          toast.error('Failed to start conversation')
          return
        }
      }

      const userMsg: RemyMessage = {
        id: generateId(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMsg])
      setLoading(true)
      setStreamingContent('')
      setStreamingIntent(undefined)
      resetLipSync()

      saveLocalMessage(convId, 'user', message).catch((err) =>
        console.error('[non-blocking] Save user msg failed', err)
      )

      let timeoutId: ReturnType<typeof setTimeout> | undefined
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined

      try {
        const controller = new AbortController()
        abortControllerRef.current = controller

        timeoutId = setTimeout(() => controller.abort(), 120_000)

        const activity = getSessionActivity()
        const response = await fetch('/api/remy/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            history: messages.slice(-30),
            currentPage: pathname,
            recentPages: activity.recentPages,
            recentActions: activity.recentActions,
            recentErrors: activity.recentErrors,
            sessionMinutes: activity.sessionMinutes,
            activeForm: activity.activeForm,
          }),
          signal: controller.signal,
        })

        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let fullContent = ''
        let hasReceivedFirstToken = false
        let isErrorResponse = false
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
                  if (!hasReceivedFirstToken) {
                    hasReceivedFirstToken = true
                    dispatchBody({ type: 'FIRST_TOKEN' })
                  }
                  fullContent += event.data as string
                  setStreamingContent(fullContent)
                  feedText(event.data as string)
                  break
                case 'tasks':
                  tasks = event.data as RemyTaskResult[]
                  break
                case 'nav':
                  navSuggestions = event.data as NavigationSuggestion[]
                  break
                case 'memories':
                  memoryItems = event.data as RemyMemoryItem[]
                  break
                case 'intent':
                  setStreamingIntent(event.data as string)
                  break
                case 'error':
                  fullContent = event.data as string
                  isErrorResponse = true
                  setStreamingContent('')
                  break
                case 'done':
                  break
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }

        const cleanContent = fullContent.replace(/\nNAV_SUGGESTIONS:\s*\[[\s\S]*\]/, '').trim()

        const remyMsg: RemyMessage = {
          id: generateId(),
          role: 'remy',
          content: cleanContent,
          timestamp: new Date().toISOString(),
          tasks,
          navSuggestions,
          memoryItems,
          ...(isErrorResponse && { isRetryable: true, retryMessage: message }),
        }
        setMessages((prev) => [...prev, remyMsg])
        setStreamingContent('')
        setStreamingIntent(undefined)
        lipSyncStop()

        const hasTasks = tasks && tasks.length > 0 && tasks.some((t) => t.status === 'done')
        if (hasTasks) {
          dispatchBody({ type: 'SUCCESS' })
        } else {
          dispatchBody({ type: 'RESPONSE_ENDED' })
        }

        playNotificationSound()

        saveLocalMessage(convId, 'remy', cleanContent, { tasks, navSuggestions })
          .then(() => trimConversationMessages(convId).catch(() => {}))
          .catch((err) => console.error('[non-blocking] Save remy msg failed', err))

        // Log task executions to the action log (non-blocking)
        if (tasks && tasks.length > 0) {
          for (const task of tasks) {
            logAction({
              conversationId: convId,
              messageId: null,
              action: task.taskType,
              params: task.data ? JSON.stringify(task.data).slice(0, 500) : null,
              status: task.status === 'done' || task.status === 'pending' ? 'success' : 'error',
              result: task.error ?? (task.data ? JSON.stringify(task.data).slice(0, 200) : null),
              duration: 0,
            }).catch(() => {})
          }
        }

        if (isFirstExchange) {
          setIsFirstExchange(false)
          const title = autoTitle(message)
          updateLocalConversation(convId, { title })
            .then(() => {
              setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, title } : c)))
            })
            .catch((err) => console.error('[non-blocking] Auto-title failed', err))

          const suggestion = autoSuggestProject(message)
          if (suggestion) {
            setProjectSuggestion(suggestion)
          }
        }

        autoSave(message, remyMsg)
      } catch (err: unknown) {
        resetLipSync()
        if (err instanceof DOMException && err.name === 'AbortError') {
          dispatchBody({ type: 'RESPONSE_ENDED' })
          const cancelMsg: RemyMessage = {
            id: generateId(),
            role: 'remy',
            content:
              'Request timed out — the AI model was probably still loading. Hit retry and I should be ready!',
            timestamp: new Date().toISOString(),
            isRetryable: true,
            retryMessage: message,
          }
          setMessages((prev) => [...prev, cancelMsg])
          setStreamingContent('')
          setStreamingIntent(undefined)
        } else {
          dispatchBody({ type: 'ERROR' })
          const errMsg = err instanceof Error ? err.message : 'Remy is having trouble. Try again.'
          const isOllamaOffline =
            errMsg.includes('Local AI is offline') || errMsg.includes('Ollama')
          const remyErrorMsg: RemyMessage = {
            id: generateId(),
            role: 'remy',
            content: isOllamaOffline
              ? "I'm offline right now — Ollama needs to be running for me to help. Start it up and try again!"
              : errMsg,
            timestamp: new Date().toISOString(),
            isRetryable: true,
            retryMessage: message,
          }
          setMessages((prev) => [...prev, remyErrorMsg])
          setStreamingContent('')
          setStreamingIntent(undefined)
          if (!isOllamaOffline) toast.error(errMsg)
        }
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
      messages,
      pathname,
      autoSave,
      currentConversationId,
      isFirstExchange,
      playNotificationSound,
      feedText,
      lipSyncStop,
      resetLipSync,
      dispatchBody,
      setInput,
      setMessages,
      setCurrentConversationId,
      setConversations,
      setIsFirstExchange,
      setProjectSuggestion,
      setLoading,
    ]
  )

  const handleApproveTask = useCallback(
    async (taskId: string, taskType: string, data: unknown) => {
      try {
        const result = await approveTask(taskType, data)

        if (
          (taskType === 'email.followup' || taskType === 'email.generic') &&
          data &&
          (data as { draftText?: string }).draftText
        ) {
          await navigator.clipboard.writeText((data as { draftText: string }).draftText)
        }

        toast.success(result.message)

        if (result.redirectUrl) {
          setTimeout(() => {
            closeDrawer()
            router.push(result.redirectUrl!)
          }, 1000)
        }

        setMessages((prev) =>
          prev.map((msg) => {
            if (!msg.tasks) return msg
            return {
              ...msg,
              tasks: msg.tasks.map((t) =>
                t.taskId === taskId ? { ...t, status: 'done' as const } : t
              ),
            }
          })
        )
      } catch {
        toast.error('Failed to approve task')
      }
    },
    [router, closeDrawer, setMessages]
  )

  const handleRejectTask = useCallback(
    (taskId: string) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg.tasks) return msg
          return {
            ...msg,
            tasks: msg.tasks.filter((t) => t.taskId !== taskId),
          }
        })
      )
      toast.success('Task dismissed')
    },
    [setMessages]
  )

  // Abort in-flight request getter for parent cleanup
  const abortInflight = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setLoading(false)
      setStreamingContent('')
      setStreamingIntent(undefined)
    }
  }, [setLoading])

  return {
    loading,
    streamingContent,
    streamingIntent,
    elapsedSec,
    handleSend,
    handleCancel,
    handleApproveTask,
    handleRejectTask,
    abortInflight,
  }
}
