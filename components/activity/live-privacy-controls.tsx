'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, Shield, Settings } from '@/components/ui/icons'
import { Switch } from '@/components/ui/switch'
import type { ActivityEventType } from '@/lib/activity/types'

const STORAGE_KEY = 'chefflow-live-privacy-v1'
const SESSION_PRIVATE_KEY = 'chefflow-live-privacy-session'
const CHANGE_EVENT = 'chefflow-live-privacy-change'

export type LivePrivacyMode = 'visible' | 'private-session' | 'private-device'

export type LivePrivacySettings = {
  sharePresence: boolean
  sharePageViews: boolean
  shareProposalViews: boolean
  shareInvoiceViews: boolean
  shareMessageReads: boolean
  shareTyping: boolean
  sharePaymentPageVisits: boolean
  shareDownloads: boolean
}

export type LivePrivacyState = {
  mode: LivePrivacyMode
  settings: LivePrivacySettings
}

const DEFAULT_SETTINGS: LivePrivacySettings = {
  sharePresence: true,
  sharePageViews: true,
  shareProposalViews: true,
  shareInvoiceViews: true,
  shareMessageReads: true,
  shareTyping: true,
  sharePaymentPageVisits: true,
  shareDownloads: true,
}

const DEFAULT_STATE: LivePrivacyState = {
  mode: 'visible',
  settings: DEFAULT_SETTINGS,
}

type StoredLivePrivacyState = {
  mode?: LivePrivacyMode
  settings?: Partial<LivePrivacySettings>
}

function isLivePrivacyMode(value: unknown): value is LivePrivacyMode {
  return value === 'visible' || value === 'private-session' || value === 'private-device'
}

function normalizeState(input: StoredLivePrivacyState | null): LivePrivacyState {
  const persistedMode = isLivePrivacyMode(input?.mode) ? input.mode : 'visible'

  return {
    mode: persistedMode === 'private-session' ? 'visible' : persistedMode,
    settings: {
      ...DEFAULT_SETTINGS,
      ...(input?.settings ?? {}),
    },
  }
}

function emitPrivacyChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function readPersistedState(): LivePrivacyState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const persisted = raw ? (JSON.parse(raw) as StoredLivePrivacyState) : null
    const state = normalizeState(persisted)
    if (window.sessionStorage.getItem(SESSION_PRIVATE_KEY) === 'true') {
      return { ...state, mode: 'private-session' }
    }
    return state
  } catch {
    return DEFAULT_STATE
  }
}

function writePersistedState(state: LivePrivacyState) {
  try {
    if (state.mode === 'private-session') {
      window.sessionStorage.setItem(SESSION_PRIVATE_KEY, 'true')
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ mode: 'visible', settings: state.settings })
      )
      return
    }

    window.sessionStorage.removeItem(SESSION_PRIVATE_KEY)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Hardened browsers can block storage. The current React state still applies
    // for this tab.
  }
}

export function isLivePrivacyPrivate(state: LivePrivacyState): boolean {
  return state.mode === 'private-session' || state.mode === 'private-device'
}

export function shouldSharePresenceSignal(state: LivePrivacyState): boolean {
  return !isLivePrivacyPrivate(state) && state.settings.sharePresence
}

export function shouldShareTypingSignal(state: LivePrivacyState): boolean {
  return !isLivePrivacyPrivate(state) && state.settings.shareTyping
}

export function shouldShareActivitySignal(
  eventType: ActivityEventType,
  state: LivePrivacyState
): boolean {
  if (isLivePrivacyPrivate(state)) return false

  switch (eventType) {
    case 'portal_login':
    case 'session_heartbeat':
      return state.settings.sharePresence
    case 'proposal_viewed':
    case 'quote_viewed':
      return state.settings.shareProposalViews
    case 'invoice_viewed':
      return state.settings.shareInvoiceViews
    case 'chat_opened':
      return state.settings.shareMessageReads
    case 'payment_page_visited':
      return state.settings.sharePaymentPageVisits
    case 'document_downloaded':
      return state.settings.shareDownloads
    case 'event_viewed':
    case 'events_list_viewed':
    case 'page_viewed':
    case 'quotes_list_viewed':
    case 'rewards_viewed':
    case 'public_profile_viewed':
      return state.settings.sharePageViews
    case 'chat_message_sent':
    case 'form_submitted':
    case 'rsvp_submitted':
      return true
    default:
      return true
  }
}

export function useLivePrivacy() {
  const [state, setState] = useState<LivePrivacyState>(DEFAULT_STATE)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const sync = () => {
      setState(readPersistedState())
      setIsReady(true)
    }

    sync()
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)

    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const updateState = useCallback((updater: (current: LivePrivacyState) => LivePrivacyState) => {
    setState((current) => {
      const next = updater(current)
      writePersistedState(next)
      queueMicrotask(emitPrivacyChange)
      return next
    })
  }, [])

  const setMode = useCallback(
    (mode: LivePrivacyMode) => {
      updateState((current) => ({ ...current, mode }))
    },
    [updateState]
  )

  const setSetting = useCallback(
    (key: keyof LivePrivacySettings, value: boolean) => {
      updateState((current) => ({
        ...current,
        settings: { ...current.settings, [key]: value },
      }))
    },
    [updateState]
  )

  return {
    state,
    isReady,
    isPrivate: isLivePrivacyPrivate(state),
    setMode,
    setSetting,
  }
}

