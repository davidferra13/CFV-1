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
  getActionLog,
  autoSuggestProject,
  autoTitle,
  getLastSessionSummary,
} from '@/lib/ai/remy-local-storage'
import { parseRemyStream } from '@/lib/ai/remy-stream-parser'
import { approveTask } from '@/lib/ai/command-orchestrator'
import { saveRemyMessage, saveRemyTaskResult } from '@/lib/ai/remy-artifact-actions'
import {
  extractAndSaveMemories,
  handleCorrectionMemory,
  detectDraftFeedback,
} from '@/lib/ai/remy-memory-actions'
import {
  getSessionActivity,
  updateChannelDigest,
  getOtherChannelDigest,
} from '@/lib/ai/remy-activity-tracker'
import type { BodyEvent } from '@/lib/ai/remy-body-state'
import {
  type EntityContext,
  createEntityContext,
  extractEntities,
  updateEntityContext,
  resolveReferences,
  buildEntityContextFromHistory,
} from '@/lib/ai/remy-coreference'
import {
  generateConversationSummary,
  shouldGenerateSummary,
} from '@/lib/ai/remy-conversation-summary'
import { saveSummary, getRecentSummaries } from '@/lib/ai/remy-local-storage'
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

  // Coreference resolution - track entities across conversation turns
  const entityContextRef = useRef<EntityContext>(createEntityContext())

  // Rebuild entity context when messages change (e.g., loading a conversation)
  useEffect(() => {
    entityContextRef.current = buildEntityContextFromHistory(messages)
  }, [messages.length]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const autoSave = useCallback(
    (userMessage: string, remyMsg: RemyMessage) => {
      const title =
        remyMsg.content.length > 60 ? remyMsg.content.slice(0, 57) + '...' : remyMsg.content
      saveRemyMessage({ title, content: remyMsg.content, sourceMessage: userMessage }).catch(
        (err) => console.error('[non-blocking] Auto-save message failed', err)
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

      // Correction-aware memory: detect "no, actually..." and auto-fix wrong memories
      handleCorrectionMemory(userMessage).catch((err) =>
        console.error('[non-blocking] Correction detection failed', err)
      )

      // Draft feedback learning: detect style preferences from feedback on drafts
      // Look at previous messages for draft-producing tasks
      const previousRemyMsg = messages.findLast((m) => m.role === 'remy' && m.tasks?.length)
      if (previousRemyMsg?.tasks) {
        detectDraftFeedback(userMessage, previousRemyMsg.tasks).catch((err) =>
          console.error('[non-blocking] Draft feedback learning failed', err)
        )
      }
    },
    [messages]
  )

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
    async (
      text?: string,
      opts?: { imageBase64?: string; imageIntent?: 'receipt' | 'dish' | 'auto' }
    ) => {
      const message = (text ?? input).trim()
      if (!message || loading) return

      // Check for debug commands - intercept before API call
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

      // Auto-approve learning - check if any tasks in the last response are "always approved"
      // (chef has approved this task type 5+ times, never rejected)
      const lastRemyForAutoApprove = [...messages]
        .reverse()
        .find((m) => m.role === 'remy' && m.tasks?.some((t) => t.status === 'pending'))
      if (lastRemyForAutoApprove?.tasks) {
        const pendingForAuto = lastRemyForAutoApprove.tasks.filter((t) => t.status === 'pending')
        if (pendingForAuto.length > 0) {
          getActionLog(500)
            .then((actions) => {
              const approvalCounts = new Map<string, { approved: number; rejected: number }>()
              for (const a of actions) {
                if (!a.action) continue
                if (!approvalCounts.has(a.action))
                  approvalCounts.set(a.action, { approved: 0, rejected: 0 })
                const counts = approvalCounts.get(a.action)!
                if (a.status === 'success') counts.approved++
                else counts.rejected++
              }
              // Tasks that have been approved 5+ times with zero rejections
              for (const task of pendingForAuto) {
                const counts = approvalCounts.get(task.taskType)
                if (counts && counts.approved >= 5 && counts.rejected === 0) {
                  console.log(
                    `[remy-auto-approve] Task type "${task.taskType}" qualifies for auto-approval (${counts.approved} approvals, 0 rejections)`
                  )
                  // Don't auto-execute yet - just add a hint to the task card
                  // Future: could auto-execute tier 1 tasks that qualify
                }
              }
            })
            .catch((err) => {
              console.error('[non-blocking] remy auto-approve check failed:', err)
            })
        }
      }

      // Conversational follow-through - "yes" / "do it" / "go ahead" executes last suggestion
      const followThroughPattern =
        /^(yes|yep|yeah|yea|ya|do it|go ahead|go for it|sure|approved|approve|ok do it|ok go|let'?s do it|please do|make it happen|send it|ship it|confirm|confirmed|ok|okay)\.?$/i
      if (followThroughPattern.test(message)) {
        // Find last Remy message with pending tasks
        const lastRemyWithTasks = [...messages]
          .reverse()
          .find((m) => m.role === 'remy' && m.tasks?.some((t) => t.status === 'pending'))
        if (lastRemyWithTasks?.tasks) {
          const pendingTasks = lastRemyWithTasks.tasks.filter((t) => t.status === 'pending')
          if (pendingTasks.length > 0) {
            setInput('')
            const userMsg: RemyMessage = {
              id: generateId(),
              role: 'user',
              content: message,
              timestamp: new Date().toISOString(),
            }
            setMessages((prev) => [...prev, userMsg])

            // Auto-approve all pending tasks via direct server call
            for (const task of pendingTasks) {
              approveTask(task.taskType, task.data)
                .then((result) => {
                  if (result.success) {
                    toast.success(result.message)
                    setMessages((prev) =>
                      prev.map((msg) => {
                        if (!msg.tasks) return msg
                        return {
                          ...msg,
                          tasks: msg.tasks.map((t) =>
                            t.taskId === task.taskId ? { ...t, status: 'done' as const } : t
                          ),
                        }
                      })
                    )
                    if (result.redirectUrl) {
                      setTimeout(() => {
                        closeDrawer()
                        router.push(result.redirectUrl!)
                      }, 1000)
                    }
                  } else {
                    toast.error(result.message)
                  }
                })
                .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed'))
            }

            const confirmMsg: RemyMessage = {
              id: generateId(),
              role: 'remy',
              content: `On it, chef! Executing ${pendingTasks.length === 1 ? `"${pendingTasks[0].name}"` : `${pendingTasks.length} tasks`} now.`,
              timestamp: new Date().toISOString(),
            }
            setMessages((prev) => [...prev, confirmMsg])
            return
          }
        }
      }

      // Session recap - intercept client-side, no API call (Formula > AI)
      const recapPattern =
        /^(what did we do|session recap|recap today|what have we done|summarize (this |our )?session)/i
      if (recapPattern.test(message)) {
        setInput('')
        const userMsg: RemyMessage = {
          id: generateId(),
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, userMsg])

        try {
          const actions = await getActionLog(100)
          const today = new Date().toDateString()
          const todayActions = actions.filter((a) => new Date(a.createdAt).toDateString() === today)

          let recapContent: string
          if (todayActions.length === 0) {
            recapContent =
              "We haven't taken any actions yet today, chef. Ask me to do something and I'll keep track of it all."
          } else {
            const grouped = new Map<string, number>()
            for (const a of todayActions) {
              const key = a.action || 'action'
              grouped.set(key, (grouped.get(key) || 0) + 1)
            }
            const lines = Array.from(grouped.entries()).map(
              ([name, count]) => `- **${name}**${count > 1 ? ` (x${count})` : ''}`
            )
            const successCount = todayActions.filter((a) => a.status === 'success').length
            const errorCount = todayActions.filter((a) => a.status === 'error').length

            recapContent = `Here's what we've done today, chef:\n\n${lines.join('\n')}\n\n**${todayActions.length} total actions** - ${successCount} successful${errorCount > 0 ? `, ${errorCount} had issues` : ''}.`
          }

          const recapMsg: RemyMessage = {
            id: generateId(),
            role: 'remy',
            content: recapContent,
            timestamp: new Date().toISOString(),
          }
          setMessages((prev) => [...prev, recapMsg])
        } catch {
          const errorMsg: RemyMessage = {
            id: generateId(),
            role: 'remy',
            content: "Couldn't pull up the action log right now. Try again in a sec.",
            timestamp: new Date().toISOString(),
          }
          setMessages((prev) => [...prev, errorMsg])
        }
        return
      }

      setInput('')

      let convId = currentConversationId
      let lastSessionSummary: Awaited<ReturnType<typeof getLastSessionSummary>> = null
      const recentSummaries = getRecentSummaries(currentConversationId)
      if (!convId) {
        try {
          // Load previous session context before creating new conversation
          lastSessionSummary = await getLastSessionSummary(null).catch(() => null)
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
          pruneOldConversations().catch((err) => {
            console.error('[non-blocking] pruneOldConversations failed:', err)
          })
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

        // Coreference resolution - extract entities from user message & resolve pronouns
        const turnIndex = messages.length
        const userEntities = extractEntities(message, turnIndex)
        entityContextRef.current = updateEntityContext(entityContextRef.current, userEntities)
        const resolvedMessage = resolveReferences(message, entityContextRef.current) ?? message

        const activity = getSessionActivity()
        const otherDigest = getOtherChannelDigest('drawer')
        const response = await fetch('/api/remy/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: resolvedMessage,
            history: messages.slice(-30),
            currentPage: pathname,
            recentPages: activity.recentPages,
            recentActions: activity.recentActions,
            recentErrors: activity.recentErrors,
            sessionMinutes: activity.sessionMinutes,
            activeForm: activity.activeForm,
            ...(otherDigest && { otherChannelDigest: otherDigest }),
            ...(lastSessionSummary && { previousSessionTopics: lastSessionSummary }),
            ...(recentSummaries.length > 0 && { recentConversationSummaries: recentSummaries }),
            ...(opts?.imageBase64 && { imageBase64: opts.imageBase64 }),
            ...(opts?.imageIntent && { imageIntent: opts.imageIntent }),
          }),
          signal: controller.signal,
        })

        if (!response.ok) {
          let errorMessage = `HTTP ${response.status}`
          try {
            const raw = await response.text()
            if (raw) {
              try {
                const parsed = JSON.parse(raw) as { error?: string; message?: string }
                errorMessage = parsed.error ?? parsed.message ?? raw
              } catch {
                const sseMatch = raw.match(/"data":"([^"]+)"/)
                if (sseMatch?.[1]) {
                  errorMessage = sseMatch[1]
                } else {
                  errorMessage = raw
                }
              }
            }
          } catch {
            // keep default status message
          }
          throw new Error(errorMessage)
        }

        reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        let hasReceivedFirstToken = false
        let streamAccum = ''

        const result = await parseRemyStream(reader, {
          onToken: (token) => {
            if (!hasReceivedFirstToken) {
              hasReceivedFirstToken = true
              dispatchBody({ type: 'FIRST_TOKEN' })
            }
            streamAccum += token
            setStreamingContent(streamAccum)
            feedText(token)
          },
          onIntent: (intent) => setStreamingIntent(intent),
          onError: () => setStreamingContent(''),
        })

        const { fullContent, isError: isErrorResponse, tasks, navSuggestions, memoryItems } = result
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

        // Extract entities from Remy's response for coreference tracking
        const remyEntities = extractEntities(cleanContent, turnIndex + 1)
        entityContextRef.current = updateEntityContext(entityContextRef.current, remyEntities)

        // Auto-generate conversation summary when reaching 10+ messages
        const updatedMessages = [...messages, userMsg, remyMsg]
        if (shouldGenerateSummary(updatedMessages) && currentConversationId) {
          try {
            const summary = generateConversationSummary(updatedMessages)
            saveSummary(currentConversationId, summary)
          } catch {
            // Non-blocking - summary generation is supplemental
          }
        }

        // Cross-chat digest - record this exchange for the mascot to reference
        updateChannelDigest('drawer', message, cleanContent)

        const hasTasks = tasks && tasks.length > 0 && tasks.some((t) => t.status === 'done')
        if (hasTasks) {
          dispatchBody({ type: 'SUCCESS' })
        } else {
          dispatchBody({ type: 'RESPONSE_ENDED' })
        }

        playNotificationSound()

        saveLocalMessage(convId, 'remy', cleanContent, { tasks, navSuggestions })
          .then(() =>
            trimConversationMessages(convId).catch((err) => {
              console.error('[non-blocking] trimConversationMessages failed:', err)
            })
          )
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
            }).catch((err) => {
              console.error('[non-blocking] logAction failed:', err)
            })
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
              'Request timed out - the AI model was probably still loading. Hit retry and I should be ready!',
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
              ? "I'm offline right now - Ollama needs to be running for me to help. Start it up and try again!"
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
      closeDrawer,
      router,
    ]
  )

  const handleApproveTask = useCallback(
    async (taskId: string, taskType: string, data: unknown, approvalConfirmation?: string) => {
      try {
        const result = await approveTask(taskType, data, approvalConfirmation)
        if (!result.success) {
          toast.error(result.message)
          return
        }

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
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to approve task'
        toast.error(message)
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
