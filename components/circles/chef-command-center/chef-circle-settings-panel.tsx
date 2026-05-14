'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Loader2, Save } from 'lucide-react'
import * as circleDetailActions from '@/lib/hub/circle-detail-actions'
import type { CircleDetail } from '@/lib/hub/circle-detail-actions'

type ActionResult = { success: boolean; error?: string }

type CircleDetailActionModule = typeof circleDetailActions & {
  updateCircleSettings?: (
    circleId: string,
    settings: ChefCircleSettingsUpdate
  ) => Promise<ActionResult | void>
}

export type ChefCircleSettingsCircle = Pick<
  CircleDetail,
  'id' | 'name' | 'description' | 'emoji' | 'circle_mode' | 'default_tab' | 'silent_by_default'
> & {
  allow_member_invites: boolean
  allow_anonymous_posts: boolean
}

export type ChefCircleSettingsUpdate = {
  name: string
  description: string | null
  emoji: string | null
  allow_member_invites: boolean
  allow_anonymous_posts: boolean
  circle_mode: 'standard' | 'residency'
  default_tab: 'chat' | 'meals' | 'events' | 'photos' | 'notes' | 'members'
  silent_by_default: boolean
}

type ChefCircleSettingsPanelProps = {
  circle: ChefCircleSettingsCircle
  className?: string
  onSaved?: (settings: ChefCircleSettingsUpdate) => void
}

