// Remy — AI Chatbot Companion Types
// No 'use server' — safe to import from any context (client, server, tests)

// ─── Message Types ──────────────────────────────────────────────────────────

export interface RemyMessage {
  id: string
  role: 'user' | 'remy'
  content: string
  timestamp: string
  /** Inline task results (from command execution) */
  tasks?: RemyTaskResult[]
  /** Clickable navigation links */
  navSuggestions?: NavigationSuggestion[]
  /** Memory items for management UI (only on memory-related messages) */
  memoryItems?: RemyMemoryItem[]
}

export interface NavigationSuggestion {
  label: string
  href: string
  description?: string
}

export interface RemyTaskResult {
  taskId: string
  taskType: string
  tier: 1 | 2 | 3
  name: string
  status: 'done' | 'pending' | 'held' | 'error'
  data?: unknown
  error?: string
  holdReason?: string
}

// ─── Server Response ────────────────────────────────────────────────────────

export type MessageIntent = 'question' | 'command' | 'mixed' | 'memory'

export interface RemyMemoryItem {
  id: string
  category: string
  content: string
  importance: number
  accessCount: number
  relatedClientId: string | null
  createdAt: string
}

export interface RemyResponse {
  /** Remy's conversational reply (always present) */
  text: string
  /** What intent was detected */
  intent: MessageIntent
  /** Task results from command execution */
  tasks?: RemyTaskResult[]
  /** Page navigation suggestions */
  navSuggestions?: NavigationSuggestion[]
  /** Memory items for display/management (only on memory intent) */
  memoryItems?: RemyMemoryItem[]
}

// ─── Context ────────────────────────────────────────────────────────────────

export interface RemyContext {
  chefName: string | null
  businessName: string | null
  tagline: string | null
  clientCount: number
  upcomingEventCount: number
  openInquiryCount: number
  upcomingEvents?: Array<{
    id: string
    occasion: string | null
    date: string | null
    status: string
    clientName: string
    guestCount: number | null
  }>
  recentClients?: Array<{
    id: string
    name: string
  }>
  monthRevenueCents?: number
  pendingQuoteCount?: number
  currentPage?: string
}
