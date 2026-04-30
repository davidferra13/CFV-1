'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, Shield, Settings } from '@/components/ui/icons'
import { Switch } from '@/components/ui/switch'
import type { ActivityEventType } from '@/lib/activity/types'

const STORAGE_KEY = 'chefflow-live-privacy-v1'
const SESSION_PRIVATE_KEY = 'chefflow-live-privacy-session'
const SESSION_ONCE_KEY = 'chefflow-live-privacy-once'
const ONBOARDING_KEY = 'chefflow-live-privacy-onboarded'
const CHANGE_EVENT = 'chefflow-live-privacy-change'

export type LivePrivacyMode = 'visible' | 'private-session' | 'private-device'
export type LivePrivacySurface =
  | 'proposals'
  | 'invoices'
  | 'messages'
  | 'events'
  | 'menus'
  | 'documents'
  | 'payments'
export type LivePrivacySurfaceMode = 'inherit' | 'visible' | 'private'

export type LivePrivacyReceipt = {
  id: string
  at: string
  signal: string
  surface: LivePrivacySurface | 'presence' | 'typing'
  outcome: 'shared' | 'private' | 'functional'
  detail: string
}

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
  surfaceDefaults: Record<LivePrivacySurface, LivePrivacySurfaceMode>
  receipts: LivePrivacyReceipt[]
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

const DEFAULT_SURFACE_DEFAULTS: Record<LivePrivacySurface, LivePrivacySurfaceMode> = {
  proposals: 'inherit',
  invoices: 'inherit',
  messages: 'inherit',
  events: 'inherit',
  menus: 'inherit',
  documents: 'inherit',
  payments: 'inherit',
}

const DEFAULT_STATE: LivePrivacyState = {
  mode: 'visible',
  settings: DEFAULT_SETTINGS,
  surfaceDefaults: DEFAULT_SURFACE_DEFAULTS,
  receipts: [],
}

type StoredLivePrivacyState = {
  mode?: LivePrivacyMode
  settings?: Partial<LivePrivacySettings>
  surfaceDefaults?: Partial<Record<LivePrivacySurface, LivePrivacySurfaceMode>>
  receipts?: LivePrivacyReceipt[]
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
    surfaceDefaults: {
      ...DEFAULT_SURFACE_DEFAULTS,
      ...(input?.surfaceDefaults ?? {}),
    },
    receipts: Array.isArray(input?.receipts) ? input.receipts.slice(0, 12) : [],
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
        JSON.stringify({
          mode: 'visible',
          settings: state.settings,
          surfaceDefaults: state.surfaceDefaults,
          receipts: state.receipts.slice(0, 12),
        })
      )
      return
    }

    window.sessionStorage.removeItem(SESSION_PRIVATE_KEY)
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, receipts: state.receipts.slice(0, 12) })
    )
  } catch {
    // Hardened browsers can block storage. The current React state still applies
    // for this tab.
  }
}

function readOneTimePrivateSurfaces(): LivePrivacySurface[] {
  try {
    const raw = window.sessionStorage.getItem(SESSION_ONCE_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (surface): surface is LivePrivacySurface =>
        typeof surface === 'string' && surface in DEFAULT_SURFACE_DEFAULTS
    )
  } catch {
    return []
  }
}

function writeOneTimePrivateSurfaces(surfaces: LivePrivacySurface[]) {
  try {
    window.sessionStorage.setItem(SESSION_ONCE_KEY, JSON.stringify(Array.from(new Set(surfaces))))
  } catch {
    // Session-only privacy affordance. Ignore storage failures.
  }
}

export function setLivePrivacySurfacePrivateOnce(surface: LivePrivacySurface) {
  writeOneTimePrivateSurfaces([...readOneTimePrivateSurfaces(), surface])
  emitPrivacyChange()
}

