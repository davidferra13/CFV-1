'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { RemyAvatar } from '@/components/ai/remy-avatar'
import { useRemyContext } from '@/components/ai/remy-context'
import {
  Bot,
  X,
  Send,
  Loader2,
  ArrowRight,
  Plus,
  MessageSquare,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Download,
  Globe,
  Paperclip,
  Search,
  Volume2,
  VolumeX,
  Square,
  Mic,
  MicOff,
  Settings2,
  Info,
  Headphones,
  Activity,
  BookTemplate,
  List,
  Bookmark,
  Check,
  Copy,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
} from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { RemyTaskCard } from '@/components/ai/remy-task-card'
import { RemyCapabilitiesPanel } from '@/components/ai/remy-capabilities-panel'
import { RemyConversationList } from '@/components/ai/remy-conversation-list'
import { RemySearchView } from '@/components/ai/remy-search-view'
import { RemyActionLog } from '@/components/ai/remy-action-log'
import { RemyTemplatesView } from '@/components/ai/remy-templates-view'
import { exportConversation as exportLocalConversation } from '@/lib/ai/remy-local-storage'
import { decayStaleMemories } from '@/lib/ai/remy-memory-actions'
import { shareConversationWithSupport } from '@/lib/ai/support-share-action'
import { toast } from 'sonner'
import type { RemyMessage, RemyMemoryItem } from '@/lib/ai/remy-types'
import { trackPageVisit, initSessionTimer } from '@/lib/ai/remy-activity-tracker'
import { NEW_USER_STARTERS } from '@/lib/ai/remy-welcome'
import { getRemyCuratedGreeting, advanceRemyTour } from '@/lib/ai/remy-personality-engine'

// ─── Extracted modules ───────────────────────────────────────────────────────
import { getStartersForPage, getThinkingMessage } from '@/lib/ai/remy-starters'
import { markdownComponents } from '@/lib/ai/remy-markdown-config'
import { useVoiceInput } from '@/lib/hooks/use-voice-input'
import {
  useMessageActions,
  DEFAULT_VOICE_SETTINGS,
  saveVoiceSettings,
} from '@/lib/hooks/use-message-actions'
import { useConversationManagement } from '@/lib/hooks/use-conversation-management'
import { useRemySend } from '@/lib/hooks/use-remy-send'
import { useKitchenMode } from '@/lib/hooks/use-kitchen-mode'

// ─── Constants ───────────────────────────────────────────────────────────────

const DRAWER_MIN_WIDTH = 320
const DRAWER_MAX_WIDTH = 800
const DRAWER_DEFAULT_WIDTH = 448 // max-w-md equivalent

// ─── Main Component ──────────────────────────────────────────────────────────

