'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { RemyMascotButton } from '@/components/ai/remy-mascot-button'
import { RemyTalkingAvatar } from '@/components/ai/remy-talking-avatar'
import { useRemyLipSync } from '@/lib/ai/use-remy-lip-sync'
import {
  Bot,
  X,
  Send,
  Loader2,
  ArrowRight,
  CalendarDays,
  TrendingUp,
  Mail,
  Users,
  AlertCircle,
  History,
  Plus,
  MessageSquare,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Trash2,
  Brain,
  Copy,
  Check,
  Download,
  Globe,
  Paperclip,
  Search,
  Volume2,
  VolumeX,
  Square,
  ChefHat,
  Mic,
  MicOff,
  Settings2,
  Info,
  Headphones,
  Activity,
  BookTemplate,
  List,
  Bookmark,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RemyTaskCard } from '@/components/ai/remy-task-card'
import { RemyCapabilitiesPanel } from '@/components/ai/remy-capabilities-panel'
import { RemyConversationList } from '@/components/ai/remy-conversation-list'
import { RemySearchView } from '@/components/ai/remy-search-view'
import { RemyActionLog } from '@/components/ai/remy-action-log'
import { RemyTemplatesView } from '@/components/ai/remy-templates-view'
import { approveTask } from '@/lib/ai/command-orchestrator'
import { saveRemyMessage, saveRemyTaskResult } from '@/lib/ai/remy-artifact-actions'
import {
  createConversation as createLocalConversation,
  getConversations as listLocalConversations,
  getMessages as loadLocalMessages,
  addMessage as saveLocalMessage,
  updateConversation as updateLocalConversation,
  deleteConversation as deleteLocalConversation,
  exportConversation as exportLocalConversation,
  pruneOldConversations,
  trimConversationMessages,
  logAction,
  autoSuggestProject,
  autoTitle,
  createProject,
  getProjects,
  moveConversation,
  toggleBookmark,
} from '@/lib/ai/remy-local-storage'
import type { LocalConversation } from '@/lib/ai/remy-local-storage'
import {
  extractAndSaveMemories,
  deleteRemyMemory,
  decayStaleMemories,
} from '@/lib/ai/remy-memory-actions'
import { shareConversationWithSupport } from '@/lib/ai/support-share-action'
import { toast } from 'sonner'
import type {
  RemyMessage,
  RemyMemoryItem,
  RemyTaskResult,
  NavigationSuggestion,
} from '@/lib/ai/remy-types'
import {
  REMY_WELCOME_MESSAGE,
  NEW_USER_STARTERS,
  REMY_WELCOME_SHOWN_KEY,
} from '@/lib/ai/remy-welcome'
// RemyConversation type mapped from LocalConversation for UI compatibility
type RemyConversation = {
  id: string
  title: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastMessage?: string
}

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

// ─── Context-Aware Starter Prompts ────────────────────────────────────────────

function getStartersForPage(pathname: string) {
  const starters = [
    { text: "What's on my plate this week?", icon: CalendarDays },
    { text: "How's business looking this month?", icon: TrendingUp },
    { text: 'Draft a follow-up for my last event', icon: Mail },
    { text: 'Show my memories', icon: Brain },
  ]

  if (pathname.startsWith('/events/') && pathname !== '/events/new') {
    return [
      { text: 'Tell me about this event', icon: CalendarDays },
      { text: 'Draft a follow-up email for this client', icon: Mail },
      { text: 'What should I prep for this event?', icon: ChefHat },
      { text: 'Search the web for menu inspiration', icon: Globe },
    ]
  }
  if (pathname === '/events' || pathname === '/events/upcoming') {
    return [
      { text: "What's on my plate this week?", icon: CalendarDays },
      { text: 'Show my upcoming events', icon: CalendarDays },
      { text: 'Find my next available date', icon: Search },
      { text: 'Search for trending catering ideas online', icon: Globe },
    ]
  }
  if (pathname.startsWith('/clients')) {
    return [
      { text: 'Show my recent clients', icon: Users },
      { text: 'Draft a follow-up for my last client', icon: Mail },
      { text: 'What do you remember about my clients?', icon: Brain },
      { text: 'Search online for client engagement tips', icon: Globe },
    ]
  }
  if (pathname.startsWith('/financials') || pathname.startsWith('/expenses')) {
    return [
      { text: "How's revenue this month?", icon: TrendingUp },
      { text: 'Give me a monthly financial snapshot', icon: TrendingUp },
      { text: 'Search for private chef pricing benchmarks', icon: Globe },
      { text: 'Show my memories about pricing', icon: Brain },
    ]
  }
  if (pathname.startsWith('/recipes') || pathname.startsWith('/menus')) {
    return [
      { text: 'Search my recipes', icon: Search },
      { text: 'List my menus', icon: ChefHat },
      { text: 'Search the web for seasonal menu ideas', icon: Globe },
      { text: 'What culinary notes do you remember?', icon: Brain },
    ]
  }
  if (pathname.startsWith('/inquiries')) {
    return [
      { text: 'Show my open inquiries', icon: Mail },
      { text: 'Check my availability this week', icon: CalendarDays },
      { text: 'Draft a response to the latest inquiry', icon: Mail },
      { text: 'Search online for inquiry response templates', icon: Globe },
    ]
  }

  return starters
}

