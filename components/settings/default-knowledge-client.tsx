'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addRemyMemoryManual, deleteRemyMemory } from '@/lib/ai/remy-memory-actions'
import type { CulinaryProfileAnswer } from '@/lib/ai/chef-profile-constants'
import type { MemoryCategory, RemyMemory } from '@/lib/ai/remy-memory-types'
import type { ChefPreferences, MenuEngineFeatureKey } from '@/lib/scheduling/types'
import { MENU_ENGINE_FEATURE_LABELS } from '@/lib/scheduling/types'
import { Button } from '@/components/ui/button'
import { Brain, CheckCircle, Clock, Plus, Trash2 } from '@/components/ui/icons'

const memoryCategories: Array<{ value: MemoryCategory; label: string; appliesTo: string }> = [
  {
    value: 'chef_preference',
    label: 'Chef Preference',
    appliesTo: 'How you like the portal to behave',
  },
  {
    value: 'client_insight',
    label: 'Client Insight',
    appliesTo: 'Client preferences, relationship facts, and service notes',
  },
  {
    value: 'business_rule',
    label: 'Business Rule',
    appliesTo: 'Policies, minimums, boundaries, and hard rules',
  },
  {
    value: 'workflow_preference',
    label: 'Workflow Preference',
    appliesTo: 'How tasks should be sequenced or presented',
  },
  {
    value: 'scheduling_pattern',
    label: 'Scheduling Pattern',
    appliesTo: 'Timing, prep cadence, shopping windows, and buffers',
  },
  {
    value: 'pricing_pattern',
    label: 'Pricing Pattern',
    appliesTo: 'Pricing habits, quote rules, and margin preferences',
  },
  {
    value: 'communication_style',
    label: 'Communication Style',
    appliesTo: 'Tone, length, and client-facing draft preferences',
  },
  {
    value: 'culinary_note',
    label: 'Culinary Note',
    appliesTo: 'Food identity, sourcing values, plating, and service style',
  },
]

const categoryLabel = new Map(memoryCategories.map((category) => [category.value, category.label]))

function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return 'Not set'
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}

function formatKnown(value: string | number | boolean | null | undefined): string {
  if (typeof value === 'boolean') return value ? 'On' : 'Off'
  if (value == null || value === '') return 'Not set'
  return String(value)
}

function fieldStatus(value: unknown): 'Known' | 'Missing' {
  if (Array.isArray(value)) return value.length > 0 ? 'Known' : 'Missing'
  if (typeof value === 'string') return value.trim() ? 'Known' : 'Missing'
  if (value == null) return 'Missing'
  return 'Known'
}