export function RemyDrawer() {
  const {
    isDrawerOpen: open,
    closeDrawer,
    feedText,
    stopSpeaking: lipSyncStop,
    resetLipSync,
    dispatchBody,
    setIsLoading: setContextLoading,
  } = useRemyContext()

  const pathname = usePathname()

  // ─── Local UI state ────────────────────────────────────────────────────────
  const [collapsed, setCollapsed] = useState(false)
  const [input, setInput] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [drawerWidth, setDrawerWidth] = useState(DRAWER_DEFAULT_WIDTH)
  const [drawerView, setDrawerView] = useState<
    'chat' | 'list' | 'search' | 'actions' | 'templates'
  >('chat')
  const [showCapabilities, setShowCapabilities] = useState(false)
  const [hasDecayedThisSession, setHasDecayedThisSession] = useState(false)
  const [curatedQuickReplies, setCuratedQuickReplies] = useState<string[]>([])
  const [lastCuratedMsgId, setLastCuratedMsgId] = useState<string | null>(null)
  const [curatedGreetingLoaded, setCuratedGreetingLoaded] = useState(false)

  const drawerResizingRef = useRef<{ startX: number; startW: number } | null>(null)
  const drawerDragCleanupRef = useRef<(() => void) | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingImageRef = useRef<{ base64: string; intent: 'receipt' | 'dish' | 'auto' } | null>(
    null
  )

  // ─── Extracted hooks ───────────────────────────────────────────────────────

  const convManager = useConversationManagement(setDrawerView)
  const {
    messages,
    setMessages,
    conversations,
    setConversations,
    currentConversationId,
    setCurrentConversationId,
    conversationsLoaded,
    isFirstExchange,
    setIsFirstExchange,
    projectSuggestion,
    setProjectSuggestion,
    loadConversationList,
    handleSelectConversation,
    handleNewConversation,
    handleDeleteConversation,
    handleAcceptProjectSuggestion,
  } = convManager

  const msgActions = useMessageActions(setMessages)
  const {
    copiedId,
    speakingId,
    voiceSettings,
    setVoiceSettings,
    availableVoices,
    showVoiceSettings,
    setShowVoiceSettings,
    handleCopy,
    handleToggleBookmark,
    handleSpeak,
    handlePreviewVoice,
    updateVoiceSetting,
    stopSpeaking,
    handleDeleteMessage,
    handleDeleteMemory,
  } = msgActions

  const sendHook = useRemySend({
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
  })
  const {
    loading,
    streamingContent,
    streamingIntent,
    elapsedSec,
    handleSend,
    handleCancel,
    handleApproveTask,
    handleRejectTask,
    abortInflight,
  } = sendHook

  // Wrapper: attach pending image to handleSend calls from the input area
  const handleSendWithImage = useCallback(
    (text?: string) => {
      const img = pendingImageRef.current
      pendingImageRef.current = null
      if (img) {
        return handleSend(text, { imageBase64: img.base64, imageIntent: img.intent })
      }
      return handleSend(text)
    },
    [handleSend]
  )

  // Voice input - merge transcript into input field
  const voiceInput = useVoiceInput(
    useCallback((text: string) => {
      setInput((prev) => {
        const base = prev.replace(/\[listening\.\.\.\].*$/i, '').trim()
        return base ? `${base} ${text}` : text
      })
    }, [])
  )
  const { isListening, supportsVoice, toggleVoiceInput } = voiceInput

  // Kitchen Mode - continuous listening with wake word "Hey Remy"
  const kitchenModeHook = useKitchenMode({
    onMessage: handleSend,
    isLoading: loading,
  })
  const { kitchenMode, isCapturing, toggleKitchenMode } = kitchenModeHook

  // Context-aware starters
  const starters = useMemo(() => getStartersForPage(pathname ?? '/dashboard'), [pathname])

  // ─── Lifecycle effects ─────────────────────────────────────────────────────

  // Restore saved drawer width from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('remy-drawer-width')
      if (saved) {
        const w = parseInt(saved, 10)
        if (w >= DRAWER_MIN_WIDTH && w <= DRAWER_MAX_WIDTH) setDrawerWidth(w)
      }
    }
  }, [])

  // Cleanup drag listeners on unmount
  useEffect(() => {
    return () => {
      drawerDragCleanupRef.current?.()
    }
  }, [])

  // Initialize session timer + track navigation
  useEffect(() => {
    initSessionTimer()
  }, [])

  useEffect(() => {
    if (pathname) trackPageVisit(pathname)
  }, [pathname])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Auto-focus textarea when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [open])

  // Ollama health check - detect limited mode
  const [ollamaOnline, setOllamaOnline] = useState(true)
  useEffect(() => {
    if (!open) return
    // Warm up the classifier model (qwen3:4b) and check Ollama status
    fetch('/api/remy/warmup', { method: 'POST' })
      .then((res) => setOllamaOnline(res.ok))
      .catch(() => setOllamaOnline(false))
    // Re-check every 60 seconds while drawer is open
    const interval = setInterval(() => {
      fetch('/api/remy/warmup', { method: 'POST' })
        .then((res) => setOllamaOnline(res.ok))
        .catch(() => setOllamaOnline(false))
    }, 60000)
    return () => clearInterval(interval)
  }, [open])

  // Abort in-flight request when drawer closes
  useEffect(() => {
    if (!open) {
      abortInflight()
    }
  }, [open, abortInflight])

  // Stop voice input when drawer closes
  useEffect(() => {
    if (!open && isListening) {
      voiceInput.stopListening()
    }
  }, [open, isListening, voiceInput])

  // Stop TTS when drawer closes
  useEffect(() => {
    if (!open) {
      stopSpeaking()
    }
  }, [open, stopSpeaking])

  // Auto-read: speak new Remy responses when auto-read is enabled
  const prevMessageCountRef = useRef(messages.length)
  useEffect(() => {
    const prevCount = prevMessageCountRef.current
    prevMessageCountRef.current = messages.length

    if (!voiceSettings.autoRead || !open) return
    if (messages.length <= prevCount) return
    // Only auto-read if the latest message is from Remy and we're not still streaming
    if (loading) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.role === 'remy' && lastMsg.content) {
      handleSpeak(lastMsg.id, lastMsg.content)
    }
  }, [messages.length, loading, voiceSettings.autoRead, open, handleSpeak, messages])

  // Stop speaking when user sends a new message
  useEffect(() => {
    if (loading && speakingId) {
      stopSpeaking()
    }
  }, [loading, speakingId, stopSpeaking])

  // Memory decay - run once per session when drawer first opens
  useEffect(() => {
    if (open && !hasDecayedThisSession) {
      setHasDecayedThisSession(true)
      decayStaleMemories()
        .then((result) => {
          if (result.deactivated > 0) {
            console.log(`[remy] Decayed ${result.deactivated} stale memories`)
          }
        })
        .catch((err) => console.error('[non-blocking] Memory decay failed:', err))
    }
  }, [open, hasDecayedThisSession])

  // Load conversations when drawer opens for the first time
  useEffect(() => {
    if (open && !conversationsLoaded) {
      loadConversationList()
    }
  }, [open, conversationsLoaded, loadConversationList])

  // Curated greeting: inject on new conversations (replaces generic welcome for onboarded users)
  useEffect(() => {
    if (!open || !conversationsLoaded || curatedGreetingLoaded) return
    // Fire when starting a fresh conversation (no messages, or only generic welcome)
    const isEmptyOrWelcome =
      messages.length === 0 ||
      (messages.length === 1 && (messages[0]?.id?.startsWith('remy-welcome') ?? false))
    if (!isEmptyOrWelcome) return

    setCuratedGreetingLoaded(true)
    getRemyCuratedGreeting()
      .then((greeting) => {
        if (!greeting) return
        const msgId = `remy-curated-${Date.now()}`
        const curatedMsg: RemyMessage = {
          id: msgId,
          role: 'remy',
          content: greeting.text,
          timestamp: new Date().toISOString(),
        }
        setMessages([curatedMsg])
        setLastCuratedMsgId(msgId)
        if (greeting.quickReplies.length > 0) {
          setCuratedQuickReplies(greeting.quickReplies)
        }
      })
      .catch(() => {})
  }, [open, conversationsLoaded, curatedGreetingLoaded, messages, setMessages])

  // Reset curated greeting state when a new conversation starts
  useEffect(() => {
    if (messages.length === 0) {
      setCuratedGreetingLoaded(false)
      setCuratedQuickReplies([])
      setLastCuratedMsgId(null)
    }
  }, [messages.length])

  // ─── Drawer resize ─────────────────────────────────────────────────────────

  const startDrawerResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      drawerResizingRef.current = { startX: e.clientX, startW: drawerWidth }
      let latestW = drawerWidth

      const onMouseMove = (ev: MouseEvent) => {
        if (!drawerResizingRef.current) return
        const { startX, startW } = drawerResizingRef.current
        latestW = Math.min(
          DRAWER_MAX_WIDTH,
          Math.max(DRAWER_MIN_WIDTH, startW + (startX - ev.clientX))
        )
        setDrawerWidth(latestW)
      }

      const cleanup = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        drawerDragCleanupRef.current = null
      }

      const onMouseUp = () => {
        drawerResizingRef.current = null
        sessionStorage.setItem('remy-drawer-width', String(latestW))
        cleanup()
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
      drawerDragCleanupRef.current = cleanup
    },
    [drawerWidth]
  )

  // ─── Handlers ──────────────────────────────────────────────────────────────

  // Handle quick-reply chip clicks (onboarding tour navigation)
  const handleQuickReply = useCallback(
    async (label: string) => {
      setCuratedQuickReplies([])
      setLastCuratedMsgId(null)

      // Tour navigation actions
      const isTourStart = label === 'Give me the tour'
      const isTourNext = label === 'Next'
      const isTourSkip = label === "I'll figure it out" || label === 'Skip the rest'

      if (isTourSkip) {
        advanceRemyTour('skip').catch(() => {})
        return
      }

      if (isTourStart || isTourNext) {
        const action = isTourStart ? 'start' : 'next'
        try {
          const beat = await advanceRemyTour(action)
          if (beat) {
            const msgId = `remy-curated-${Date.now()}`
            const beatMsg: RemyMessage = {
              id: msgId,
              role: 'remy',
              content: beat.text,
              timestamp: new Date().toISOString(),
            }
            setMessages((prev) => [...prev, beatMsg])
            setLastCuratedMsgId(msgId)
            if (beat.quickReplies.length > 0) {
              setCuratedQuickReplies(beat.quickReplies)
            }
          }
        } catch {
          // Non-blocking
        }
        return
      }

      // Regular quick reply — send as user message to Ollama
      handleSend(label)
    },
    [handleSend, setMessages]
  )

  const handleExport = useCallback(async () => {
    if (!currentConversationId) return
    try {
      const exported = await exportLocalConversation(currentConversationId)
      if (!exported) {
        toast.error('Conversation not found')
        return
      }
      const lines = [`# ${exported.title}`, `_Exported from ChefFlow Remy_\n`]
      for (const msg of exported.messages) {
        const role = msg.role === 'user' ? '**Chef**' : '**Remy**'
        const time = new Date(msg.createdAt).toLocaleString()
        lines.push(`${role} _(${time})_`)
        lines.push(msg.content)
        lines.push('')
      }
      const content = lines.join('\n')
      const blob = new Blob([content], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${exported.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Conversation exported')
    } catch (err) {
      console.error('[remy] Export failed:', err)
      toast.error('Failed to export conversation')
    }
  }, [currentConversationId])

  const handleSendToSupport = useCallback(async () => {
    if (!currentConversationId || messages.length === 0) return
    try {
      const exported = await exportLocalConversation(currentConversationId)
      if (!exported) {
        toast.error('Conversation not found')
        return
      }
      const result = await shareConversationWithSupport(exported)
      if (result.success) {
        toast.success('Conversation shared with support')
      } else {
        toast.error(result.error ?? 'Failed to share')
      }
    } catch (err) {
      console.error('[remy] Send to support failed:', err)
      toast.error('Failed to share conversation with support')
    }
  }, [currentConversationId, messages])

  const handleFeedback = useCallback(
    async (msgId: string, rating: 'up' | 'down') => {
      // Find the Remy message and the user message that triggered it
      const msgIndex = messages.findIndex((m) => m.id === msgId)
      if (msgIndex < 0) return
      const remyMsg = messages[msgIndex]
      if (remyMsg.feedback === rating) return // Already rated same way

      // Find the preceding user message
      let userMessage = ''
      for (let i = msgIndex - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          userMessage = messages[i].content
          break
        }
      }

      // Update local state immediately
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, feedback: rating } : m)))

      // Save to database (non-blocking)
      try {
        const { saveRemyFeedback } = await import('@/lib/ai/remy-feedback-actions')
        await saveRemyFeedback({
          userMessage,
          remyResponse: remyMsg.content,
          rating,
        })
      } catch (err) {
        console.error('[non-blocking] Feedback save failed:', err)
      }
    },
    [messages, setMessages]
  )

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const MAX_FILE_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 5MB.`)
      e.target.value = ''
      return
    }

    if (
      file.type.startsWith('text/') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.json')
    ) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const content = ev.target?.result as string
        const truncated =
          content.length > 10000 ? content.slice(0, 10000) + '\n...(truncated)' : content
        setInput((prev) => `${prev ? prev + '\n\n' : ''}[Attached: ${file.name}]\n${truncated}`)
        toast.success(`Attached ${file.name}`)
      }
      reader.readAsText(file)
    } else if (file.type.startsWith('image/')) {
      const imgReader = new FileReader()
      imgReader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        // Strip the data:image/...;base64, prefix - Ollama wants raw base64
        const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
        pendingImageRef.current = { base64, intent: 'auto' }
        setInput((prev) => `${prev ? prev + '\n\n' : ''}[Image attached: ${file.name}] Scan this`)
      }
      imgReader.readAsDataURL(file)
      toast.success(`Attached ${file.name} - send a message to analyze it`)
    } else {
      toast.error('Unsupported file type. Try text, markdown, CSV, JSON, or image files.')
    }

    e.target.value = ''
  }, [])

  const currentConvTitle = conversations.find((c) => c.id === currentConversationId)?.title

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp"
        onChange={handleFileSelect}
        aria-label="Attach file to Remy"
      />

      {/* Collapsed floating strip */}
      {open && collapsed && (
        <div
          data-remy-root
          className="fixed bottom-4 right-4 z-50 w-12 bg-brand-600 shadow-2xl flex flex-col items-center py-3 gap-2 rounded-2xl border border-brand-700"
          style={{ height: '180px' }}
        >
          <button
            onClick={() => setCollapsed(false)}
            className="text-white/80 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-stone-800/10"
            aria-label="Expand Remy"
            title="Expand Remy"
          >
            <ChevronsLeft className="h-5 w-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-stone-900/15 flex items-center justify-center mt-1">
            <Bot className="h-4 w-4 text-white" />
          </div>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-white/80 mt-1" />}
          {messages.length > 0 && !loading && (
            <span className="text-xxs text-white/50 font-medium">{messages.length}</span>
          )}
          <div className="flex-1" />
          <button
            onClick={() => {
              setCollapsed(false)
              closeDrawer()
            }}
            className="text-white/40 hover:text-white transition-colors p-1.5"
            aria-label="Close Remy"
            title="Close Remy"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Floating chat window - positioned bottom-right, page remains interactive */}
      {open && !collapsed && (
        <div
          data-remy-root
          role="dialog"
          aria-modal="true"
          aria-label="Remy AI assistant"
          className="fixed bottom-4 right-4 z-50 bg-stone-900 shadow-2xl flex flex-col rounded-2xl border border-stone-700 overflow-hidden"
          style={{
            width: `min(${drawerWidth}px, calc(100vw - 2rem))`,
            height: 'min(680px, calc(100vh - 2rem))',
          }}
        >
          {/* Left-edge resize handle */}
          <div
            onMouseDown={startDrawerResize}
            className="absolute left-0 top-0 bottom-0 w-1.5 z-[60] cursor-ew-resize hover:bg-brand-400/30 active:bg-brand-400/50 transition-colors rounded-l-2xl"
            title="Drag to resize"
          />

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-stone-700 dark:border-stone-700 bg-brand-600">
            <div className="flex items-center gap-2">
              {drawerView !== 'chat' ? (
                <button
                  onClick={() => setDrawerView('chat')}
                  className="text-white/80 hover:text-white transition-colors p-0.5"
                  aria-label="Back to chat"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              ) : (
                <button
                  onClick={() => setCollapsed(true)}
                  className="text-white/80 hover:text-white transition-colors p-0.5"
                  aria-label="Collapse Remy"
                  title="Collapse sidebar"
                >
                  <ChevronsRight className="h-5 w-5" />
                </button>
              )}
              <RemyAvatar size="sm" />
              <span className="font-semibold text-white">
                {drawerView === 'chat'
                  ? 'Remy'
                  : drawerView === 'list'
                    ? 'Conversations'
                    : drawerView === 'search'
                      ? 'Search'
                      : drawerView === 'actions'
                        ? 'Actions'
                        : 'Templates'}
              </span>
              {drawerView === 'chat' &&
                currentConvTitle &&
                currentConvTitle !== 'New conversation' && (
                  <span className="text-xs text-white/60 font-normal truncate max-w-[140px]">
                    {currentConvTitle}
                  </span>
                )}
            </div>
            <div className="flex items-center gap-1">
              {drawerView === 'chat' && (
                <>
                  <button
                    onClick={() => setSoundEnabled((prev) => !prev)}
                    className="text-white/80 hover:text-white transition-colors p-1"
                    title={soundEnabled ? 'Mute notifications' : 'Enable notifications'}
                    aria-label={soundEnabled ? 'Mute notifications' : 'Enable notifications'}
                  >
                    {soundEnabled ? (
                      <Volume2 className="h-4 w-4" />
                    ) : (
                      <VolumeX className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setShowVoiceSettings((prev) => !prev)}
                    className={`transition-colors p-1 ${showVoiceSettings ? 'text-white' : 'text-white/80 hover:text-white'}`}
                    title="Voice settings"
                    aria-label="Voice settings"
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                  {supportsVoice && (
                    <button
                      type="button"
                      onClick={toggleKitchenMode}
                      className={`transition-colors p-1 ${
                        kitchenMode
                          ? 'text-green-400 animate-pulse'
                          : 'text-white/80 hover:text-white'
                      }`}
                      title={
                        kitchenMode
                          ? 'Kitchen Mode on - say "Hey Remy"'
                          : 'Kitchen Mode (hands-free)'
                      }
                      aria-label={kitchenMode ? 'Disable Kitchen Mode' : 'Enable Kitchen Mode'}
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                  )}
                  {currentConversationId && (
                    <>
                      <button
                        onClick={handleExport}
                        className="text-white/80 hover:text-white transition-colors p-1"
                        title="Export conversation"
                        aria-label="Export conversation"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleSendToSupport}
                        className="text-white/80 hover:text-white transition-colors p-1"
                        title="Send to Support"
                        aria-label="Send to Support"
                      >
                        <Headphones className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleNewConversation()}
                    className="text-white/80 hover:text-white transition-colors p-1"
                    title="New conversation"
                    aria-label="New conversation"
                  >
                    <Plus className="h-4.5 w-4.5" />
                  </button>
                </>
              )}
              {/* View tabs - icon buttons for 5 views */}
              <div className="flex items-center gap-0.5 border-l border-white/20 ml-1 pl-1">
                {[
                  { view: 'chat' as const, icon: MessageSquare, title: 'Chat' },
                  { view: 'list' as const, icon: List, title: 'Conversations' },
                  { view: 'search' as const, icon: Search, title: 'Search' },
                  { view: 'actions' as const, icon: Activity, title: 'Action Log' },
                  { view: 'templates' as const, icon: BookTemplate, title: 'Templates' },
                ].map(({ view, icon: Icon, title }) => (
                  <button
                    key={view}
                    onClick={() => {
                      setDrawerView(view)
                      setShowCapabilities(false)
                    }}
                    className={`p-1 rounded transition-colors ${
                      drawerView === view && !showCapabilities
                        ? 'text-white bg-white/20'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                    title={title}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ))}
                <button
                  onClick={() => setShowCapabilities(!showCapabilities)}
                  className={`p-1 rounded transition-colors ${showCapabilities ? 'text-white bg-white/20' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                  title="What can Remy do?"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                onClick={closeDrawer}
                className="text-white/80 hover:text-white transition-colors p-1"
                aria-label="Close Remy (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Voice settings panel */}
          {showVoiceSettings && (
            <div className="border-b border-stone-700 dark:border-stone-700 bg-stone-800 dark:bg-stone-800/50 px-4 py-3 space-y-3 max-h-[320px] overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-300 uppercase tracking-wide">
                  Voice Settings
                </span>
                <button
                  onClick={() => {
                    setVoiceSettings(DEFAULT_VOICE_SETTINGS)
                    saveVoiceSettings(DEFAULT_VOICE_SETTINGS)
                  }}
                  className="text-xs text-stone-400 hover:text-stone-400 dark:hover:text-stone-300 transition-colors"
                >
                  Reset
                </button>
              </div>

              {/* Voice selector */}
              <div>
                <label className="block text-xs font-medium text-stone-300 dark:text-stone-300 mb-1">
                  Voice
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={voiceSettings.voiceURI ?? ''}
                    onChange={(e) => updateVoiceSetting('voiceURI', e.target.value || null)}
                    title="Select voice"
                    className="flex-1 text-xs rounded-md border border-stone-600 dark:border-stone-600 bg-stone-900 dark:bg-stone-700 px-2 py-1.5 text-stone-200 dark:text-stone-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="">System default</option>
                    {availableVoices
                      .filter((v) => v.lang.startsWith('en'))
                      .map((v) => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} {v.localService ? '' : '(network)'}
                        </option>
                      ))}
                    {availableVoices.filter((v) => !v.lang.startsWith('en')).length > 0 && (
                      <optgroup label="Other languages">
                        {availableVoices
                          .filter((v) => !v.lang.startsWith('en'))
                          .map((v) => (
                            <option key={v.voiceURI} value={v.voiceURI}>
                              {v.name} ({v.lang})
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={() => handlePreviewVoice(voiceSettings.voiceURI)}
                    className="text-xs bg-brand-950 dark:bg-brand-900/30 text-brand-400 dark:text-brand-300 rounded-md px-2.5 py-1.5 hover:bg-brand-900 dark:hover:bg-brand-900/50 transition-colors whitespace-nowrap"
                  >
                    Preview
                  </button>
                </div>
              </div>

              {/* Speed slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-stone-300 dark:text-stone-300">
                    Speed
                  </label>
                  <span className="text-xs text-stone-300 tabular-nums">
                    {voiceSettings.rate.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={voiceSettings.rate}
                  onChange={(e) => updateVoiceSetting('rate', parseFloat(e.target.value))}
                  title="Speech speed"
                  className="w-full h-1.5 bg-stone-700 dark:bg-stone-600 rounded-full appearance-none cursor-pointer accent-brand-600"
                />
                <div className="flex justify-between text-xxs text-stone-300 mt-0.5">
                  <span>Slow</span>
                  <span>Normal</span>
                  <span>Fast</span>
                </div>
              </div>

              {/* Pitch slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-stone-300 dark:text-stone-300">
                    Pitch
                  </label>
                  <span className="text-xs text-stone-300 tabular-nums">
                    {voiceSettings.pitch.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={voiceSettings.pitch}
                  onChange={(e) => updateVoiceSetting('pitch', parseFloat(e.target.value))}
                  title="Speech pitch"
                  className="w-full h-1.5 bg-stone-700 dark:bg-stone-600 rounded-full appearance-none cursor-pointer accent-brand-600"
                />
                <div className="flex justify-between text-xxs text-stone-300 mt-0.5">
                  <span>Lower</span>
                  <span>Normal</span>
                  <span>Higher</span>
                </div>
              </div>

              {/* Volume slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-stone-300 dark:text-stone-300">
                    Volume
                  </label>
                  <span className="text-xs text-stone-300 tabular-nums">
                    {Math.round(voiceSettings.volume * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={voiceSettings.volume}
                  onChange={(e) => updateVoiceSetting('volume', parseFloat(e.target.value))}
                  title="Speech volume"
                  className="w-full h-1.5 bg-stone-700 dark:bg-stone-600 rounded-full appearance-none cursor-pointer accent-brand-600"
                />
                <div className="flex justify-between text-xxs text-stone-300 mt-0.5">
                  <span>Quiet</span>
                  <span>Full</span>
                </div>
              </div>

              {/* Auto-read toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-stone-700">
                <div>
                  <label className="text-xs font-medium text-stone-300">Auto-read responses</label>
                  <p className="text-xxs text-stone-400 mt-0.5">
                    Speak every new Remy response automatically
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateVoiceSetting('autoRead', !voiceSettings.autoRead)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    voiceSettings.autoRead ? 'bg-brand-600' : 'bg-stone-600'
                  }`}
                  role="switch"
                  aria-checked={voiceSettings.autoRead ? 'true' : 'false'}
                  title="Toggle auto-read responses"
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      voiceSettings.autoRead ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Capabilities info panel */}
          {showCapabilities ? (
            <div className="flex-1 overflow-hidden">
              <RemyCapabilitiesPanel onClose={() => setShowCapabilities(false)} />
            </div>
          ) : drawerView === 'list' ? (
            <div className="flex-1 overflow-hidden">
              <RemyConversationList
                currentConversationId={currentConversationId}
                onSelectConversation={(id) => {
                  handleSelectConversation(id)
                  setDrawerView('chat')
                }}
                onNewConversation={() => {
                  handleNewConversation()
                  setDrawerView('chat')
                }}
              />
            </div>
          ) : drawerView === 'search' ? (
            <div className="flex-1 overflow-hidden">
              <RemySearchView
                onSelectConversation={(id) => {
                  handleSelectConversation(id)
                  setDrawerView('chat')
                }}
              />
            </div>
          ) : drawerView === 'actions' ? (
            <div className="flex-1 overflow-hidden">
              <RemyActionLog
                onSelectConversation={(id) => {
                  handleSelectConversation(id)
                  setDrawerView('chat')
                }}
              />
            </div>
          ) : drawerView === 'templates' ? (
            <div className="flex-1 overflow-hidden">
              <RemyTemplatesView
                onRunTemplate={async (prompt, projectId) => {
                  await handleNewConversation(projectId)
                  handleSend(prompt)
                }}
              />
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Kitchen Mode indicator */}
                {kitchenMode && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-200">
                    <Mic
                      className={`h-3.5 w-3.5 shrink-0 ${isCapturing ? 'text-green-400 animate-pulse' : 'text-green-500/60'}`}
                    />
                    <span>
                      {isCapturing ? (
                        <>
                          <strong>Listening...</strong> speak your question
                        </>
                      ) : (
                        <>
                          <strong>Kitchen Mode</strong> - say &quot;Hey Remy&quot; to ask a question
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={kitchenModeHook.stopKitchenMode}
                      className="ml-auto text-green-400 hover:text-green-300 text-xs"
                      title="Stop Kitchen Mode"
                    >
                      Stop
                    </button>
                  </div>
                )}

                {/* Limited mode banner when Ollama is offline */}
                {!ollamaOnline && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                    <VolumeX className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <span>
                      <strong>Limited mode</strong> - Ollama is offline. I can still answer common
                      questions instantly, but complex queries need Ollama running.
                    </span>
                  </div>
                )}

                {/* Auto-project suggestion banner */}
                {projectSuggestion && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500/10 border border-brand-500/20 text-sm">
                    <span className="text-base">{projectSuggestion.icon}</span>
                    <span className="flex-1 text-gray-200">
                      Move to <strong>{projectSuggestion.name}</strong>?
                    </span>
                    <button
                      type="button"
                      onClick={handleAcceptProjectSuggestion}
                      className="px-2 py-0.5 text-xs bg-brand-500 text-white rounded hover:bg-brand-600 transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setProjectSuggestion(null)}
                      className="px-2 py-0.5 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Welcome message */}
                {messages.length === 0 && !streamingContent && (
                  <div className="space-y-4">
                    <div className="bg-stone-800 dark:bg-stone-800 rounded-xl p-4">
                      <p className="text-sm text-stone-300 dark:text-stone-300">
                        Hey chef! I&apos;m <span className="font-semibold">Remy</span>, your kitchen
                        companion. I can check your schedule, look up clients, draft messages,
                        crunch numbers, <strong>search the web</strong> - whatever you need.
                      </p>
                      <p className="text-xs text-stone-300 mt-2 flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        Web search enabled. Press{' '}
                        <kbd className="bg-stone-700 dark:bg-stone-700 rounded px-1 py-0.5 text-xxs font-mono">
                          Ctrl+J
                        </kbd>{' '}
                        anytime.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {starters.map((starter) => {
                        const Icon = starter.icon
                        return (
                          <button
                            key={starter.text}
                            onClick={() => handleSend(starter.text)}
                            className="flex items-center gap-2 text-left text-sm bg-stone-900 dark:bg-stone-800 border border-stone-700 dark:border-stone-700 rounded-lg px-3 py-2.5 hover:bg-stone-800 dark:hover:bg-stone-700 transition-colors text-stone-300 dark:text-stone-300"
                          >
                            <Icon className="h-4 w-4 text-brand-600 flex-shrink-0" />
                            {starter.text}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Message list */}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`group flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] space-y-2 relative`}>
                      {/* Action buttons on hover */}
                      <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 z-10 transition-all">
                        {msg.role === 'remy' && (
                          <>
                            <button
                              onClick={() => handleSpeak(msg.id, msg.content)}
                              className={`bg-stone-900 dark:bg-stone-700 rounded-full p-1 shadow-sm border border-stone-700 dark:border-stone-600 transition-colors ${
                                speakingId === msg.id
                                  ? 'text-brand-600 dark:text-brand-400'
                                  : 'text-stone-400 hover:text-brand-600'
                              }`}
                              title={speakingId === msg.id ? 'Stop listening' : 'Listen'}
                            >
                              {speakingId === msg.id ? (
                                <Square className="h-3 w-3" />
                              ) : (
                                <Volume2 className="h-3 w-3" />
                              )}
                            </button>
                            <button
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="bg-stone-900 dark:bg-stone-700 rounded-full p-1 shadow-sm border border-stone-700 dark:border-stone-600 text-stone-400 hover:text-brand-600 transition-colors"
                              title="Copy message"
                            >
                              {copiedId === msg.id ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleToggleBookmark(msg.id)}
                          className={`bg-stone-900 dark:bg-stone-700 rounded-full p-1 shadow-sm border border-stone-700 dark:border-stone-600 transition-colors ${
                            msg.bookmarked
                              ? 'text-amber-400'
                              : 'text-stone-400 hover:text-amber-400'
                          }`}
                          title={msg.bookmarked ? 'Remove bookmark' : 'Bookmark'}
                        >
                          <Bookmark className={`h-3 w-3 ${msg.bookmarked ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="bg-stone-900 dark:bg-stone-700 rounded-full p-1 shadow-sm border border-stone-700 dark:border-stone-600 text-stone-400 hover:text-red-500 transition-colors"
                          title="Remove message"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Message bubble */}
                      <div
                        className={`rounded-xl px-4 py-2.5 text-sm ${
                          msg.role === 'user'
                            ? 'bg-brand-600 text-white'
                            : 'bg-stone-800 dark:bg-stone-800 text-stone-100 dark:text-stone-100'
                        }`}
                      >
                        {msg.role === 'user' ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <div className="prose prose-sm prose-stone dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={markdownComponents as any}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>

                      {/* Retry button for timeout/error messages */}
                      {msg.role === 'remy' && msg.isRetryable && msg.retryMessage && (
                        <button
                          type="button"
                          onClick={() => handleSend(msg.retryMessage)}
                          className="flex items-center gap-1.5 text-xs bg-brand-600 hover:bg-brand-500 text-white rounded-full px-3 py-1.5 transition-colors"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Retry
                        </button>
                      )}

                      {/* Task result cards */}
                      {msg.role === 'remy' && msg.tasks && msg.tasks.length > 0 && (
                        <div className="space-y-2">
                          {msg.tasks.map((task) => (
                            <RemyTaskCard
                              key={task.taskId}
                              task={task}
                              onApprove={handleApproveTask}
                              onReject={handleRejectTask}
                            />
                          ))}
                        </div>
                      )}

                      {/* Navigation suggestions */}
                      {msg.role === 'remy' &&
                        msg.navSuggestions &&
                        msg.navSuggestions.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {msg.navSuggestions.map((nav) => (
                              <Link
                                key={nav.href}
                                href={nav.href}
                                onClick={closeDrawer}
                                className="inline-flex items-center gap-1 text-xs bg-brand-950 dark:bg-brand-900/30 text-brand-400 dark:text-brand-300 rounded-full px-3 py-1 hover:bg-brand-900 dark:hover:bg-brand-900/50 transition-colors"
                              >
                                <ArrowRight className="h-3 w-3" />
                                {nav.label}
                              </Link>
                            ))}
                          </div>
                        )}

                      {/* Memory items with delete buttons */}
                      {msg.role === 'remy' && msg.memoryItems && msg.memoryItems.length > 0 && (
                        <div className="mt-2 space-y-1 max-h-80 overflow-y-auto">
                          {(() => {
                            const grouped = new Map<string, RemyMemoryItem[]>()
                            for (const item of msg.memoryItems) {
                              const cat = item.category
                              if (!grouped.has(cat)) grouped.set(cat, [])
                              grouped.get(cat)!.push(item)
                            }
                            return Array.from(grouped.entries()).map(([category, items]) => (
                              <div key={category} className="mb-2">
                                <p className="text-xs font-semibold text-stone-500 dark:text-stone-300 uppercase tracking-wide mb-1 px-1">
                                  {category.replace(/_/g, ' ')}
                                </p>
                                {items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="group/mem flex items-start gap-1.5 rounded-lg px-2 py-1.5 hover:bg-stone-800 dark:hover:bg-stone-700/50 transition-colors"
                                  >
                                    <span className="flex-1 text-xs text-stone-300 dark:text-stone-300 leading-relaxed">
                                      {item.content}
                                      {item.importance >= 8 && (
                                        <span
                                          className="ml-1 text-amber-500"
                                          title="High importance"
                                        >
                                          !
                                        </span>
                                      )}
                                      {!item.editable && (
                                        <span
                                          className="ml-2 inline-flex rounded-full border border-stone-600 px-1.5 py-0.5 text-xxs uppercase tracking-wide text-stone-400"
                                          title="Managed in memory/runtime/remy.json"
                                        >
                                          VS Code
                                        </span>
                                      )}
                                    </span>
                                    {item.editable !== false && (
                                      <button
                                        onClick={() => handleDeleteMemory(item.id)}
                                        className="opacity-0 group-hover/mem:opacity-100 flex-shrink-0 mt-0.5 text-stone-400 hover:text-red-500 transition-all p-0.5"
                                        title="Delete this memory"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ))
                          })()}
                        </div>
                      )}

                      {/* Thumbs up/down feedback */}
                      {msg.role === 'remy' && !msg.isRetryable && msg.content.length > 10 && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, 'up')}
                            className={`rounded-full p-1 transition-colors ${
                              msg.feedback === 'up'
                                ? 'text-green-400'
                                : 'text-stone-500 hover:text-green-400'
                            }`}
                            title="Good response"
                          >
                            <ThumbsUp
                              className={`h-3 w-3 ${msg.feedback === 'up' ? 'fill-current' : ''}`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, 'down')}
                            className={`rounded-full p-1 transition-colors ${
                              msg.feedback === 'down'
                                ? 'text-red-400'
                                : 'text-stone-500 hover:text-red-400'
                            }`}
                            title="Bad response"
                          >
                            <ThumbsDown
                              className={`h-3 w-3 ${msg.feedback === 'down' ? 'fill-current' : ''}`}
                            />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Curated onboarding quick-reply chips */}
                {curatedQuickReplies.length > 0 &&
                  lastCuratedMsgId !== null &&
                  messages[messages.length - 1]?.id === lastCuratedMsgId &&
                  !loading && (
                    <div className="flex flex-wrap gap-2 mt-2 ml-10">
                      {curatedQuickReplies.map((label) => (
                        <button
                          key={label}
                          onClick={() => handleQuickReply(label)}
                          className="text-sm bg-stone-800 border border-stone-600 rounded-full px-3 py-1.5 hover:bg-stone-700 hover:border-stone-500 transition-colors text-stone-200"
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                {/* New-user quick action starters */}
                {messages.length === 1 &&
                  messages[0]?.role === 'remy' &&
                  messages[0]?.id.startsWith('remy-welcome') &&
                  !loading && (
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      {NEW_USER_STARTERS.map((s) => (
                        <button
                          key={s.label}
                          onClick={() => handleSend(s.message)}
                          className="flex items-center gap-2 text-left text-sm bg-stone-900 dark:bg-stone-800 border border-stone-700 dark:border-stone-700 rounded-lg px-3 py-2.5 hover:bg-stone-800 dark:hover:bg-stone-700 transition-colors text-stone-300 dark:text-stone-300"
                        >
                          <ArrowRight className="h-4 w-4 text-brand-600 flex-shrink-0" />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}

                {/* Streaming indicator */}
                {loading && streamingContent && (
                  <div className="flex justify-start gap-2 items-end">
                    <RemyAvatar size="sm" />
                    <div className="max-w-[80%] space-y-1">
                      <div className="bg-stone-800 dark:bg-stone-800 rounded-xl px-4 py-2.5 text-sm text-stone-100 dark:text-stone-100">
                        <div className="prose prose-sm prose-stone dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents as any}
                          >
                            {streamingContent}
                          </ReactMarkdown>
                        </div>
                        <span className="inline-block w-1.5 h-4 bg-brand-600 animate-pulse ml-0.5 align-text-bottom" />
                      </div>
                      <button
                        onClick={handleCancel}
                        className="text-xs text-red-500 hover:text-red-700 underline transition-colors ml-1"
                      >
                        Stop generating
                      </button>
                    </div>
                  </div>
                )}

                {/* Loading indicator (before streaming starts) */}
                {loading && !streamingContent && (
                  <div className="flex justify-start">
                    <div className="bg-stone-800 dark:bg-stone-800 rounded-xl px-4 py-3 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                      <span className="text-xs text-stone-500">
                        {getThinkingMessage(elapsedSec, streamingIntent)}
                        {elapsedSec > 0 ? ` ${elapsedSec}s` : ''}
                      </span>
                      <button
                        onClick={handleCancel}
                        className="ml-2 text-xs text-red-500 hover:text-red-700 underline transition-colors"
                        title="Cancel request"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-stone-700 dark:border-stone-700">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      data-remy-input=""
                      value={input}
                      onChange={(e) => {
                        if (e.target.value.length <= 2000) setInput(e.target.value)
                      }}
                      maxLength={2000}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSendWithImage()
                        }
                      }}
                      placeholder="Ask Remy anything..."
                      aria-label="Message Remy"
                      className="w-full resize-none rounded-lg border border-stone-600 dark:border-stone-600 px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-stone-800 dark:text-stone-100 min-h-[40px] max-h-32"
                      rows={1}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute right-2 bottom-2 text-stone-400 hover:text-stone-400 dark:hover:text-stone-300 transition-colors"
                      title="Attach file (.txt, .md, .csv, .json, images)"
                      aria-label="Attach file"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                  </div>
                  {supportsVoice && (
                    <button
                      onClick={toggleVoiceInput}
                      className={`flex items-center justify-center rounded-lg p-2 transition-colors ${
                        isListening
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-stone-800 dark:bg-stone-700 text-stone-500 hover:text-brand-600 hover:bg-stone-700 dark:hover:bg-stone-600'
                      }`}
                      title={isListening ? 'Stop listening' : 'Voice input'}
                      aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </button>
                  )}
                  <Button
                    onClick={() => handleSendWithImage()}
                    disabled={!input.trim() || loading}
                    variant="primary"
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="space-y-0.5">
                    <p className="text-xs text-stone-300 flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      Remy can make mistakes. Please double-check important info.
                    </p>
                    <p className="text-xxs text-stone-500 italic">
                      AI features use secure cloud processing.
                    </p>
                  </div>
                  <span
                    className={`text-xxs tabular-nums ${input.length >= 1800 ? (input.length >= 2000 ? 'text-red-500 font-medium' : 'text-amber-500') : 'text-stone-400'}`}
                  >
                    {input.length}/2000
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}
