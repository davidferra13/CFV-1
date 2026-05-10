'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import {
  Bot,
  Database,
  Zap,
  Shield,
  MessageCircle,
  Brain,
  Package,
  ArrowRight,
  Sparkles,
} from '@/components/ui/icons'
import { Switch } from '@/components/ui/switch'
import { RemyArchetypeSelector } from '@/components/ai-privacy/remy-archetype-selector'
import { saveAiPreferences, type AiDataSummary, type AiPreferences } from '@/lib/ai/privacy-actions'
import { toast } from 'sonner'

// ---- Signal sources config ----

interface SignalConfig {
  key: string
  label: string
  description: string
  icon: typeof Database
}

const SIGNAL_SOURCES: SignalConfig[] = [
  {
    key: 'db_mutation',
    label: 'Database changes',
    description: 'Track when clients, events, or recipes are created or updated',
    icon: Database,
  },
  {
    key: 'event_transition',
    label: 'Event transitions',
    description: 'Monitor when events move between stages (inquiry, confirmed, completed)',
    icon: Zap,
  },
  {
    key: 'ledger',
    label: 'Financial activity',
    description: 'Watch for payments, expenses, and ledger entries',
    icon: Package,
  },
  {
    key: 'memory',
    label: 'Memory extraction',
    description: 'Learn from conversations and remember important details',
    icon: Brain,
  },
  {
    key: 'automation',
    label: 'Automations',
    description: 'Track automated workflows and their results',
    icon: Zap,
  },
  {
    key: 'inventory',
    label: 'Inventory changes',
    description: 'Monitor stock levels and inventory transactions',
    icon: Package,
  },
  {
    key: 'sse',
    label: 'Real-time events',
    description: 'Listen to live system events as they happen',
    icon: Zap,
  },
]

// ---- Notification preferences config ----

interface NotificationConfig {
  key: string
  label: string
  description: string
}

const NOTIFICATION_OPTIONS: NotificationConfig[] = [
  {
    key: 'missing_prep',
    label: 'Missing prep lists',
    description: 'Events within 48 hours that still need prep lists',
  },
  {
    key: 'missing_grocery',
    label: 'Missing grocery lists',
    description: 'Events within 24 hours without a grocery list',
  },
  {
    key: 'overdue_payments',
    label: 'Overdue payments',
    description: 'Payments that have passed their due date',
  },
  {
    key: 'stale_inquiries',
    label: 'Stale inquiries',
    description: 'Leads with no response in 3 or more days',
  },
  {
    key: 'client_reengagement',
    label: 'Client re-engagement',
    description: 'Clients who are overdue for their next booking based on their history',
  },
  {
    key: 'morning_briefing',
    label: 'Morning briefing',
    description: 'A daily summary of what needs your attention',
  },
]

// ---- Feature controls config ----

interface FeatureControl {
  key: keyof Pick<
    AiPreferences,
    'remy_enabled' | 'allow_memory' | 'allow_suggestions' | 'allow_document_drafts'
  >
  label: string
  description: string
  icon: typeof Bot
}

const FEATURE_CONTROLS: FeatureControl[] = [
  {
    key: 'remy_enabled',
    label: 'Remy Enabled',
    description: 'Master switch. Turn Remy on or off entirely.',
    icon: Bot,
  },
  {
    key: 'allow_memory',
    label: 'Memory',
    description: 'Let Remy remember things from your conversations.',
    icon: Brain,
  },
  {
    key: 'allow_suggestions',
    label: 'Proactive Suggestions',
    description: 'Remy can suggest actions based on what it notices.',
    icon: Sparkles,
  },
  {
    key: 'allow_document_drafts',
    label: 'Document Drafts',
    description: 'Remy can draft emails, contracts, and other documents.',
    icon: MessageCircle,
  },
]

// ---- localStorage helpers ----

const SIGNAL_KEY = 'cf:remy:signal-preferences'
const NOTIFICATION_KEY = 'cf:remy:notification-preferences'

function loadPreferences(key: string, defaults: string[]): Record<string, boolean> {
  if (typeof window === 'undefined') {
    const result: Record<string, boolean> = {}
    for (const d of defaults) result[d] = true
    return result
  }
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch {}
  const result: Record<string, boolean> = {}
  for (const d of defaults) result[d] = true
  return result
}

function savePreferences(key: string, prefs: Record<string, boolean>) {
  localStorage.setItem(key, JSON.stringify(prefs))
}

// ---- Props ----

interface Props {
  preferences: AiPreferences
  dataSummary: AiDataSummary
}