function StatusPill({ status }: { status: 'Known' | 'Missing' | 'On' | 'Off' }) {
  const styles =
    status === 'Known' || status === 'On'
      ? 'border-emerald-800 bg-emerald-950/50 text-emerald-200'
      : 'border-stone-700 bg-stone-900 text-stone-400'

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${styles}`}>
      {status}
    </span>
  )
}

function KnowledgeRow({
  label,
  value,
  href,
  status,
}: {
  label: string
  value: string
  href: string
  status?: 'Known' | 'Missing'
}) {
  const resolvedStatus = status ?? fieldStatus(value === 'Not set' ? null : value)

  return (
    <Link
      href={href}
      className="grid gap-2 rounded-lg border border-stone-800 bg-stone-950/30 p-3 transition-colors hover:border-stone-600 hover:bg-stone-900/70 sm:grid-cols-[1fr_auto]"
    >
      <div>
        <p className="text-sm font-medium text-stone-100">{label}</p>
        <p className="mt-1 text-sm text-stone-400">{value}</p>
      </div>
      <StatusPill status={resolvedStatus} />
    </Link>
  )
}

function ToggleRow({
  label,
  description,
  enabled,
  href,
}: {
  label: string
  description: string
  enabled: boolean
  href: string
}) {
  return (
    <Link
      href={href}
      className="grid gap-2 rounded-lg border border-stone-800 bg-stone-950/30 p-3 transition-colors hover:border-stone-600 hover:bg-stone-900/70 sm:grid-cols-[1fr_auto]"
    >
      <div>
        <p className="text-sm font-medium text-stone-100">{label}</p>
        <p className="mt-1 text-sm text-stone-400">{description}</p>
      </div>
      <StatusPill status={enabled ? 'On' : 'Off'} />
    </Link>
  )
}

export function DefaultKnowledgeClient({
  preferences,
  culinaryProfile,
  memories,
}: {
  preferences: ChefPreferences
  culinaryProfile: CulinaryProfileAnswer[]
  memories: RemyMemory[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<MemoryCategory>('chef_preference')
  const [importance, setImportance] = useState(7)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const answeredCulinary = culinaryProfile.filter((answer) => answer.answer.trim()).length
  const enabledMenuFeatures = useMemo(
    () => Object.entries(preferences.menu_engine_features).filter(([, enabled]) => enabled).length,
    [preferences.menu_engine_features]
  )
  const storesSummary =
    preferences.default_stores.length > 0
      ? preferences.default_stores.map((store) => store.name).join(', ')
      : 'Not set'
  const homeBaseSummary = [preferences.home_city, preferences.home_state, preferences.home_zip]
    .filter(Boolean)
    .join(', ')

  const groupedMemories = useMemo(() => {
    const groups = new Map<MemoryCategory, RemyMemory[]>()
    for (const memory of memories) {
      const existing = groups.get(memory.category) ?? []
      existing.push(memory)
      groups.set(memory.category, existing)
    }
    return groups
  }, [memories])

  const handleAddMemory = () => {
    const trimmed = content.trim()
    setError(null)
    setSuccess(null)
    if (!trimmed) {
      setError('Add the fact ChefFlow should remember before saving.')
      return
    }

    startTransition(async () => {
      try {
        await addRemyMemoryManual({ content: trimmed, category, importance })
        setContent('')
        setSuccess('Memory saved.')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save memory.')
      }
    })
  }

  const handleDeleteMemory = (memoryId: string) => {
    setError(null)
    setSuccess(null)
    setDeletingId(memoryId)
    startTransition(async () => {
      try {
        await deleteRemyMemory(memoryId)
        setSuccess('Memory removed.')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove memory.')
      } finally {
        setDeletingId(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-stone-800 bg-stone-950/40 p-5">
        <div className="flex items-start gap-3">
          <Brain className="mt-1 h-5 w-5 text-emerald-300" />
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Default Knowledge Map</h2>
            <p className="mt-1 text-sm text-stone-400">
              These are the durable facts ChefFlow can apply without asking the chef to restate
              them.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <KnowledgeRow label="Home base" value={formatKnown(homeBaseSummary)} href="/settings" />
          <KnowledgeRow label="Default stores" value={storesSummary} href="/settings" />
          <KnowledgeRow
            label="Prep timing"
            value={`${preferences.default_prep_hours} hours prep, ${preferences.default_shopping_minutes} minutes shopping, ${preferences.default_packing_minutes} minutes packing`}
            href="/settings"
          />
          <KnowledgeRow
            label="Profit target"
            value={`${preferences.target_margin_percent}% target margin`}
            href="/settings"
          />
          <KnowledgeRow
            label="Revenue goal"
            value={formatMoney(preferences.target_monthly_revenue_cents)}
            href="/settings"
          />
          <KnowledgeRow
            label="Culinary profile"
            value={`${answeredCulinary} of ${culinaryProfile.length} prompts answered`}
            href="/settings/culinary-profile"
            status={answeredCulinary > 0 ? 'Known' : 'Missing'}
          />
        </div>
      </section>

      <section className="rounded-lg border border-stone-800 bg-stone-950/40 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle className="mt-1 h-5 w-5 text-brand-300" />
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Toggleable Intelligence</h2>
            <p className="mt-1 text-sm text-stone-400">
              These controls decide which stored defaults and checks are applied across the portal.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          <ToggleRow
            label="Event Readiness Assistant"
            description={`Default mode: ${preferences.event_readiness_assistant_default_mode}`}
            enabled={preferences.event_readiness_assistant_enabled}
            href="/settings"
          />
          <ToggleRow
            label="Financial readiness checks"
            description="Show payment, margin, and quote readiness signals on events."
            enabled={preferences.event_readiness_show_financial}
            href="/settings"
          />
          <ToggleRow
            label="Pricing confidence checks"
            description="Show whether pricing looks confident enough to move forward."
            enabled={preferences.event_readiness_show_pricing_confidence}
            href="/settings"
          />
          <ToggleRow
            label="Ops readiness checks"
            description="Show prep, packing, and execution readiness signals on events."
            enabled={preferences.event_readiness_show_ops}
            href="/settings"
          />
          <ToggleRow
            label="Menu intelligence"
            description={`${enabledMenuFeatures} of ${
              Object.keys(preferences.menu_engine_features).length
            } menu checks are enabled.`}
            enabled={enabledMenuFeatures > 0}
            href="/settings/menu-engine"
          />
        </div>
      </section>

      <section className="rounded-lg border border-stone-800 bg-stone-950/40 p-5">
        <div className="flex items-start gap-3">
          <Plus className="mt-1 h-5 w-5 text-sky-300" />
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Add a Durable Memory</h2>
            <p className="mt-1 text-sm text-stone-400">
              Use this for facts the chef should not have to repeat in Remy, drafts, scheduling, or
              business workflows.
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_180px_140px]">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-stone-300">Memory</span>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Example: I prefer warm, concise client emails with one clear next step."
                className="block w-full resize-none rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-stone-300">Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as MemoryCategory)}
                className="block min-h-[44px] w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {memoryCategories.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-stone-500">
                {memoryCategories.find((item) => item.value === category)?.appliesTo}
              </p>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-stone-300">Importance</span>
              <input
                type="number"
                min={1}
                max={10}
                value={importance}
                onChange={(event) => setImportance(Number(event.target.value))}
                className="block min-h-[44px] w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <p className="mt-1 text-xs text-stone-500">8 to 10 is always loaded first.</p>
            </label>
          </div>
          {error && <p className="text-sm text-red-300">{error}</p>}
          {success && <p className="text-sm text-emerald-300">{success}</p>}
          <Button type="button" variant="primary" onClick={handleAddMemory} disabled={isPending}>
            <Plus className="h-4 w-4" />
            Save Memory
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-stone-800 bg-stone-950/40 p-5">
        <div className="flex items-start gap-3">
          <Clock className="mt-1 h-5 w-5 text-amber-300" />
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Memory Bank</h2>
            <p className="mt-1 text-sm text-stone-400">
              Active memories are grouped by scope. Runtime file memories are read-only here.
            </p>
          </div>
        </div>
        {memories.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-stone-700 p-4 text-sm text-stone-400">
            No durable memories yet. Add one above to make it available across ChefFlow.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {memoryCategories
              .filter((item) => groupedMemories.has(item.value))
              .map((item) => (
                <div key={item.value} className="space-y-2">
                  <h3 className="text-sm font-semibold text-stone-200">{item.label}</h3>
                  <div className="space-y-2">
                    {groupedMemories.get(item.value)?.map((memory) => (
                      <div
                        key={memory.id}
                        className="grid gap-3 rounded-lg border border-stone-800 bg-stone-950/30 p-3 sm:grid-cols-[1fr_auto]"
                      >
                        <div>
                          <p className="text-sm text-stone-100">{memory.content}</p>
                          <p className="mt-1 text-xs text-stone-500">
                            {categoryLabel.get(memory.category)}. Importance {memory.importance}.
                            Source {memory.source.replace(/_/g, ' ')}.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteMemory(memory.id)}
                          disabled={!memory.editable || deletingId === memory.id || isPending}
                          tooltip={
                            memory.editable
                              ? 'Remove memory'
                              : 'Runtime memories are managed outside the portal'
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-stone-800 bg-stone-950/40 p-5">
        <h2 className="text-lg font-semibold text-stone-100">Menu Intelligence Scope</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(
            Object.entries(preferences.menu_engine_features) as Array<
              [MenuEngineFeatureKey, boolean]
            >
          ).map(([key, enabled]) => {
            const meta = MENU_ENGINE_FEATURE_LABELS[key]
            return (
              <ToggleRow
                key={key}
                label={meta.label}
                description={meta.description}
                enabled={enabled}
                href="/settings/menu-engine"
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}
