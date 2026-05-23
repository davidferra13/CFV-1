'use client'

import {
  AlertTriangle,
  Accessibility,
  BellOff,
  BookOpen,
  CalendarCheck,
  Camera,
  CheckSquare,
  Command,
  Download,
  FileText,
  Gift,
  HelpCircle,
  ImagePlus,
  Link2,
  ListPlus,
  MapPinned,
  Megaphone,
  MoreHorizontal,
  Palette,
  Printer,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Table2,
  Timer,
  Utensils,
  UserPlus,
  Users as UsersIcon,
  X,
  MessageSquarePlus,
} from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import {
  groupDinnerCircleActions,
  resolveDinnerCircleActions,
  searchDinnerCircleActions,
  type DinnerCircleActionId,
  type DinnerCircleActionPermissions,
  type DinnerCircleActionRole,
  type DinnerCircleResolvedAction,
} from '@/lib/dinner-circles/action-surface'

type DinnerCircleActionDrawerProps = {
  circleId: string
  viewerRole: DinnerCircleActionRole
  permissions?: DinnerCircleActionPermissions
  actionLinks?: Partial<Record<DinnerCircleActionId, string>>
  onAction?: (action: DinnerCircleResolvedAction) => void
  className?: string
}

const RECENT_LIMIT = 5

const ACTION_ICONS: Record<DinnerCircleActionId, typeof MessageSquarePlus> = {
  post_update: MessageSquarePlus,
  upload_photo: ImagePlus,
  share_link: Link2,
  rsvp: CalendarCheck,
  dietary_update: Utensils,
  accommodation_update: Accessibility,
  bring_list: ListPlus,
  set_theme: Palette,
  vote_poll: CheckSquare,
  ask_question: HelpCircle,
  attendee_profiles: UsersIcon,
  seating_plan: Table2,
  concierge_qa: HelpCircle,
  celebration_board: Gift,
  menu_reveal: Sparkles,
  itinerary: Route,
  weather_backup: MapPinned,
  live_status: Timer,
  digest_controls: FileText,
  event_packet: Download,
  collaborator_access: ShieldCheck,
  memory_album: Camera,
  growth_actions: Star,
  visual_intake: ImagePlus,
  report_change: AlertTriangle,
  invite_member: UserPlus,
  broadcast: Megaphone,
  view_guide: BookOpen,
  print_share: Printer,
  mute_notifications: BellOff,
  privacy_settings: ShieldCheck,
}