export function RemySettingsPage({ preferences, dataSummary }: Props) {
  // Feature controls (server-persisted)
  const [features, setFeatures] = useState({
    remy_enabled: preferences.remy_enabled,
    allow_memory: preferences.allow_memory,
    allow_suggestions: preferences.allow_suggestions,
    allow_document_drafts: preferences.allow_document_drafts,
  })
  const [savingFeature, startFeatureTransition] = useTransition()

  // Signal preferences (localStorage)
  const [signals, setSignals] = useState<Record<string, boolean>>({})
  const [notifications, setNotifications] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setSignals(
      loadPreferences(
        SIGNAL_KEY,
        SIGNAL_SOURCES.map((s) => s.key)
      )
    )
    setNotifications(
      loadPreferences(
        NOTIFICATION_KEY,
        NOTIFICATION_OPTIONS.map((n) => n.key)
      )
    )
  }, [])

  function toggleSignal(key: string) {
    setSignals((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      savePreferences(SIGNAL_KEY, next)
      return next
    })
  }

  function toggleNotification(key: string) {
    setNotifications((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      savePreferences(NOTIFICATION_KEY, next)
      return next
    })
  }

  function toggleFeature(key: FeatureControl['key']) {
    const previous = features[key]
    const next = !previous
    setFeatures((prev) => ({ ...prev, [key]: next }))

    startFeatureTransition(async () => {
      try {
        const result = await saveAiPreferences({ [key]: next })
        if (!result.success) {
          setFeatures((prev) => ({ ...prev, [key]: previous }))
          toast.error('Failed to save preference')
        } else {
          toast.success('Preference saved')
        }
      } catch {
        setFeatures((prev) => ({ ...prev, [key]: previous }))
        toast.error('Failed to save preference')
      }
    })
  }

  return (
    <div className="space-y-10">
      {/* Section 1: Personality & Tone */}
      <section>
        <RemyArchetypeSelector currentArchetype={preferences.remy_archetype} />
      </section>

      {/* Divider */}
      <div className="border-t border-stone-800" />

      {/* Section 2: Feature Controls */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-stone-100">Feature Controls</h3>
          <p className="text-sm text-stone-400 mt-1">Toggle what Remy is allowed to do.</p>
        </div>

        <div className="space-y-1">
          {FEATURE_CONTROLS.map((control) => {
            const Icon = control.icon
            const enabled = features[control.key]

            return (
              <div
                key={control.key}
                className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-stone-800/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="h-4 w-4 text-stone-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-200">{control.label}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{control.description}</p>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={() => toggleFeature(control.key)}
                  disabled={savingFeature}
                />
              </div>
            )
          })}
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-stone-800" />

      {/* Section 3: Intelligence Sources */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-stone-100">What Remy Monitors</h3>
          <p className="text-sm text-stone-400 mt-1">
            Control which data sources Remy uses to stay aware of your business.
          </p>
        </div>

        <div className="space-y-1">
          {SIGNAL_SOURCES.map((source) => {
            const Icon = source.icon
            const enabled = signals[source.key] ?? true

            return (
              <div
                key={source.key}
                className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-stone-800/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="h-4 w-4 text-stone-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-200">{source.label}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{source.description}</p>
                  </div>
                </div>
                <Switch checked={enabled} onCheckedChange={() => toggleSignal(source.key)} />
              </div>
            )
          })}
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-stone-800" />

      {/* Section 4: Notification Preferences */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-stone-100">Proactive Outreach</h3>
          <p className="text-sm text-stone-400 mt-1">
            Control when Remy reaches out with suggestions and alerts.
          </p>
        </div>

        <div className="space-y-1">
          {NOTIFICATION_OPTIONS.map((option) => {
            const enabled = notifications[option.key] ?? true

            return (
              <div
                key={option.key}
                className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-stone-800/50 transition-colors"
              >
                <div className="min-w-0 pr-4">
                  <p className="text-sm font-medium text-stone-200">{option.label}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{option.description}</p>
                </div>
                <Switch checked={enabled} onCheckedChange={() => toggleNotification(option.key)} />
              </div>
            )
          })}
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-stone-800" />

      {/* Section 5: Data & Privacy */}
      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-stone-100">Data & Privacy</h3>
          <p className="text-sm text-stone-400 mt-1">
            View your AI data usage and manage privacy controls.
          </p>
        </div>

        {/* Data summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <DataCard icon={MessageCircle} label="Conversations" value={dataSummary.conversations} />
          <DataCard icon={MessageCircle} label="Messages" value={dataSummary.messages} />
          <DataCard icon={Brain} label="Memories" value={dataSummary.memories} />
          <DataCard icon={Package} label="Artifacts" value={dataSummary.artifacts} />
        </div>

        {/* Link to full data controls */}
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-stone-700 bg-stone-800 text-sm font-medium text-stone-200 hover:bg-stone-700 hover:border-stone-600 transition-colors"
        >
          <Shield className="h-4 w-4 text-stone-400" />
          Manage AI Data
          <ArrowRight className="h-3.5 w-3.5 text-stone-500" />
        </Link>
      </section>
    </div>
  )
}

// ---- Data summary card ----

function DataCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MessageCircle
  label: string
  value: number
}) {
  return (
    <div className="bg-stone-800 border border-stone-700 rounded-xl p-4">
      <Icon className="h-4 w-4 text-stone-500 mb-2" />
      <p className="text-xl font-bold text-stone-100">{value.toLocaleString()}</p>
      <p className="text-xs text-stone-500 mt-0.5">{label}</p>
    </div>
  )
}
