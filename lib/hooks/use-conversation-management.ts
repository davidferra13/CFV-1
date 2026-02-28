import { useState, useCallback, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import {
  createConversation as createLocalConversation,
  getConversations as listLocalConversations,
  getMessages as loadLocalMessages,
  deleteConversation as deleteLocalConversation,
  pruneOldConversations,
  createProject,
  getProjects,
  moveConversation,
} from '@/lib/ai/remy-local-storage'
import { REMY_WELCOME_MESSAGE, REMY_WELCOME_SHOWN_KEY } from '@/lib/ai/remy-welcome'
import type { RemyMessage, RemyTaskResult, NavigationSuggestion } from '@/lib/ai/remy-types'

// RemyConversation type mapped from LocalConversation for UI compatibility
export type RemyConversation = {
  id: string
  title: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastMessage?: string
}

type DrawerView = 'chat' | 'list' | 'search' | 'actions' | 'templates'

export function useConversationManagement(setDrawerView: Dispatch<SetStateAction<DrawerView>>) {
  const [messages, setMessages] = useState<RemyMessage[]>([])
  const [conversations, setConversations] = useState<RemyConversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [conversationsLoaded, setConversationsLoaded] = useState(false)
  const [isFirstExchange, setIsFirstExchange] = useState(true)
  const [projectSuggestion, setProjectSuggestion] = useState<{
    name: string
    icon: string
  } | null>(null)

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

  const handleSelectConversation = useCallback(
    async (convId: string) => {
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
    },
    [setDrawerView]
  )

  const handleNewConversation = useCallback(
    async (projectId?: string | null) => {
      try {
        const conv = await createLocalConversation()
        // If a project is specified, move the conversation into it
        if (projectId) {
          moveConversation(conv.id, projectId).catch(() => {})
        }
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
    },
    [setDrawerView]
  )

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

  return {
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
  }
}