export function DinnerCircleActionDrawer({
  circleId,
  viewerRole,
  permissions,
  actionLinks,
  onAction,
  className,
}: DinnerCircleActionDrawerProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [recentActionIds, setRecentActionIds] = useState<DinnerCircleActionId[]>([])
  const [announcement, setAnnouncement] = useState('')
  const drawerTitleId = useId()
  const paletteTitleId = useId()
  const drawerSearchRef = useRef<HTMLInputElement>(null)
  const paletteInputRef = useRef<HTMLInputElement>(null)
  const moreButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setRecentActionIds(readRecentActions(circleId))
  }, [circleId])

  const actions = useMemo(
    () =>
      resolveDinnerCircleActions({
        role: viewerRole,
        permissions,
        recentActionIds,
        includeUnavailable: true,
      }),
    [permissions, recentActionIds, viewerRole]
  )

  const permittedActions = useMemo(() => actions.filter((action) => action.permitted), [actions])
  const drawerGroups = useMemo(() => groupDinnerCircleActions(actions), [actions])
  const recentActions = useMemo(
    () =>
      recentActionIds
        .map((id) => permittedActions.find((action) => action.id === id))
        .filter((action): action is DinnerCircleResolvedAction => Boolean(action)),
    [permittedActions, recentActionIds]
  )
  const commandResults = useMemo(() => searchDinnerCircleActions(actions, query), [actions, query])

  const primaryAction =
    permittedActions.find((action) => action.id === 'post_update') ?? permittedActions[0]

  const dockActions = useMemo(() => {
    return permittedActions
      .filter((action) => action.dockPriority)
      .sort((a, b) => (a.dockPriority ?? 99) - (b.dockPriority ?? 99))
      .slice(0, 4)
  }, [permittedActions])

  useEffect(() => {
    if (drawerOpen) {
      const timeout = window.setTimeout(() => drawerSearchRef.current?.focus(), 0)
      return () => window.clearTimeout(timeout)
    }
    return undefined
  }, [drawerOpen])

  useEffect(() => {
    if (paletteOpen) {
      const timeout = window.setTimeout(() => paletteInputRef.current?.focus(), 0)
      return () => window.clearTimeout(timeout)
    }
    return undefined
  }, [paletteOpen])

  useEffect(() => {
    if (!drawerOpen && !paletteOpen) return undefined

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setDrawerOpen(false)
        setPaletteOpen(false)
        setQuery('')
        moreButtonRef.current?.focus()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawerOpen, paletteOpen])

  useEffect(() => {
    setActiveIndex(0)
  }, [commandResults.length])

  function chooseAction(action: DinnerCircleResolvedAction) {
    if (!action.permitted) return

    const nextRecent = rememberRecentAction(circleId, action.id)
    setRecentActionIds(nextRecent)
    setAnnouncement(`${action.label} selected`)
    onAction?.(action)

    window.dispatchEvent(
      new CustomEvent('dinner-circle-action', {
        detail: { circleId, actionId: action.id },
      })
    )

    const href = actionLinks?.[action.id]
    if (href && !onAction) window.location.assign(href)

    setDrawerOpen(false)
    setPaletteOpen(false)
    setQuery('')
  }

  function onCommandKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, Math.max(commandResults.length - 1, 0)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const selected = commandResults[activeIndex]
      if (selected) chooseAction(selected)
    }
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {primaryAction && (
            <ActionButton
              action={primaryAction}
              variant="primary"
              onSelect={() => chooseAction(primaryAction)}
            />
          )}
          <button
            ref={moreButtonRef}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-10 min-w-0 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>More</span>
          </button>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={paletteOpen}
            onClick={() => setPaletteOpen(true)}
            className="inline-flex h-10 min-w-0 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Search</span>
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-command flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Close action drawer"
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={drawerTitleId}
            className="relative mb-2 max-h-[86vh] w-[calc(100vw-1rem)] max-w-2xl overflow-hidden rounded-xl border bg-card shadow-2xl sm:mb-0"
          >
            <div className="flex items-start justify-between gap-3 border-b p-4">
              <div className="min-w-0">
                <h2 id={drawerTitleId} className="text-base font-semibold">
                  Dinner Circle actions
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Showing actions available to your circle role.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close action drawer"
                onClick={() => setDrawerOpen(false)}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="border-b p-4">
              <label className="sr-only" htmlFor={`${drawerTitleId}-search`}>
                Search Dinner Circle actions
              </label>
              <div className="flex items-center gap-2 rounded-md border px-3">
                <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <input
                  ref={drawerSearchRef}
                  id={`${drawerTitleId}-search`}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={onCommandKeyDown}
                  className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
                  placeholder="Search permitted actions"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="max-h-[58vh] overflow-y-auto p-4">
              {query.trim() ? (
                <CommandResults
                  actions={commandResults}
                  activeIndex={activeIndex}
                  query={query}
                  onActiveIndex={setActiveIndex}
                  onSelect={chooseAction}
                />
              ) : (
                <div className="space-y-5">
                  {recentActions.length > 0 && (
                    <ActionGroup
                      label="Recent"
                      description="Actions used recently on this device."
                      actions={recentActions}
                      onSelect={chooseAction}
                    />
                  )}
                  {drawerGroups.map((group) => (
                    <ActionGroup
                      key={group.id}
                      label={group.label}
                      description={group.description}
                      actions={group.actions}
                      onSelect={chooseAction}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {paletteOpen && (
        <div className="fixed inset-0 z-command flex items-start justify-center px-3 pt-[12vh]">
          <button
            type="button"
            aria-label="Close command palette"
            className="absolute inset-0 bg-black/50"
            onClick={() => setPaletteOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={paletteTitleId}
            className="relative w-full max-w-xl overflow-hidden rounded-xl border bg-card shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <Command className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h2 id={paletteTitleId} className="sr-only">
                Dinner Circle command palette
              </h2>
              <input
                ref={paletteInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onCommandKeyDown}
                className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Search Dinner Circle actions"
                aria-label="Search Dinner Circle actions"
                aria-controls={`${paletteTitleId}-results`}
                autoComplete="off"
              />
              <button
                type="button"
                aria-label="Close command palette"
                onClick={() => setPaletteOpen(false)}
                className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div id={`${paletteTitleId}-results`} className="max-h-[54vh] overflow-y-auto p-2">
              <CommandResults
                actions={commandResults}
                activeIndex={activeIndex}
                query={query}
                onActiveIndex={setActiveIndex}
                onSelect={chooseAction}
              />
            </div>
          </section>
        </div>
      )}

      {dockActions.length > 0 && (
        <nav
          aria-label="Common Dinner Circle actions"
          className="fixed inset-x-2 bottom-2 z-40 rounded-xl border bg-card/95 p-2 shadow-xl backdrop-blur sm:hidden"
        >
          <div className="grid grid-cols-4 gap-1">
            {dockActions.map((action) => (
              <DockButton key={action.id} action={action} onSelect={() => chooseAction(action)} />
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

function ActionGroup({
  label,
  description,
  actions,
  onSelect,
}: {
  label: string
  description: string
  actions: DinnerCircleResolvedAction[]
  onSelect: (action: DinnerCircleResolvedAction) => void
}) {
  return (
    <section aria-label={label} className="space-y-2">
      <div className="min-w-0">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {actions.map((action) => (
          <ActionCard key={action.id} action={action} onSelect={() => onSelect(action)} />
        ))}
      </div>
    </section>
  )
}

function CommandResults({
  actions,
  activeIndex,
  query,
  onActiveIndex,
  onSelect,
}: {
  actions: DinnerCircleResolvedAction[]
  activeIndex: number
  query: string
  onActiveIndex: (index: number) => void
  onSelect: (action: DinnerCircleResolvedAction) => void
}) {
  if (actions.length === 0) {
    return (
      <p className="px-3 py-8 text-center text-sm text-muted-foreground">
        No permitted actions{query.trim() ? ` for "${query.trim()}"` : ''}.
      </p>
    )
  }

  return (
    <div role="listbox" aria-label="Permitted Dinner Circle actions" className="space-y-1">
      {actions.map((action, index) => {
        const Icon = ACTION_ICONS[action.id]
        const active = index === activeIndex
        return (
          <button
            key={action.id}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onSelect(action)}
            onMouseEnter={() => onActiveIndex(index)}
            className={`flex w-full min-w-0 items-center gap-3 rounded-md px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              active ? 'bg-brand-600/15' : 'hover:bg-muted'
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{action.label}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {action.description}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ActionCard({
  action,
  onSelect,
}: {
  action: DinnerCircleResolvedAction
  onSelect: () => void
}) {
  const Icon = ACTION_ICONS[action.id]
  return (
    <button
      type="button"
      disabled={!action.permitted}
      aria-disabled={!action.permitted}
      title={action.disabledReason}
      onClick={onSelect}
      className="flex min-w-0 items-start gap-3 rounded-lg border bg-background p-3 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{action.label}</span>
          {action.isRecent && (
            <span className="shrink-0 rounded-full bg-brand-600/10 px-2 py-0.5 text-[11px] text-brand-700">
              Recent
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
          {action.disabledReason ?? action.description}
        </span>
      </span>
    </button>
  )
}

function ActionButton({
  action,
  variant,
  onSelect,
}: {
  action: DinnerCircleResolvedAction
  variant: 'primary' | 'secondary'
  onSelect: () => void
}) {
  const Icon = ACTION_ICONS[action.id]
  const className =
    variant === 'primary' ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border hover:bg-muted'

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`inline-flex h-10 min-w-0 items-center gap-2 rounded-md px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${className}`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{action.label}</span>
    </button>
  )
}

function DockButton({
  action,
  onSelect,
}: {
  action: DinnerCircleResolvedAction
  onSelect: () => void
}) {
  const Icon = ACTION_ICONS[action.id]
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="w-full truncate text-center leading-none">{action.label}</span>
    </button>
  )
}

function readRecentActions(circleId: string): DinnerCircleActionId[] {
  if (typeof window === 'undefined') return []
  try {
    const value = window.localStorage.getItem(recentKey(circleId))
    if (!value) return []
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? (parsed.slice(0, RECENT_LIMIT) as DinnerCircleActionId[]) : []
  } catch {
    return []
  }
}

function rememberRecentAction(
  circleId: string,
  actionId: DinnerCircleActionId
): DinnerCircleActionId[] {
  const next = [actionId, ...readRecentActions(circleId).filter((id) => id !== actionId)].slice(
    0,
    RECENT_LIMIT
  )

  try {
    window.localStorage.setItem(recentKey(circleId), JSON.stringify(next))
  } catch {
    return next
  }

  return next
}

function recentKey(circleId: string) {
  return `dinner-circle:${circleId}:recent-actions`
}