export function consumeLivePrivacySurfacePrivateOnce(surface: LivePrivacySurface | null): boolean {
  if (!surface) return false
  const surfaces = readOneTimePrivateSurfaces()
  if (!surfaces.includes(surface)) return false
  writeOneTimePrivateSurfaces(surfaces.filter((item) => item !== surface))
  emitPrivacyChange()
  return true
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

export function getLivePrivacySurfaceForEvent(
  eventType: ActivityEventType
): LivePrivacySurface | null {
  switch (eventType) {
    case 'proposal_viewed':
    case 'quote_viewed':
      return 'proposals'
    case 'invoice_viewed':
      return 'invoices'
    case 'chat_opened':
    case 'chat_message_sent':
      return 'messages'
    case 'payment_page_visited':
      return 'payments'
    case 'document_downloaded':
      return 'documents'
    case 'event_viewed':
    case 'events_list_viewed':
      return 'events'
    case 'page_viewed':
    case 'quotes_list_viewed':
    case 'rewards_viewed':
    case 'public_profile_viewed':
      return 'menus'
    default:
      return null
  }
}

export function isLivePrivacySurfacePrivate(
  surface: LivePrivacySurface,
  state: LivePrivacyState
): boolean {
  return isLivePrivacyPrivate(state) || state.surfaceDefaults[surface] === 'private'
}

export function shouldShareSurfaceSignal(
  surface: LivePrivacySurface,
  state: LivePrivacyState
): boolean {
  if (isLivePrivacyPrivate(state)) return false
  return state.surfaceDefaults[surface] !== 'private'
}

export function shouldShareActivitySignal(
  eventType: ActivityEventType,
  state: LivePrivacyState
): boolean {
  if (
    eventType === 'chat_message_sent' ||
    eventType === 'form_submitted' ||
    eventType === 'rsvp_submitted'
  ) {
    return true
  }

  const surface = getLivePrivacySurfaceForEvent(eventType)
  const surfaceMode = surface ? state.surfaceDefaults[surface] : 'inherit'

  if (isLivePrivacyPrivate(state)) return false
  if (surfaceMode === 'private') return false
  if (surfaceMode === 'visible') return true

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
    default:
      return true
  }
}

export function getLivePrivacySignalLabel(eventType: ActivityEventType): string {
  switch (eventType) {
    case 'proposal_viewed':
      return 'Proposal viewed'
    case 'quote_viewed':
      return 'Quote viewed'
    case 'invoice_viewed':
      return 'Invoice opened'
    case 'chat_opened':
      return 'Messages opened'
    case 'payment_page_visited':
      return 'Payment page opened'
    case 'document_downloaded':
      return 'Document downloaded'
    case 'session_heartbeat':
      return 'Active-now heartbeat'
    case 'portal_login':
      return 'Portal opened'
    case 'chat_message_sent':
      return 'Message sent'
    case 'form_submitted':
      return 'Form submitted'
    case 'rsvp_submitted':
      return 'RSVP submitted'
    default:
      return eventType.replace(/_/g, ' ')
  }
}

