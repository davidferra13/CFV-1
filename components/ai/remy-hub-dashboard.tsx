'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bot, MessageSquare, Brain, ShieldCheck, Trash2, Sparkles } from 'lucide-react'
import { CommandCenterClient } from '@/components/ai/command-center-client'
import { RemyHistoryList } from '@/components/ai/remy-history-list'
import { DataControls } from '@/components/ai-privacy/data-controls'
import { DataFlowAnimated } from '@/components/ai-privacy/data-flow-animated'
import {
  getAiPreferences,
  getAiDataSummary,
  type AiPreferences,
  type AiDataSummary,
} from '@/lib/ai/privacy-actions'
import { listRemyMemories, deleteRemyMemory } from '@/lib/ai/remy-memory-actions'
import type { RemyMemory } from '@/lib/ai/remy-memory-types'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

// ─── Tab Config ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'chat', label: 'Chat', icon: Sparkles },
  { id: 'history', label: 'History', icon: MessageSquare },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'settings', label: 'Settings', icon: ShieldCheck },
] as const

type TabId = (typeof TABS)[number]['id']

// ─── Memory Tab ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  chef_preference: 'Chef Preference',
  client_insight: 'Client Insight',
  business_rule: 'Business Rule',
  communication_style: 'Communication Style',
  culinary_note: 'Culinary Note',
  scheduling_pattern: 'Scheduling',
  pricing_pattern: 'Pricing',
  workflow_preference: 'Workflow',
}

function MemoryTab() {
  const [memories, setMemories] = useState<RemyMemory[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const result = await listRemyMemories({ limit: 200 })
      setMemories(result)
    } catch {
      toast.error('Failed to load memories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await deleteRemyMemory(id)
      setMemories((prev) => prev.filter((m) => m.id !== id))
      toast.success('Memory deleted')
    } catch {
      toast.error('Failed to delete memory')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-lg bg-stone-800 h-16" />
        ))}
      </div>
    )
  }

  if (memories.length === 0) {
    return (
      <div className="text-center py-12">
        <Brain className="w-10 h-10 text-stone-300 mx-auto mb-3" />
        <p className="text-sm text-stone-500">
          Remy hasn&apos;t formed any memories yet. Start a conversation and Remy will remember
          important details automatically.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">
          {memories.length} memor{memories.length === 1 ? 'y' : 'ies'} — Remy uses these to
          personalize conversations.
        </p>
      </div>
      <div className="space-y-2">
        {memories.map((m) => (
          <div
            key={m.id}
            className="flex items-start gap-3 rounded-lg border border-stone-700 bg-surface p-3 group"
          >
            <Brain className="w-4 h-4 text-stone-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-stone-200">{m.content}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="default">{CATEGORY_LABELS[m.category] ?? m.category}</Badge>
                <span className="text-xs text-stone-400">Importance: {m.importance}/10</span>
                <span className="text-xs text-stone-400">Used {m.accessCount}x</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(m.id)}
              disabled={deleting === m.id}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-stone-400 hover:text-red-500 hover:bg-red-950 transition-all disabled:opacity-50"
              aria-label="Delete memory"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Settings Tab ──────────────────────────────────────────────────────────────

function SettingsTab() {
  const [prefs, setPrefs] = useState<AiPreferences | null>(null)
  const [summary, setSummary] = useState<AiDataSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([getAiPreferences(), getAiDataSummary()])
      setPrefs(p)
      setSummary(s)
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-lg bg-stone-800 h-20" />
        ))}
      </div>
    )
  }

  if (!prefs || !summary) {
    return (
      <div className="text-center py-12">
        <ShieldCheck className="w-10 h-10 text-stone-300 mx-auto mb-3" />
        <p className="text-sm text-stone-500">Unable to load settings. Please try again.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div
        className={`rounded-xl border p-4 flex items-center gap-3 ${
          prefs.remy_enabled
            ? 'border-emerald-200 bg-emerald-950/50'
            : 'border-stone-700 bg-stone-800'
        }`}
      >
        <Bot
          className={`h-5 w-5 shrink-0 ${prefs.remy_enabled ? 'text-emerald-600' : 'text-stone-400'}`}
        />
        <div>
          <p
            className={`text-sm font-medium ${prefs.remy_enabled ? 'text-emerald-900' : 'text-stone-300'}`}
          >
            {prefs.remy_enabled
              ? "Remy is active and running on ChefFlow's private infrastructure."
              : 'Remy is currently disabled.'}
          </p>
          <p
            className={`text-xs mt-0.5 ${prefs.remy_enabled ? 'text-emerald-700' : 'text-stone-500'}`}
          >
            {prefs.remy_enabled
              ? 'Your data stays within ChefFlow. Nothing is sent to third-party AI services.'
              : 'Your existing AI data is preserved. Enable Remy from the controls below.'}
          </p>
        </div>
      </div>

      {/* How It Works */}
      <details className="rounded-xl border border-stone-700 bg-surface">
        <summary className="cursor-pointer px-5 py-4">
          <span className="text-sm font-semibold text-stone-100">
            How It Works — Data Flow Diagram
          </span>
        </summary>
        <div className="border-t border-stone-700 p-5">
          <DataFlowAnimated />
        </div>
      </details>

      {/* Feature Toggles + Data Controls */}
      <DataControls initialPrefs={prefs} initialSummary={summary} onRefresh={load} />

      {/* Privacy promise */}
      <div className="rounded-xl bg-stone-800 border border-stone-700 p-5 space-y-3">
        <h3 className="font-semibold text-stone-100">Our Promise</h3>
        <div className="text-sm text-stone-400 space-y-2">
          <p>
            <strong>We will never:</strong> Send your data to external AI services, use your data to
            train any model, share your information with third parties, or make it difficult to
            delete your data.
          </p>
          <p>
            <strong>We will always:</strong> Process AI on ChefFlow&apos;s own servers, give you
            complete visibility into what Remy knows, let you delete any or all data instantly, and
            respect your choice to opt out entirely.
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Tabbed Hub ───────────────────────────────────────────────────────────

export function RemyHubDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('chat')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-900 border border-brand-700">
          <Bot className="w-6 h-6 text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-100">Remy</h1>
          <p className="text-sm text-stone-500">
            Your AI assistant — research, drafts, memory, and task execution
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-stone-700">
        <nav className="flex gap-1 -mb-px" aria-label="Remy tabs">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-brand-500 text-brand-400'
                    : 'border-transparent text-stone-500 hover:text-stone-300 hover:border-stone-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'chat' && (
          <div>
            <p className="text-sm text-stone-500 mb-4">
              Tell Remy what you need. Multi-step commands run in parallel — drafts always need your
              approval before anything goes out.
            </p>
            <CommandCenterClient />
          </div>
        )}
        {activeTab === 'history' && <RemyHistoryList />}
        {activeTab === 'memory' && <MemoryTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}
