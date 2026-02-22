'use client'

import Link from 'next/link'
import {
  Bot,
  MessageSquare,
  History,
  Brain,
  ShieldCheck,
  Keyboard,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

interface ConversationPreview {
  id: string
  title: string
  lastMessage?: string
  updatedAt: string
}

interface RemyHubDashboardProps {
  recentConversations: ConversationPreview[]
  totalConversations: number
  totalArtifacts: number
  totalMemories: number
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Bot
  label: string
  value: number
  href: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 hover:border-gray-600 hover:bg-gray-800/80 px-4 py-3 transition-all group"
    >
      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-800 group-hover:bg-indigo-900/40 transition-colors">
        <Icon className="w-4.5 h-4.5 text-gray-400 group-hover:text-indigo-400 transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-lg font-semibold text-white">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-gray-400 transition-colors" />
    </Link>
  )
}

function QuickLink({
  icon: Icon,
  label,
  description,
  href,
  onClick,
}: {
  icon: typeof Bot
  label: string
  description: string
  href?: string
  onClick?: () => void
}) {
  const className =
    'flex items-start gap-3 rounded-xl border border-gray-800 bg-gray-900 hover:border-gray-600 hover:bg-gray-800/80 px-4 py-3.5 transition-all group text-left w-full'

  const content = (
    <>
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 group-hover:bg-indigo-900/40 transition-colors flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-gray-400 group-hover:text-indigo-400 transition-colors" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">
          {label}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </>
  )

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    )
  }

  return (
    <Link href={href!} className={className}>
      {content}
    </Link>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export function RemyHubDashboard({
  recentConversations,
  totalConversations,
  totalArtifacts,
  totalMemories,
}: RemyHubDashboardProps) {
  const openDrawer = () => {
    window.dispatchEvent(new CustomEvent('open-remy'))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30">
          <Bot className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Remy</h1>
          <p className="text-sm text-gray-400">
            Your AI assistant — research, drafts, memory, and task execution
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          icon={MessageSquare}
          label="Conversations"
          value={totalConversations}
          href="/remy"
        />
        <StatCard icon={History} label="Artifacts" value={totalArtifacts} href="/remy" />
        <StatCard icon={Brain} label="Memories" value={totalMemories} href="/remy" />
      </div>

      {/* Quick Links Grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <QuickLink
            icon={Sparkles}
            label="Open Remy Chat"
            description="Start a conversation from anywhere with Ctrl+K"
            onClick={openDrawer}
          />
          <QuickLink
            icon={History}
            label="Conversation History"
            description="Browse all past conversations and artifacts"
            href="/remy"
          />
          <QuickLink
            icon={ShieldCheck}
            label="Privacy & Settings"
            description="Trust center, data controls, and onboarding"
            href="/settings/ai-privacy"
          />
          <QuickLink
            icon={Keyboard}
            label="How Remy Works"
            description="Auto tasks run instantly, drafts need your approval"
            href="/settings/ai-privacy"
          />
        </div>
      </div>

      {/* Recent Conversations */}
      {recentConversations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Recent Conversations
            </h2>
            <Link
              href="/remy"
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              View all
            </Link>
          </div>
          <div className="space-y-1.5">
            {recentConversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => {
                  // Open the drawer — the conversation list is accessible there
                  window.dispatchEvent(new CustomEvent('open-remy'))
                }}
                className="flex items-center gap-3 w-full rounded-lg border border-gray-800/60 bg-gray-900/60 hover:border-gray-700 hover:bg-gray-800/60 px-4 py-2.5 transition-all text-left group"
              >
                <MessageSquare className="w-4 h-4 text-gray-600 group-hover:text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 group-hover:text-white truncate transition-colors">
                    {conv.title || 'Untitled conversation'}
                  </p>
                  {conv.lastMessage && (
                    <p className="text-xs text-gray-600 truncate mt-0.5">{conv.lastMessage}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-600 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {timeAgo(conv.updatedAt)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