function buildReceiptId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function recordLivePrivacyReceipt(input: Omit<LivePrivacyReceipt, 'id' | 'at'>) {
  try {
    const current = readPersistedState()
    const receipt: LivePrivacyReceipt = {
      id: buildReceiptId(),
      at: new Date().toISOString(),
      ...input,
    }
    writePersistedState({
      ...current,
      receipts: [receipt, ...current.receipts].slice(0, 12),
    })
    emitPrivacyChange()
  } catch {
    // Receipts are a client-side transparency affordance only.
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

  const setSurfaceDefault = useCallback(
    (surface: LivePrivacySurface, value: LivePrivacySurfaceMode) => {
      updateState((current) => ({
        ...current,
        surfaceDefaults: { ...current.surfaceDefaults, [surface]: value },
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
    setSurfaceDefault,
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
  surface?: LivePrivacySurface
}

const SURFACE_LABELS: Record<LivePrivacySurface, string> = {
  proposals: 'proposals',
  invoices: 'invoices',
  messages: 'messages',
  events: 'events',
  menus: 'menus',
  documents: 'documents',
  payments: 'payments',
}

export function LivePrivacyPageToggle({ compact = false, surface }: LivePrivacyPageToggleProps) {
  const { state, isReady, isPrivate, setMode, setSurfaceDefault } = useLivePrivacy()

  if (!isReady) return null

  const surfacePrivate = surface ? isLivePrivacySurfacePrivate(surface, state) : isPrivate

  const toggle = () => {
    if (surface) {
      if (isPrivate && state.mode !== 'visible') {
        setMode('visible')
        return
      }

      setSurfaceDefault(
        surface,
        state.surfaceDefaults[surface] === 'private' ? 'visible' : 'private'
      )
      return
    }

    setMode(isPrivate ? 'visible' : 'private-session')
  }

  const setPrivateOnce = () => {
    if (!surface) return
    setLivePrivacySurfacePrivateOnce(surface)
    recordLivePrivacyReceipt({
      signal: `Next ${SURFACE_LABELS[surface]} open`,
      surface,
      outcome: 'private',
      detail: 'ChefFlow will keep the next passive signal on this surface private.',
    })
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={toggle}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
          surfacePrivate
            ? 'border-amber-400/35 bg-amber-950/40 text-amber-100 hover:bg-amber-900/50'
            : 'border-stone-600 bg-stone-900 text-stone-200 hover:bg-stone-800'
        }`}
        title={surfacePrivate ? 'Share passive view signals again' : 'Stop passive view signals'}
      >
        {surfacePrivate ? <EyeOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
        {compact
          ? surfacePrivate
            ? 'Private'
            : 'Visible'
          : surfacePrivate
            ? surface
              ? `Private ${SURFACE_LABELS[surface]}`
              : 'Viewing privately'
            : surface
              ? `Private ${SURFACE_LABELS[surface]}`
              : 'Browse privately'}
        {state.mode === 'private-device' && !compact ? (
          <span className="text-xs text-amber-200/80">device</span>
        ) : null}
      </button>
      {surface && !surfacePrivate ? (
        <button
          type="button"
          onClick={setPrivateOnce}
          className="rounded-lg border border-stone-700 bg-stone-950 px-2 py-2 text-xs font-medium text-stone-300 transition hover:bg-stone-800"
          title="Keep the next passive signal on this surface private"
        >
          Once
        </button>
      ) : null}
    </span>
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

const SURFACE_ROWS: Array<{
  key: LivePrivacySurface
  label: string
  example: string
}> = [
  {
    key: 'proposals',
    label: 'Proposals and quotes',
    example: 'Open proposals privately by default.',
  },
  { key: 'invoices', label: 'Invoices', example: 'Keep invoice views private.' },
  { key: 'messages', label: 'Messages', example: 'Hide read and typing signals.' },
  { key: 'events', label: 'Event pages', example: 'Hide event browsing signals.' },
  { key: 'menus', label: 'Menus and general pages', example: 'Hide normal browsing signals.' },
  { key: 'documents', label: 'Documents', example: 'Hide document download signals.' },
  { key: 'payments', label: 'Payment pages', example: 'Hide payment page visits.' },
]

function LivePrivacyPreview({ state }: { state: LivePrivacyState }) {
  const examples: Array<{
    eventType: ActivityEventType
    shared: boolean
    visible: string
    hidden: string
  }> = [
    {
      eventType: 'proposal_viewed',
      shared: shouldShareActivitySignal('proposal_viewed', state),
      visible: 'Chef will see: proposal reviewed.',
      hidden: 'Chef will not see this proposal open.',
    },
    {
      eventType: 'payment_page_visited',
      shared: shouldShareActivitySignal('payment_page_visited', state),
      visible: 'Chef will see: payment page opened.',
      hidden: 'Chef will not see this payment page visit.',
    },
    {
      eventType: 'chat_opened',
      shared: shouldShareActivitySignal('chat_opened', state),
      visible: 'Chef will see: messages opened.',
      hidden: 'Chef will not see this message read signal.',
    },
  ]

  return (
    <div className="mt-4 rounded-lg border border-stone-800 bg-stone-950/40 p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase text-stone-400">
        <Eye className="h-3.5 w-3.5" />
        Privacy preview
      </div>
      <div className="mt-3 grid gap-2">
        {examples.map((example) => (
          <div
            key={example.eventType}
            className={`rounded-md border px-3 py-2 text-sm ${
              example.shared
                ? 'border-emerald-500/25 bg-emerald-950/25 text-emerald-100'
                : 'border-amber-400/25 bg-amber-950/25 text-amber-100'
            }`}
          >
            {example.shared ? example.visible : example.hidden}
          </div>
        ))}
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            shouldSharePresenceSignal(state)
              ? 'border-emerald-500/25 bg-emerald-950/25 text-emerald-100'
              : 'border-amber-400/25 bg-amber-950/25 text-amber-100'
          }`}
        >
          {shouldSharePresenceSignal(state)
            ? 'Chef will see: active-now presence.'
            : 'Chef will not see active-now presence.'}
        </div>
      </div>
    </div>
  )
}

function LivePrivacyReceipts({ receipts }: { receipts: LivePrivacyReceipt[] }) {
  return (
    <div className="mt-4 rounded-lg border border-stone-800 bg-stone-950/40 p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase text-stone-400">
        <Shield className="h-3.5 w-3.5" />
        Trust receipt
      </div>
      {receipts.length === 0 ? (
        <p className="mt-2 text-sm text-stone-400">No live privacy decisions recorded yet.</p>
      ) : (
        <div className="mt-3 divide-y divide-stone-800">
          {receipts.slice(0, 6).map((receipt) => (
            <div key={receipt.id} className="flex items-start justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-stone-100">{receipt.signal}</p>
                <p className="text-xs leading-5 text-stone-400">{receipt.detail}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  receipt.outcome === 'shared'
                    ? 'bg-emerald-950 text-emerald-200'
                    : receipt.outcome === 'functional'
                      ? 'bg-brand-950 text-brand-200'
                      : 'bg-amber-950 text-amber-100'
                }`}
              >
                {receipt.outcome === 'shared'
                  ? 'Shared'
                  : receipt.outcome === 'functional'
                    ? 'Action'
                    : 'Private'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function LivePrivacyControlPanel() {
  const { state, isReady, isPrivate, setMode, setSetting, setSurfaceDefault } = useLivePrivacy()
  const [showOnboarding, setShowOnboarding] = useState(false)

  const modeLabel = useMemo(() => {
    if (state.mode === 'private-device') return 'Always private on this device'
    if (state.mode === 'private-session') return 'Private this session'
    return 'Visible'
  }, [state.mode])

  useEffect(() => {
    if (!isReady) return
    try {
      setShowOnboarding(window.localStorage.getItem(ONBOARDING_KEY) !== 'true')
    } catch {
      setShowOnboarding(true)
    }
  }, [isReady])

  const completeOnboarding = useCallback(
    (choice: 'share' | 'sensitive' | 'private') => {
      if (choice === 'share') {
        setMode('visible')
      } else if (choice === 'sensitive') {
        setMode('visible')
        setSurfaceDefault('proposals', 'private')
        setSurfaceDefault('invoices', 'private')
        setSurfaceDefault('payments', 'private')
        setSurfaceDefault('messages', 'inherit')
      } else {
        setMode('private-device')
      }

      try {
        window.localStorage.setItem(ONBOARDING_KEY, 'true')
      } catch {
        // Onboarding dismissal is local convenience only.
      }
      setShowOnboarding(false)
    },
    [setMode, setSurfaceDefault]
  )

  const exportPrivacy = useCallback(() => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      mode: state.mode,
      settings: state.settings,
      surfaceDefaults: state.surfaceDefaults,
      receipts: state.receipts,
    }

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `chefflow-live-privacy-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)

    recordLivePrivacyReceipt({
      signal: 'Privacy export',
      surface: 'documents',
      outcome: 'functional',
      detail: 'ChefFlow exported your local live privacy settings and trust receipts.',
    })
  }, [state])

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

      {showOnboarding ? (
        <div className="mt-4 rounded-lg border border-brand-500/30 bg-brand-950/20 p-3">
          <p className="text-sm font-semibold text-stone-100">Choose your live privacy default</p>
          <p className="mt-1 text-sm leading-6 text-stone-300">
            This only controls passive signals. Payments, approvals, forms, RSVPs, and sent messages
            still work normally.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => completeOnboarding('share')}
              className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-left text-sm text-stone-100 hover:bg-stone-800"
            >
              Share for coordination
            </button>
            <button
              type="button"
              onClick={() => completeOnboarding('sensitive')}
              className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-left text-sm text-stone-100 hover:bg-stone-800"
            >
              Private on sensitive pages
            </button>
            <button
              type="button"
              onClick={() => completeOnboarding('private')}
              className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-left text-sm text-stone-100 hover:bg-stone-800"
            >
              Browse privately by default
            </button>
          </div>
        </div>
      ) : null}

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

      <LivePrivacyPreview state={state} />

      <div className="mt-4 rounded-lg border border-stone-800 bg-stone-950/40 p-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase text-stone-400">
          <Settings className="h-3.5 w-3.5" />
          Per-surface defaults
        </div>
        <div className="mt-3 grid gap-2">
          {SURFACE_ROWS.map((row) => (
            <div
              key={row.key}
              className="flex flex-col gap-2 rounded-md border border-stone-800 bg-stone-900/60 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-100">{row.label}</p>
                <p className="text-xs leading-5 text-stone-400">{row.example}</p>
              </div>
              <div className="flex rounded-md border border-stone-700 bg-stone-950 p-1">
                {(['inherit', 'visible', 'private'] as LivePrivacySurfaceMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSurfaceDefault(row.key, mode)}
                    className={`rounded px-2.5 py-1 text-xs font-medium ${
                      state.surfaceDefaults[row.key] === mode
                        ? 'bg-brand-500 text-white'
                        : 'text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    {mode === 'inherit' ? 'Auto' : mode === 'visible' ? 'Share' : 'Private'}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setLivePrivacySurfacePrivateOnce(row.key)
                    recordLivePrivacyReceipt({
                      signal: `Next ${row.label.toLowerCase()} open`,
                      surface: row.key,
                      outcome: 'private',
                      detail: 'ChefFlow will keep the next passive signal on this surface private.',
                    })
                  }}
                  className="rounded px-2.5 py-1 text-xs font-medium text-stone-300 hover:bg-stone-800"
                >
                  Once
                </button>
              </div>
            </div>
          ))}
        </div>
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

      <LivePrivacyReceipts receipts={state.receipts} />

      <div className="mt-4 flex flex-col gap-2 rounded-lg border border-stone-800 bg-stone-950/40 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-stone-100">Privacy export</p>
          <p className="text-xs leading-5 text-stone-400">
            Export local live privacy settings and trust receipts from this device.
          </p>
        </div>
        <button
          type="button"
          onClick={exportPrivacy}
          className="rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm font-medium text-stone-100 hover:bg-stone-800"
        >
          Export JSON
        </button>
      </div>
    </section>
  )
}
