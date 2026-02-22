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
  /** Agent action: structured preview for confirmation card */
  preview?: import('@/lib/ai/command-types').AgentActionPreview
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
  /** Deep context about the specific entity the chef is viewing */
  pageEntity?: PageEntityContext
  /** Entities mentioned by name in the user's message (auto-resolved) */
  mentionedEntities?: PageEntityContext[]
  /** Daily plan summary (if available) */
  dailyPlan?: {
    totalItems: number
    adminItems: number
    prepItems: number
    creativeItems: number
    relationshipItems: number
    estimatedMinutes: number
  }
  /** Email digest — recent inbox activity for proactive awareness */
  emailDigest?: {
    totalSinceYesterday: number
    inquiryCount: number
    threadReplyCount: number
    recentEmails: Array<{
      from: string
      subject: string
      snippet: string
      classification: string
      receivedAt: string
    }>
  }
  /** Calendar & availability (next 30 days) */
  calendarSummary?: {
    blockedDates: Array<{ date: string; reason: string; type: string }>
    calendarEntries: Array<{
      title: string
      startDate: string
      endDate: string
      type: string
      blocksBookings: boolean
    }>
    waitlistEntries: Array<{ clientName: string; date: string; occasion: string; status: string }>
  }
  /** Cross-event financial aggregation */
  yearlyStats?: {
    yearRevenueCents: number
    yearExpenseCents: number
    totalEventsThisYear: number
    completedEventsThisYear: number
    avgEventRevenueCents: number
    topClients: Array<{ name: string; revenueCents: number; eventCount: number }>
  }
  /** Staff roster */
  staffRoster?: Array<{
    name: string
    role: string
    phone: string | null
    activeAssignments: number
  }>
  /** Equipment inventory */
  equipmentSummary?: { totalItems: number; categories: string[] }
  /** Active goals */
  activeGoals?: Array<{
    title: string
    targetDate: string | null
    progress: number | null
    status: string
  }>
  /** Pending todos */
  activeTodos?: Array<{ title: string; dueDate: string | null; priority: string; status: string }>
  /** Scheduled calls */
  upcomingCalls?: Array<{
    clientName: string
    scheduledAt: string
    purpose: string | null
    status: string
  }>
  /** Document counts */
  documentSummary?: { totalDocuments: number; totalFolders: number }
  /** Recent Remy artifacts */
  recentArtifacts?: Array<{ type: string; title: string; createdAt: string }>
}

// ─── Page Entity Context ────────────────────────────────────────────────────

export interface PageEntityContext {
  type: 'event' | 'client' | 'recipe' | 'inquiry' | 'menu'
  summary: string
}