// ─── Thinking Time Estimate ───────────────────────────────────────────────────

function getThinkingMessage(elapsed: number, intent?: string): string {
  if (intent === 'command') {
    if (elapsed > 10) return "Running your tasks — this one's taking a bit..."
    return 'Running your tasks...'
  }
  if (intent === 'mixed') {
    if (elapsed > 15) return 'Working on both parts — hang tight, almost there...'
    return 'Working on your question and tasks...'
  }
  // Default question intent
  if (elapsed > 20) return 'Still thinking — complex question, give me another moment...'
  if (elapsed > 10) return 'Thinking hard on this one...'
  if (elapsed > 5) return 'Remy is thinking...'
  return 'Remy is thinking...'
}

// ─── Markdown Components ──────────────────────────────────────────────────────

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li className="text-sm">{children}</li>,
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code className="block bg-stone-700 dark:bg-stone-700 rounded px-2 py-1 text-xs font-mono my-1 overflow-x-auto">
          {children}
        </code>
      )
    }
    return (
      <code className="bg-stone-700 dark:bg-stone-700 rounded px-1 py-0.5 text-xs font-mono">
        {children}
      </code>
    )
  },
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-600 dark:text-brand-400 underline hover:text-brand-400"
    >
      {children}
    </a>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-base font-bold mb-1">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-sm font-bold mb-1">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-semibold mb-1">{children}</h3>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-brand-400 pl-2 italic text-stone-400 dark:text-stone-400 my-1">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-stone-600 dark:border-stone-600 my-2" />,
}

// ─── Voice Settings ──────────────────────────────────────────────────────────

interface VoiceSettings {
  voiceURI: string | null
  rate: number
  pitch: number
  volume: number
}

const VOICE_SETTINGS_KEY = 'remy-voice-settings'
const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voiceURI: null,
  rate: 1,
  pitch: 1,
  volume: 1,
}

function loadVoiceSettings(): VoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_VOICE_SETTINGS
  try {
    const raw = localStorage.getItem(VOICE_SETTINGS_KEY)
    if (!raw) return DEFAULT_VOICE_SETTINGS
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_VOICE_SETTINGS, ...parsed }
  } catch {
    return DEFAULT_VOICE_SETTINGS
  }
}