type LivePrivacyStatusPillProps = {
  className?: string
}

export function LivePrivacyStatusPill({ className = '' }: LivePrivacyStatusPillProps) {
  const { state, isReady, isPrivate } = useLivePrivacy()

  if (!isReady) return null

  const label = isPrivate
    ? state.mode === 'private-device'
      ? 'Private on this device'
      : 'Private this session'
    : 'Visible to your chef'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        isPrivate
          ? 'border-amber-400/30 bg-amber-950/40 text-amber-100'
          : 'border-emerald-400/25 bg-emerald-950/30 text-emerald-100'
      } ${className}`}
    >
      {isPrivate ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      {label}
    </span>
  )
}

type LivePrivacyPageToggleProps = {
  compact?: boolean
}

export function LivePrivacyPageToggle({ compact = false }: LivePrivacyPageToggleProps) {
  const { state, isReady, isPrivate, setMode } = useLivePrivacy()

  if (!isReady) return null

  const nextMode: LivePrivacyMode = isPrivate ? 'visible' : 'private-session'

  return (
    <button
      type="button"
      onClick={() => setMode(nextMode)}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
        isPrivate
          ? 'border-amber-400/35 bg-amber-950/40 text-amber-100 hover:bg-amber-900/50'
          : 'border-stone-600 bg-stone-900 text-stone-200 hover:bg-stone-800'
      }`}
      title={isPrivate ? 'Share passive view signals again' : 'Stop passive view signals'}
    >
      {isPrivate ? <EyeOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
      {compact
        ? isPrivate
          ? 'Private'
          : 'Visible'
        : isPrivate
          ? 'Viewing privately'
          : 'Browse privately'}
      {state.mode === 'private-device' && !compact ? (
        <span className="text-xs text-amber-200/80">device</span>
      ) : null}
    </button>
  )
}

const SETTING_ROWS: Array<{
  key: keyof LivePrivacySettings
  label: string
  detail: string
}> = [
  {
    key: 'sharePresence',
    label: 'Online and active-now signals',
    detail: 'Shares connected-now and time-on-page activity.',
  },
  {
    key: 'sharePageViews',
    label: 'Page and event views',
    detail: 'Shares normal browsing across your client portal.',
  },
  {
    key: 'shareProposalViews',
    label: 'Proposal and quote opens',
    detail: 'Lets your chef know when you review commercial details.',
  },
  {
    key: 'shareInvoiceViews',
    label: 'Invoice opens',
    detail: 'Shares invoice view signals.',
  },
  {
    key: 'shareMessageReads',
    label: 'Message read signals',
    detail: 'Shares when you open a message thread.',
  },
  {
    key: 'shareTyping',
    label: 'Typing indicators',
    detail: 'Shows typing dots while you are actively composing.',
  },
  {
    key: 'sharePaymentPageVisits',
    label: 'Payment page visits',
    detail: 'Shares high-intent payment page activity.',
  },
  {
    key: 'shareDownloads',
    label: 'Document downloads',
    detail: 'Shares receipt, quote, and document download activity.',
  },
]

export function LivePrivacyControlPanel() {
  const { state, isReady, isPrivate, setMode, setSetting } = useLivePrivacy()

  const modeLabel = useMemo(() => {
    if (state.mode === 'private-device') return 'Always private on this device'
    if (state.mode === 'private-session') return 'Private this session'
    return 'Visible'
  }, [state.mode])

  if (!isReady) return null

  return (
    <section className="rounded-lg border border-stone-700 bg-stone-900/80 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-brand-400" />
            <h2 className="text-sm font-semibold text-stone-100">Live privacy</h2>
          </div>
          <p className="mt-1 text-sm leading-6 text-stone-300">
            Choose which passive signals your chef can see while you use ChefFlow.
          </p>
        </div>
        <LivePrivacyStatusPill />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {(['visible', 'private-session', 'private-device'] as LivePrivacyMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setMode(mode)}
            className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
              state.mode === mode
                ? 'border-brand-500 bg-brand-500/10 text-stone-100'
                : 'border-stone-700 bg-stone-950/40 text-stone-300 hover:bg-stone-800'
            }`}
          >
            {mode === 'visible'
              ? 'Visible'
              : mode === 'private-session'
                ? 'Private this session'
                : 'Private on this device'}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-stone-800 bg-stone-950/40 p-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase text-stone-400">
          <Settings className="h-3.5 w-3.5" />
          Current mode: {modeLabel}
        </div>
        {isPrivate ? (
          <p className="mt-2 text-sm leading-6 text-amber-100">
            Passive view, online, read, typing, and heartbeat signals are paused. Submissions,
            payments, approvals, messages you send, and RSVP actions still work normally.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-stone-800">
            {SETTING_ROWS.map((row) => (
              <label key={row.key} className="flex items-center justify-between gap-4 py-3">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-stone-100">{row.label}</span>
                  <span className="block text-xs leading-5 text-stone-400">{row.detail}</span>
                </span>
                <Switch
                  checked={state.settings[row.key]}
                  onCheckedChange={(checked) => setSetting(row.key, checked)}
                  aria-label={row.label}
                />
              </label>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
