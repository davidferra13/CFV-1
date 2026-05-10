// Remy - Server-side conversation types
// Mirrors the DB schema for remy_conversations + remy_messages.
// No 'use server' - safe to import from any context.

import type { RemyTaskResult, NavigationSuggestion } from '@/lib/ai/remy-types'

// ─── Database Row Types ─────────────────────────────────────────────────────

export interface RemyConversation {
  id: string
  tenant_id: string
  title: string
  pinned: boolean
  archived: boolean
  summary: string | null
  created_at: string
  updated_at: string
}

export interface RemyMessageRow {
  id: string
  conversation_id: string
  tenant_id: string
  role: 'user' | 'remy'
  content: string
  tasks: RemyTaskResult[] | null
  nav_suggestions: NavigationSuggestion[] | null
  quick_replies: string[] | null
  feedback: 'up' | 'down' | null
  pinned: boolean
  created_at: string
}

// ─── API Types ──────────────────────────────────────────────────────────────

export interface ConversationWithPreview extends RemyConversation {
  message_count: number
  last_message_preview: string | null
}

export interface ConversationDetail extends RemyConversation {
  messages: RemyMessageRow[]
}

// ─── Context Awareness Types ────────────────────────────────────────────────

export interface RemyConciergeContext {
  upcoming_events: Array<{
    id: string
    title: string
    date: string
    guest_count: number
    status: string
  }>
  overdue_tasks: Array<{
    id: string
    title: string
    due_date: string
  }>
  unread_inbox: number
  pending_quotes: number
  cil_insights: Array<{
    title: string
    detail: string
    severity: 'high' | 'medium' | 'low'
  }>
}

// ─── Quick Ask Patterns ─────────────────────────────────────────────────────

export const QUICK_ASK_PATTERNS = [
  { label: "What's my week look like?", icon: '📅' },
  { label: 'Any overdue invoices?', icon: '💰' },
  { label: 'Who needs a follow-up?', icon: '📬' },
  { label: "What's on my prep list?", icon: '🔪' },
  { label: 'Morning briefing', icon: '☀️' },
  { label: 'Draft a thank-you email', icon: '✉️' },
] as const