function saveVoiceSettings(settings: VoiceSettings) {
  try {
    localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // localStorage full or unavailable
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

const DRAWER_MIN_WIDTH = 320
const DRAWER_MAX_WIDTH = 800
const DRAWER_DEFAULT_WIDTH = 448 // max-w-md equivalent

export function RemyDrawer() {
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [messages, setMessages] = useState<RemyMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingIntent, setStreamingIntent] = useState<string | undefined>()
  const [elapsedSec, setElapsedSec] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const [showVoiceSettings, setShowVoiceSettings] = useState(false)
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(loadVoiceSettings)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
  const [drawerWidth, setDrawerWidth] = useState(DRAWER_DEFAULT_WIDTH)
  const drawerResizingRef = useRef<{ startX: number; startW: number } | null>(null)
  const drawerDragCleanupRef = useRef<(() => void) | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  // Lip-sync engine — drives Remy's mouth animation during streaming
  const lipSync = useRemyLipSync()

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

  // Cleanup drag listeners on unmount (prevents leak if component unmounts mid-drag)
  useEffect(() => {
    return () => {
      drawerDragCleanupRef.current?.()
    }
  }, [])

  // Drag-to-resize the drawer from the left edge
  const startDrawerResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      drawerResizingRef.current = { startX: e.clientX, startW: drawerWidth }
      let latestW = drawerWidth

      const onMouseMove = (ev: MouseEvent) => {
        if (!drawerResizingRef.current) return
        const { startX, startW } = drawerResizingRef.current
        // Dragging left = wider, dragging right = narrower (drawer is on right side)
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

  // Conversation threading state
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<RemyConversation[]>([])
  const [drawerView, setDrawerView] = useState<
    'chat' | 'list' | 'search' | 'actions' | 'templates'
  >('chat')
  const [showCapabilities, setShowCapabilities] = useState(false)
  const [conversationsLoaded, setConversationsLoaded] = useState(false)
  const [isFirstExchange, setIsFirstExchange] = useState(true)
  const [hasDecayedThisSession, setHasDecayedThisSession] = useState(false)
  const [projectSuggestion, setProjectSuggestion] = useState<{
    name: string
    icon: string
  } | null>(null)

  // Context-aware starters
  const starters = useMemo(() => getStartersForPage(pathname ?? '/dashboard'), [pathname])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  // Auto-focus textarea when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }, [open])

  // Elapsed timer while loading
  useEffect(() => {
    if (!loading) {
      setElapsedSec(0)
      return
    }
    const interval = setInterval(() => setElapsedSec((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [loading])

  // Keyboard shortcut: Ctrl+K / Cmd+K to toggle Remy
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  // Load available TTS voices (they load async in some browsers)
  useEffect(() => {
    function loadVoices() {
      const voices = speechSynthesis.getVoices()
      if (voices.length > 0) setAvailableVoices(voices)
    }
    loadVoices()
    speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices)
  }, [])

  // Listen for custom 'open-remy' event so nav buttons can open the drawer
  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('open-remy', handler)
    return () => window.removeEventListener('open-remy', handler)
  }, [])

  // Abort in-flight Ollama request when drawer closes
  useEffect(() => {
    if (!open && abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setLoading(false)
      setStreamingContent('')
      setStreamingIntent(undefined)
    }
  }, [open])

  // Memory decay — run once per session when drawer first opens
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
  }, [open, conversationsLoaded])

  const loadConversationList = useCallback(async () => {
    try {
      const localConvs = await listLocalConversations()
      const mapped: RemyConversation[] = localConvs.map((c) => ({
        id: c.id,
        title: c.title,
        isActive: true,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }))
      setConversations(mapped)
      setConversationsLoaded(true)

      if (mapped.length > 0 && !currentConversationId) {
        const latest = mapped[0]
        setCurrentConversationId(latest.id)
        const localMsgs = await loadLocalMessages(latest.id)
        const remyMsgs: RemyMessage[] = localMsgs.map((m) => ({
          id: m.id,
          role: m.role === 'remy' ? 'remy' : 'user',
          content: m.content,
          timestamp: m.createdAt,
          bookmarked: m.bookmarked,
          tasks: m.tasks as RemyTaskResult[] | undefined,
          navSuggestions: m.navSuggestions as NavigationSuggestion[] | undefined,
        }))
        setMessages(remyMsgs)
        setIsFirstExchange(remyMsgs.length === 0)
      } else if (mapped.length === 0) {
        // Brand new user — inject Remy welcome message (once per device)
        const welcomeShown =
          typeof window !== 'undefined' && localStorage.getItem(REMY_WELCOME_SHOWN_KEY)
        if (!welcomeShown) {
          const welcomeMsg: RemyMessage = {
            id: `remy-welcome-${Date.now()}`,
            role: 'remy',
            content: REMY_WELCOME_MESSAGE,
            timestamp: new Date().toISOString(),
          }
          setMessages([welcomeMsg])
          setIsFirstExchange(false)
          if (typeof window !== 'undefined') {
            localStorage.setItem(REMY_WELCOME_SHOWN_KEY, '1')
          }
        }
      }
    } catch (err) {
      console.error('[remy] Failed to load conversations:', err)
    }
  }, [currentConversationId])

  const handleSelectConversation = useCallback(async (convId: string) => {
    try {
      const localMsgs = await loadLocalMessages(convId)
      const remyMsgs: RemyMessage[] = localMsgs.map((m) => ({
        id: m.id,
        role: m.role === 'remy' ? 'remy' : 'user',
        content: m.content,
        timestamp: m.createdAt,
        bookmarked: m.bookmarked,
        tasks: m.tasks as RemyTaskResult[] | undefined,
        navSuggestions: m.navSuggestions as NavigationSuggestion[] | undefined,
      }))
      setMessages(remyMsgs)
      setCurrentConversationId(convId)
      setDrawerView('chat')
      setIsFirstExchange(remyMsgs.length === 0)
      setProjectSuggestion(null)
    } catch (err) {
      console.error('[remy] Failed to load conversation:', err)
      toast.error('Failed to load conversation')
    }
  }, [])

  const handleNewConversation = useCallback(async () => {
    try {
      const conv = await createLocalConversation()
      setCurrentConversationId(conv.id)
      setMessages([])
      setDrawerView('chat')
      setIsFirstExchange(true)
      setProjectSuggestion(null)
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
      // Auto-prune old conversations (non-blocking)
      pruneOldConversations().catch(() => {})
    } catch (err) {
      console.error('[remy] Failed to create conversation:', err)
      toast.error('Failed to start new conversation')
    }
  }, [])

  const handleDeleteConversation = useCallback(
    async (convId: string) => {
      try {
        await deleteLocalConversation(convId)
        setConversations((prev) => prev.filter((c) => c.id !== convId))
        if (currentConversationId === convId) {
          setCurrentConversationId(null)
          setMessages([])
          setIsFirstExchange(true)
        }
        toast.success('Conversation deleted')
      } catch (err) {
        console.error('[remy] Failed to delete conversation:', err)
        toast.error('Failed to delete conversation')
      }
    },
    [currentConversationId]
  )

  const handleAcceptProjectSuggestion = useCallback(async () => {
    if (!projectSuggestion || !currentConversationId) return
    try {
      // Find or create the project
      const existing = await getProjects()
      let project = existing.find((p) => p.name === projectSuggestion.name)
      if (!project) {
        project = await createProject(projectSuggestion.name, projectSuggestion.icon)
      }
      await moveConversation(currentConversationId, project.id)
      setProjectSuggestion(null)
      toast.success(`Moved to ${projectSuggestion.icon} ${projectSuggestion.name}`)
    } catch (err) {
      console.error('[remy] Failed to accept project suggestion:', err)
    }
  }, [projectSuggestion, currentConversationId])

  const handleDeleteMessage = useCallback(async (msgId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== msgId))
    // Messages live in IndexedDB — removing from local state is sufficient
    // (individual message deletion from IndexedDB store is a future enhancement)
    toast.success('Message removed')
  }, [])

  const handleDeleteMemory = useCallback(async (memoryId: string) => {
    try {
      await deleteRemyMemory(memoryId)
      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg.memoryItems) return msg
          return {
            ...msg,
            memoryItems: msg.memoryItems.filter((m) => m.id !== memoryId),
          }
        })
      )
      toast.success('Memory deleted')
    } catch (err) {
      console.error('[remy] Failed to delete memory:', err)
      toast.error('Failed to delete memory')
    }
  }, [])

  const handleCopy = useCallback((msgId: string, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(msgId)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopiedId(null), 2000)
    })
  }, [])

  const handleToggleBookmark = useCallback(async (msgId: string) => {
    try {
      const newState = await toggleBookmark(msgId)
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, bookmarked: newState } : m)))
      toast.success(newState ? 'Bookmarked' : 'Bookmark removed')
    } catch (err) {
      console.error('[remy] Failed to toggle bookmark:', err)
    }
  }, [])

  const updateVoiceSetting = useCallback(
    <K extends keyof VoiceSettings>(key: K, value: VoiceSettings[K]) => {
      setVoiceSettings((prev) => {
        const next = { ...prev, [key]: value }
        saveVoiceSettings(next)
        return next
      })
    },
    []
  )

  const handlePreviewVoice = useCallback(
    (voiceURI: string | null) => {
      speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance('Hey chef, this is Remy.')
      utterance.rate = voiceSettings.rate
      utterance.pitch = voiceSettings.pitch
      utterance.volume = voiceSettings.volume
      if (voiceURI) {
        const voice = availableVoices.find((v) => v.voiceURI === voiceURI)
        if (voice) utterance.voice = voice
      }
      speechSynthesis.speak(utterance)
    },
    [availableVoices, voiceSettings.rate, voiceSettings.pitch, voiceSettings.volume]
  )

  const handleSpeak = useCallback(
    (msgId: string, content: string) => {
      // If already speaking this message, stop it
      if (speakingId === msgId) {
        speechSynthesis.cancel()
        setSpeakingId(null)
        return
      }
      // Stop any current speech first
      speechSynthesis.cancel()

      // Strip markdown formatting for cleaner speech
      const plainText = content
        .replace(/#{1,6}\s+/g, '') // headings
        .replace(/\*\*(.+?)\*\*/g, '$1') // bold
        .replace(/\*(.+?)\*/g, '$1') // italic
        .replace(/_(.+?)_/g, '$1') // italic underscores
        .replace(/`{1,3}[^`]*`{1,3}/g, '') // code
        .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
        .replace(/[-*+]\s+/g, '. ') // list items
        .replace(/\d+\.\s+/g, '. ') // numbered lists
        .replace(/>\s+/g, '') // blockquotes
        .replace(/---+/g, '') // horizontal rules
        .replace(/\n{2,}/g, '. ') // paragraph breaks
        .replace(/\n/g, ' ') // line breaks
        .trim()

      if (!plainText) return

      const utterance = new SpeechSynthesisUtterance(plainText)
      utterance.rate = voiceSettings.rate
      utterance.pitch = voiceSettings.pitch
      utterance.volume = voiceSettings.volume
      if (voiceSettings.voiceURI) {
        const voice = availableVoices.find((v) => v.voiceURI === voiceSettings.voiceURI)
        if (voice) utterance.voice = voice
      }
      utterance.onend = () => setSpeakingId(null)
      utterance.onerror = () => setSpeakingId(null)

      setSpeakingId(msgId)
      speechSynthesis.speak(utterance)
    },
    [speakingId, voiceSettings, availableVoices]
  )

  // Stop TTS when drawer closes
  useEffect(() => {
    if (!open && speakingId) {
      speechSynthesis.cancel()
      setSpeakingId(null)
    }
  }, [open, speakingId])

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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Block oversized files before reading into memory (prevents browser tab crash)
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
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
      setInput(
        (prev) =>
          `${prev ? prev + '\n\n' : ''}[Attached image: ${file.name} (${(file.size / 1024).toFixed(1)}KB) — describe what you need to know about this image]`
      )
      toast.success(`Attached ${file.name}`)
    } else {
      toast.error('Unsupported file type. Try text, markdown, CSV, JSON, or image files.')
    }

    e.target.value = ''
  }, [])

  // ─── Voice Input (Web Speech API) ──────────────────────────────────────────

  const supportsVoice =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const toggleVoiceInput = useCallback(() => {
    if (isListening) {
      // Stop listening
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    if (!supportsVoice) {
      toast.error('Voice input is not supported in this browser. Try Chrome or Edge.')
      return
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    let finalTranscript = ''

    recognition.onstart = () => {
      setIsListening(true)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interim += transcript
        }
      }
      // Show interim results in the input field
      setInput((prev) => {
        const base = prev.replace(/\[listening\.\.\.\].*$/i, '').trim()
        const current = finalTranscript + interim
        return base ? `${base} ${current}` : current
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error('[remy-voice] Speech recognition error:', event.error)
      setIsListening(false)
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Enable it in your browser settings.')
      } else if (event.error !== 'aborted') {
        toast.error('Voice input error. Try again.')
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      if (finalTranscript.trim()) {
        setInput((prev) => {
          const base = prev.replace(/\[listening\.\.\.\].*$/i, '').trim()
          return base ? `${base} ${finalTranscript.trim()}` : finalTranscript.trim()
        })
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isListening, supportsVoice])

  // Stop voice input when drawer closes
  useEffect(() => {
    if (!open && isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    }
  }, [open, isListening])

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

  // ─── Cancel In-Flight Request ────────────────────────────────────────────────

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setLoading(false)
    setStreamingContent('')
    setStreamingIntent(undefined)
    lipSync.reset()
    toast.success('Request cancelled')
  }, [lipSync])

  // ─── Streaming Send ─────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (text?: string) => {
      const message = (text ?? input).trim()
      if (!message || loading) return
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
          // Auto-prune old conversations (non-blocking)
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
      lipSync.reset()

      saveLocalMessage(convId, 'user', message).catch((err) =>
        console.error('[non-blocking] Save user msg failed', err)
      )

      try {
        // Create an AbortController so we can cancel the request
        const controller = new AbortController()
        abortControllerRef.current = controller

        // Hard client-side timeout: 2 min — generous for a big model, but
        // won't let a stuck request run forever. Cancel button is always available.
        const timeoutId = setTimeout(() => controller.abort(), 120_000)

        const response = await fetch('/api/remy/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            history: messages,
            currentPage: pathname,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) throw new Error(`HTTP ${response.status}`)

        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let fullContent = ''
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
                  setStreamingContent(fullContent)
                  lipSync.feedText(event.data as string)
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
        }
        setMessages((prev) => [...prev, remyMsg])
        setStreamingContent('')
        setStreamingIntent(undefined)
        lipSync.stopSpeaking()

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
              duration: 0, // timing not available from stream — logged as 0
            }).catch(() => {}) // non-blocking
          }
        }

        if (isFirstExchange) {
          setIsFirstExchange(false)
          // Derive title from first message using smart auto-title
          const title = autoTitle(message)
          updateLocalConversation(convId, { title })
            .then(() => {
              setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, title } : c)))
            })
            .catch((err) => console.error('[non-blocking] Auto-title failed', err))

          // Check if conversation should be suggested for a project
          const suggestion = autoSuggestProject(message)
          if (suggestion) {
            setProjectSuggestion(suggestion)
          }
        }

        autoSave(message, remyMsg)
      } catch (err: unknown) {
        lipSync.reset()
        // If the user cancelled or the timeout fired, don't show a scary error
        if (err instanceof DOMException && err.name === 'AbortError') {
          const cancelMsg: RemyMessage = {
            id: generateId(),
            role: 'remy',
            content: "Request was cancelled or timed out. Try again when you're ready.",
            timestamp: new Date().toISOString(),
          }
          setMessages((prev) => [...prev, cancelMsg])
          setStreamingContent('')
          setStreamingIntent(undefined)
        } else {
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
          }
          setMessages((prev) => [...prev, remyErrorMsg])
          setStreamingContent('')
          setStreamingIntent(undefined)
          if (!isOllamaOffline) toast.error(errMsg)
        }
      } finally {
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
      lipSync,
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
            setOpen(false)
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
    [router]
  )

  const handleRejectTask = useCallback((taskId: string) => {
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
  }, [])

  const currentConvTitle = conversations.find((c) => c.id === currentConversationId)?.title

  return (
    <>
      {/* Floating mascot trigger — hidden when drawer is open */}
      {!open && <RemyMascotButton onClick={() => setOpen(true)} ariaLabel="Open Remy (Ctrl+K)" />}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp"
        onChange={handleFileSelect}
        aria-label="Attach file to Remy"
      />

      {/* Collapsed sidebar strip */}
      {open && collapsed && (
        <div className="fixed top-0 right-0 bottom-0 z-50 w-12 bg-brand-600 shadow-2xl flex flex-col items-center py-3 gap-2 border-l border-brand-700">
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
            <span className="text-[10px] text-white/50 font-medium">{messages.length}</span>
          )}
          <div className="flex-1" />
          <button
            onClick={() => {
              setCollapsed(false)
              setOpen(false)
            }}
            className="text-white/40 hover:text-white transition-colors p-1.5"
            aria-label="Close Remy"
            title="Close Remy"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Drawer panel — no overlay, page remains interactive */}
      {open && !collapsed && (
        <div
          className="fixed top-0 right-0 bottom-0 z-50 bg-stone-900 dark:bg-stone-900 shadow-2xl flex flex-col h-full border-l border-stone-700 dark:border-stone-700"
          style={{ width: `min(${drawerWidth}px, 100vw)` }}
        >
          {/* Left-edge resize handle */}
          <div
            onMouseDown={startDrawerResize}
            className="absolute left-0 top-0 bottom-0 w-1.5 z-[60] cursor-ew-resize hover:bg-brand-400/30 active:bg-brand-400/50 transition-colors"
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
              <RemyTalkingAvatar
                viseme={lipSync.currentViseme}
                isSpeaking={lipSync.isSpeaking}
                size="sm"
              />
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
                  >
                    <Settings2 className="h-4 w-4" />
                  </button>
                  {currentConversationId && (
                    <>
                      <button
                        onClick={handleExport}
                        className="text-white/80 hover:text-white transition-colors p-1"
                        title="Export conversation"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleSendToSupport}
                        className="text-white/80 hover:text-white transition-colors p-1"
                        title="Send to Support"
                      >
                        <Headphones className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleNewConversation}
                    className="text-white/80 hover:text-white transition-colors p-1"
                    title="New conversation"
                  >
                    <Plus className="h-4.5 w-4.5" />
                  </button>
                </>
              )}
              {/* View tabs — icon buttons for 5 views */}
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
                onClick={() => setOpen(false)}
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
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">
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
                <label className="block text-xs font-medium text-stone-400 dark:text-stone-300 mb-1">
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
                  <label className="text-xs font-medium text-stone-400 dark:text-stone-300">
                    Speed
                  </label>
                  <span className="text-xs text-stone-400 tabular-nums">
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
                <div className="flex justify-between text-[10px] text-stone-400 mt-0.5">
                  <span>Slow</span>
                  <span>Normal</span>
                  <span>Fast</span>
                </div>
              </div>

              {/* Pitch slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-stone-400 dark:text-stone-300">
                    Pitch
                  </label>
                  <span className="text-xs text-stone-400 tabular-nums">
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
                <div className="flex justify-between text-[10px] text-stone-400 mt-0.5">
                  <span>Lower</span>
                  <span>Normal</span>
                  <span>Higher</span>
                </div>
              </div>

              {/* Volume slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-stone-400 dark:text-stone-300">
                    Volume
                  </label>
                  <span className="text-xs text-stone-400 tabular-nums">
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
                <div className="flex justify-between text-[10px] text-stone-400 mt-0.5">
                  <span>Quiet</span>
                  <span>Full</span>
                </div>
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
                onNewConversation={(projectId) => {
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
                onRunTemplate={(prompt, projectId) => {
                  handleNewConversation()
                  setDrawerView('chat')
                  // Use React state + direct send after conversation is ready
                  setTimeout(() => {
                    handleSend(prompt)
                  }, 150)
                }}
              />
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                        crunch numbers, <strong>search the web</strong> — whatever you need.
                      </p>
                      <p className="text-xs text-stone-400 mt-2 flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        Web search enabled. Conversations stay in your browser. Press{' '}
                        <kbd className="bg-stone-700 dark:bg-stone-700 rounded px-1 py-0.5 text-[10px] font-mono">
                          Ctrl+K
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
                                onClick={() => setOpen(false)}
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
                                <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1 px-1">
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
                                    </span>
                                    <button
                                      onClick={() => handleDeleteMemory(item.id)}
                                      className="opacity-0 group-hover/mem:opacity-100 flex-shrink-0 mt-0.5 text-stone-400 hover:text-red-500 transition-all p-0.5"
                                      title="Delete this memory"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ))
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* New-user quick action starters (show after welcome message) */}
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
                    <RemyTalkingAvatar
                      viseme={lipSync.currentViseme}
                      isSpeaking={lipSync.isSpeaking}
                      size="sm"
                    />
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
                          handleSend()
                        }
                      }}
                      placeholder="Ask Remy anything..."
                      className="w-full resize-none rounded-lg border border-stone-600 dark:border-stone-600 px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-stone-800 dark:text-stone-100 min-h-[40px] max-h-32"
                      rows={1}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute right-2 bottom-2 text-stone-400 hover:text-stone-400 dark:hover:text-stone-300 transition-colors"
                      title="Attach file (.txt, .md, .csv, .json, images)"
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
                    onClick={() => handleSend()}
                    disabled={!input.trim() || loading}
                    variant="primary"
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="space-y-0.5">
                    <p className="text-xs text-stone-400 flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      Remy can make mistakes. Please double-check important info.
                    </p>
                    <p className="text-[10px] text-stone-500 italic">
                      Responses may take a moment — Remy runs on a private, local AI.
                    </p>
                  </div>
                  <span
                    className={`text-[10px] tabular-nums ${input.length >= 1800 ? (input.length >= 2000 ? 'text-red-500 font-medium' : 'text-amber-500') : 'text-stone-400'}`}
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
