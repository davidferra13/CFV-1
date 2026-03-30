'use client'

import { useState, useTransition } from 'react'
import type { HubGroup, EventTheme } from '@/lib/hub/types'
import { updateHubGroup } from '@/lib/hub/group-actions'
import { ThemePicker } from './theme-picker'

interface HubGroupSettingsProps {
  group: HubGroup
  profileToken: string
  onUpdated?: (group: HubGroup) => void
  onClose?: () => void
}

const EMOJI_OPTIONS = ['🍽️', '🥂', '🎉', '🎂', '🏠', '👨‍🍳', '🌿', '🔥', '💫', '🍷', '🥘', '🎄']

export function HubGroupSettings({
  group,
  profileToken,
  onUpdated,
  onClose,
}: HubGroupSettingsProps) {
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description ?? '')
  const [emoji, setEmoji] = useState(group.emoji ?? '🍽️')
  const [allowInvites, setAllowInvites] = useState(group.allow_member_invites)
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [selectedThemeId, setSelectedThemeId] = useState(group.theme_id)
  const [allowAnonymous, setAllowAnonymous] = useState(group.allow_anonymous_posts)
  const [circleMode, setCircleMode] = useState<string>((group as any).circle_mode ?? 'standard')
  const [defaultTab, setDefaultTab] = useState<string>((group as any).default_tab ?? 'chat')
  const [silentByDefault, setSilentByDefault] = useState<boolean>(
    (group as any).silent_by_default ?? false
  )
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      try {
        const updated = await updateHubGroup({
          groupId: group.id,
          profileToken,
          name: name.trim() || group.name,
          description: description.trim() || null,
          emoji,
          allow_member_invites: allowInvites,
          allow_anonymous_posts: allowAnonymous,
          circle_mode: circleMode,
          default_tab: defaultTab,
          silent_by_default: silentByDefault,
        } as any)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        onUpdated?.(updated)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save settings')
      }
    })
  }

  return (
    <div className="space-y-5 rounded-xl border border-stone-700 bg-stone-800/50 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-200">Circle Settings</h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-stone-500 hover:text-stone-300"
            title="Close settings"
          >
            ✕
          </button>
        )}
      </div>

      {/* Name */}
      <div>
        <label htmlFor="circle-name" className="mb-1 block text-xs font-medium text-stone-400">
          Circle Name
        </label>
        <input
          id="circle-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="Circle name"
          className="w-full rounded-lg bg-stone-900 px-3 py-2 text-sm text-stone-200 ring-1 ring-stone-700 focus:outline-none focus:ring-[#e88f47]"
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="circle-desc" className="mb-1 block text-xs font-medium text-stone-400">
          Description
        </label>
        <textarea
          id="circle-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={2}
          className="w-full resize-none rounded-lg bg-stone-900 px-3 py-2 text-sm text-stone-200 ring-1 ring-stone-700 focus:outline-none focus:ring-[#e88f47]"
          placeholder="What's this circle about?"
        />
      </div>

      {/* Emoji */}
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-400">Emoji</label>
        <div className="flex flex-wrap gap-1.5">
          {EMOJI_OPTIONS.map((e) => (
            <button
              type="button"
              key={e}
              onClick={() => setEmoji(e)}
              title={`Select ${e}`}
              className={`rounded-lg p-2 text-lg transition-all ${
                emoji === e
                  ? 'bg-[#e88f47]/20 ring-2 ring-[#e88f47]'
                  : 'bg-stone-900 hover:bg-stone-700'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs font-medium text-stone-400">Theme</label>
          <button
            type="button"
            onClick={() => setShowThemePicker(!showThemePicker)}
            className="text-xs text-[#e88f47] hover:underline"
          >
            {showThemePicker ? 'Hide' : 'Change theme'}
          </button>
        </div>
        {showThemePicker && (
          <div className="rounded-lg border border-stone-700 bg-stone-900">
            <ThemePicker
              currentThemeId={selectedThemeId}
              onSelect={(theme: EventTheme) => {
                setSelectedThemeId(theme.id)
                setShowThemePicker(false)
              }}
            />
          </div>
        )}
      </div>

      {/* Permissions */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-stone-200">Allow member invites</span>
          <p className="text-xs text-stone-500">Let members invite others to the circle</p>
        </div>
        <button
          type="button"
          onClick={() => setAllowInvites(!allowInvites)}
          title={allowInvites ? 'Disable member invites' : 'Enable member invites'}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            allowInvites ? 'bg-[#e88f47]' : 'bg-stone-600'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              allowInvites ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Anonymous posts */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-stone-200">Allow anonymous posts</span>
          <p className="text-xs text-stone-500">Members can post without showing their name</p>
        </div>
        <button
          type="button"
          onClick={() => setAllowAnonymous(!allowAnonymous)}
          title={allowAnonymous ? 'Disable anonymous posts' : 'Enable anonymous posts'}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            allowAnonymous ? 'bg-[#e88f47]' : 'bg-stone-600'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              allowAnonymous ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Circle Mode */}
      <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-3 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-400">Circle Mode</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setCircleMode('standard')
                setDefaultTab('chat')
                setSilentByDefault(false)
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                circleMode === 'standard'
                  ? 'bg-[#e88f47]/20 text-[#e88f47] ring-1 ring-[#e88f47]'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
              }`}
            >
              Standard
              <p className="mt-0.5 text-[10px] font-normal text-stone-500">Chat-first, social</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setCircleMode('residency')
                setDefaultTab('meals')
                setSilentByDefault(true)
              }}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                circleMode === 'residency'
                  ? 'bg-[#e88f47]/20 text-[#e88f47] ring-1 ring-[#e88f47]'
                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
              }`}
            >
              Residency
              <p className="mt-0.5 text-[10px] font-normal text-stone-500">Meals-first, quiet</p>
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-400">Default Tab</label>
          <select
            value={defaultTab}
            onChange={(e) => setDefaultTab(e.target.value)}
            title="Default tab for circle members"
            className="w-full rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 ring-1 ring-stone-700 focus:outline-none focus:ring-[#e88f47]"
          >
            <option value="chat">Chat</option>
            <option value="meals">Meals</option>
            <option value="events">Events</option>
            <option value="photos">Photos</option>
            <option value="members">Members</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-stone-200">Silent by default</span>
            <p className="text-xs text-stone-500">New members join with notifications off</p>
          </div>
          <button
            type="button"
            onClick={() => setSilentByDefault(!silentByDefault)}
            title={silentByDefault ? 'Disable silent default' : 'Enable silent default'}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              silentByDefault ? 'bg-[#e88f47]' : 'bg-stone-600'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                silentByDefault ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Invite link */}
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-400">Invite Link</label>
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            title="Invite link"
            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/hub/g/${group.group_token}`}
            className="flex-1 rounded-lg bg-stone-900 px-3 py-2 text-xs text-stone-400 ring-1 ring-stone-700"
          />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/hub/g/${group.group_token}`)
            }}
            className="rounded-lg bg-stone-700 px-3 py-2 text-xs text-stone-300 hover:bg-stone-600"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Error / success feedback */}
      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="w-full rounded-lg bg-[#e88f47] py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
      </button>
    </div>
  )
}
