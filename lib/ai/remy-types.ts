// Remy — AI Chatbot Companion Types
// No 'use server' — safe to import from any context (client, server, tests)

// ─── Organization Types (Projects, Templates, Action Log) ──────────────────

export interface LocalProject {
  id: string
  name: string
  icon: string // emoji
  createdAt: string
  updatedAt: string
  sortOrder: number
}

export interface LocalTemplate {
  id: string
  name: string
  prompt: string
  projectId: string | null
  icon: string // emoji
  sortOrder: number
  createdAt: string
}

export interface ActionLogEntry {
  id: string
  conversationId: string
  messageId: string | null
  action: string // e.g., 'client.search', 'email.followup'
  params: string | null // stringified parameters
  status: 'success' | 'error'
  result: string | null // truncated result summary
  duration: number // ms
  createdAt: string
}

export interface SearchResult {
  conversation: import('@/lib/ai/remy-local-storage').LocalConversation
  matchSource: 'title' | 'message'
  matchingSnippet: string
}

// ─── Message Types ──────────────────────────────────────────────────────────

export interface RemyMessage {
  id: string
  role: 'user' | 'remy'
  content: string
  timestamp: string
  /** Whether this message is bookmarked */
  bookmarked?: boolean
  /** Inline task results (from command execution) */
  tasks?: RemyTaskResult[]
  /** Clickable navigation links */
  navSuggestions?: NavigationSuggestion[]
  /** Memory items for management UI (only on memory-related messages) */
  memoryItems?: RemyMemoryItem[]
  /** If true, shows a retry button — set on timeout/error messages */
  isRetryable?: boolean
  /** The original user message that triggered this error (for retry) */
  retryMessage?: string
  /** Thumbs up/down feedback */
  feedback?: 'up' | 'down'
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
    clientLoyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum' | null
    clientLoyaltyPoints?: number | null
    prepReady?: boolean
    groceryReady?: boolean
    timelineReady?: boolean
  }>
  recentClients?: Array<{
    id: string
    name: string
    tier?: 'bronze' | 'silver' | 'gold' | 'platinum' | null
    pointsBalance?: number | null
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
  /** Recipe library stats */
  recipeStats?: { totalRecipes: number; categories: string[] }
  /** Client vibe notes + dietary/allergy data (safety-critical) */
  clientVibeNotes?: Array<{
    name: string
    vibeNotes: string
    dietaryRestrictions: string[]
    allergies: string[]
  }>
  /** Recent after-action review insights */
  recentAARInsights?: Array<{
    rating: number | null
    wentWell: string
    toImprove: string
    lessonsLearned: string
  }>
  /** Pending menu approvals awaiting client response */
  pendingMenuApprovals?: Array<{ clientName: string }>
  /** Unread messages from inquiry leads */
  unreadInquiryMessages?: Array<{ leadName: string }>
  /** Stale inquiries — no response in >3 days, sorted by urgency (proactive nudge) */
  staleInquiries?: Array<{
    leadName: string
    daysSinceContact: number
    leadScore: number
    urgency: number
  }>
  /** Overdue payments — past due date (proactive nudge) */
  overduePayments?: Array<{ clientName: string; amountCents: number; daysOverdue: number }>
  /** Revenue pattern — busy/slow months from historical data */
  revenuePattern?: {
    busiestMonth: string
    slowestMonth: string
    monthlyAvgCents: number
  }
  /** Client re-engagement signals — clients overdue for a booking based on their cadence */
  clientReengagement?: Array<{
    clientName: string
    avgIntervalDays: number
    daysSinceLastBooking: number
    eventCount: number
  }>
  /** Quote distribution — historical range for comparison intelligence */
  quoteDistribution?: {
    count: number
    minCents: number
    maxCents: number
    medianCents: number
    p25Cents: number
    p75Cents: number
  }
  /** Profitability stats — aggregate margins across events */
  profitabilityStats?: {
    eventCount: number
    avgMargin: number
    bestMargin: number
    worstMargin: number
    avgProfitCents: number
  }
  /** Upcoming payment deadlines — due within 7 days, not yet overdue */
  upcomingPaymentDeadlines?: Array<{
    clientName: string
    occasion: string
    amountCents: number
    dueDate: string
    daysUntilDue: number
  }>
  /** Expiring quotes — valid_until within 7 days */
  expiringQuotes?: Array<{
    clientName: string
    occasion: string
    totalCents: number
    validUntil: string
    daysUntilExpiry: number
  }>
  /** Inquiry velocity — week-over-week comparison */
  inquiryVelocity?: {
    thisWeek: number
    lastWeek: number
  }
  /** Business intelligence summary — cross-engine synthesized insights */
  businessIntelligence?: string
}

// ─── Page Entity Context ────────────────────────────────────────────────────

export interface PageEntityContext {
  type: 'event' | 'client' | 'recipe' | 'inquiry' | 'menu'
  summary: string
}