export function ChefCircleSettingsPanel({
  circle,
  className = '',
  onSaved,
}: ChefCircleSettingsPanelProps) {
  const [name, setName] = useState(circle.name)
  const [description, setDescription] = useState(circle.description ?? '')
  const [emoji, setEmoji] = useState(circle.emoji ?? '')
  const [allowMemberInvites, setAllowMemberInvites] = useState(circle.allow_member_invites)
  const [allowAnonymousPosts, setAllowAnonymousPosts] = useState(circle.allow_anonymous_posts)
  const [circleMode, setCircleMode] = useState<'standard' | 'residency'>(
    isCircleMode(circle.circle_mode) ? circle.circle_mode : 'standard'
  )
  const [defaultTab, setDefaultTab] = useState<ChefCircleSettingsUpdate['default_tab']>(
    isDefaultTab(circle.default_tab) ? circle.default_tab : 'chat'
  )
  const [silentByDefault, setSilentByDefault] = useState(circle.silent_by_default)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    setName(circle.name)
    setDescription(circle.description ?? '')
    setEmoji(circle.emoji ?? '')
    setAllowMemberInvites(circle.allow_member_invites)
    setAllowAnonymousPosts(circle.allow_anonymous_posts)
    setCircleMode(isCircleMode(circle.circle_mode) ? circle.circle_mode : 'standard')
    setDefaultTab(isDefaultTab(circle.default_tab) ? circle.default_tab : 'chat')
    setSilentByDefault(circle.silent_by_default)
  }, [circle])

  function handleSave() {
    const trimmedName = name.trim()

    if (!trimmedName) {
      setError('Circle name is required.')
      setSaved(false)
      return
    }

    const settings: ChefCircleSettingsUpdate = {
      name: trimmedName,
      description: description.trim() || null,
      emoji: emoji.trim() || null,
      allow_member_invites: allowMemberInvites,
      allow_anonymous_posts: allowAnonymousPosts,
      circle_mode: circleMode,
      default_tab: defaultTab,
      silent_by_default: silentByDefault,
    }

    setError(null)
    setSaved(false)

    startTransition(async () => {
      try {
        const updateCircleSettings = (circleDetailActions as unknown as CircleDetailActionModule)
          .updateCircleSettings

        if (typeof updateCircleSettings !== 'function') {
          throw new Error('Circle settings action is not available yet.')
        }

        const result = await updateCircleSettings(circle.id, settings)
        if (result && result.success === false) {
          throw new Error(result.error ?? 'Failed to save circle settings.')
        }

        setSaved(true)
        onSaved?.(settings)
        router.refresh()
        window.setTimeout(() => setSaved(false), 2500)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save circle settings.')
      }
    })
  }

  return (
    <section
      className={`space-y-5 rounded-xl border border-stone-700 bg-stone-900/80 p-5 shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-100">Circle settings</h2>
          <p className="mt-1 text-xs text-stone-500">
            Update the name, description, identity, and member posting defaults.
          </p>
        </div>
        {saved ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Saved
          </span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-[88px_1fr]">
        <div>
          <label
            htmlFor="chef-circle-emoji"
            className="mb-1 block text-xs font-medium text-stone-400"
          >
            Emoji
          </label>
          <input
            id="chef-circle-emoji"
            type="text"
            value={emoji}
            onChange={(event) => setEmoji(event.target.value)}
            maxLength={12}
            className="h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-center text-lg text-stone-100 outline-none transition focus:border-brand-500"
            aria-label="Circle emoji"
          />
        </div>

        <div>
          <label
            htmlFor="chef-circle-name"
            className="mb-1 block text-xs font-medium text-stone-400"
          >
            Name
          </label>
          <input
            id="chef-circle-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            className="h-11 w-full rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-brand-500"
            placeholder="Circle name"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="chef-circle-description"
          className="mb-1 block text-xs font-medium text-stone-400"
        >
          Description
        </label>
        <textarea
          id="chef-circle-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          maxLength={500}
          className="w-full resize-y rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm leading-6 text-stone-100 outline-none transition placeholder:text-stone-600 focus:border-brand-500"
          placeholder="What should members know about this circle?"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleRow
          label="Member invites"
          description="Members can invite others into this circle."
          checked={allowMemberInvites}
          onCheckedChange={setAllowMemberInvites}
        />
        <ToggleRow
          label="Anonymous posts"
          description="Members can post without showing their name."
          checked={allowAnonymousPosts}
          onCheckedChange={setAllowAnonymousPosts}
        />
      </div>

      <div className="space-y-3 rounded-lg border border-stone-800 bg-stone-950/60 p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-medium text-stone-400">Circle mode</span>
            <select
              value={circleMode}
              onChange={(event) => {
                const next = event.target.value
                if (!isCircleMode(next)) return
                setCircleMode(next)
                if (next === 'residency') {
                  setDefaultTab('meals')
                  setSilentByDefault(true)
                }
              }}
              className="h-10 rounded-lg border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100 outline-none transition focus:border-brand-500"
            >
              <option value="standard">Standard</option>
              <option value="residency">Residency</option>
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-medium text-stone-400">Default tab</span>
            <select
              value={defaultTab}
              onChange={(event) => {
                const next = event.target.value
                if (isDefaultTab(next)) setDefaultTab(next)
              }}
              className="h-10 rounded-lg border border-stone-700 bg-stone-900 px-3 text-sm text-stone-100 outline-none transition focus:border-brand-500"
            >
              <option value="chat">Chat</option>
              <option value="meals">Meals</option>
              <option value="events">Events</option>
              <option value="photos">Photos</option>
              <option value="notes">Notes</option>
              <option value="members">Members</option>
            </select>
          </label>
        </div>

        <ToggleRow
          label="Silent by default"
          description="New members join with notifications off when the workflow should stay quiet."
          checked={silentByDefault}
          onCheckedChange={setSilentByDefault}
        />
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="h-4 w-4" aria-hidden="true" />
        )}
        {isPending ? 'Saving...' : 'Save settings'}
      </button>
    </section>
  )
}

function isCircleMode(value: string): value is 'standard' | 'residency' {
  return value === 'standard' || value === 'residency'
}

function isDefaultTab(
  value: string
): value is 'chat' | 'meals' | 'events' | 'photos' | 'notes' | 'members' {
  return ['chat', 'meals', 'events', 'photos', 'notes', 'members'].includes(value)
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-stone-800 bg-stone-950/60 px-3 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-stone-200">{label}</p>
        <p className="mt-0.5 text-xs leading-5 text-stone-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onCheckedChange(!checked)}
        className={`relative h-6 w-11 flex-none rounded-full transition-colors ${
          checked ? 'bg-brand-500' : 'bg-stone-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-stone-950 shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}
