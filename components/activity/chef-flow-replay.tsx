'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  Eye,
  Filter,
  ListChecks,
  Mail,
  RotateCcw,
  Settings,
  ShieldCheck,
  Users,
} from '@/components/ui/icons'
import { ContextCommandPanel } from '@/components/platform-shell/context-command-panel'
import type { ContextPanelSection } from '@/components/platform-shell/context-panel-types'
import type {
  ChefFlowReplay,
  ReplayActionCategory,
  ReplayActionItem,
  ReplayActionPriority,
  ReplayAuditEntry,
  ReplayChangeDiffCard,
  ReplayClientSignalScore,
  ReplayFollowUpDraft,
  ReplayPeriod,
  ReplayReadinessImpact,
  ReplayResumeCard,
  ReplayRule,
} from '@/lib/activity/replay-model'

type ChefFlowReplayViewProps = {
  replay: ChefFlowReplay
  failedSections: string[]
}

type CatchUpFilter =
  | 'needs-action'
  | 'client'
  | 'money'
  | 'readiness'
  | 'prep'
  | 'handled'
  | 'full-history'

type CatchUpState = {
  handled: string[]
  snoozed: string[]
  disabledRules: string[]
  collapsedSections: string[]
  audit: ReplayAuditEntry[]
}

const STORAGE_KEY = 'cf:catch-up:workspace-state:v1'

const DEFAULT_STATE: CatchUpState = {
  handled: [],
  snoozed: [],
  disabledRules: [],
  collapsedSections: [],
  audit: [],
}

const FILTERS: { id: CatchUpFilter; label: string }[] = [
  { id: 'needs-action', label: 'Needs action' },
  { id: 'client', label: 'Client' },
  { id: 'money', label: 'Money' },
  { id: 'readiness', label: 'Readiness' },
  { id: 'prep', label: 'Prep' },
  { id: 'handled', label: 'Handled' },
  { id: 'full-history', label: 'Full history' },
]

export function ChefFlowReplayView({ replay, failedSections }: ChefFlowReplayViewProps) {
  const hasFailures = failedSections.length > 0
  const hasReplayRows = replay.periods.some((period) => period.items.length > 0)
  const [workspaceState, setWorkspaceState] = useState<CatchUpState>(DEFAULT_STATE)
  const [activeFilter, setActiveFilter] = useState<CatchUpFilter>('needs-action')
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(
    replay.followUpDrafts[0]?.id ?? null
  )
  const [draftBody, setDraftBody] = useState('')
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Partial<CatchUpState>
      setWorkspaceState({
        handled: Array.isArray(parsed.handled) ? parsed.handled : [],
        snoozed: Array.isArray(parsed.snoozed) ? parsed.snoozed : [],
        disabledRules: Array.isArray(parsed.disabledRules) ? parsed.disabledRules : [],
        collapsedSections: Array.isArray(parsed.collapsedSections) ? parsed.collapsedSections : [],
        audit: Array.isArray(parsed.audit) ? parsed.audit : [],
      })
    } catch {
      setWorkspaceState(DEFAULT_STATE)
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaceState))
    } catch {
      // Browser storage is a convenience, not a source of truth.
    }
  }, [workspaceState])

  const selectedDraft = useMemo(
    () => replay.followUpDrafts.find((draft) => draft.id === selectedDraftId) ?? null,
    [replay.followUpDrafts, selectedDraftId]
  )

  useEffect(() => {
    setDraftBody(selectedDraft?.body ?? '')
  }, [selectedDraft])

  const disabledCategories = useMemo(
    () =>
      new Set(
        replay.rules
          .filter((rule) => workspaceState.disabledRules.includes(rule.id))
          .map((rule) => rule.category)
      ),
    [replay.rules, workspaceState.disabledRules]
  )

  const visibleActions = useMemo(
    () =>
      replay.actionDigest.filter((action) =>
        shouldShowAction(action, activeFilter, workspaceState, disabledCategories)
      ),
    [activeFilter, disabledCategories, replay.actionDigest, workspaceState]
  )

  const commandSections: ContextPanelSection[] = [
    {
      id: 'catch-up-inbox',
      title: 'Inbox',
      description:
        visibleActions.length > 0
          ? 'Open, snooze, or handle ranked Catch Up actions.'
          : 'No visible Catch Up actions match the current filter.',
      state: visibleActions.length > 0 ? 'populated' : 'empty',
      metrics: [
        { label: 'Visible', value: visibleActions.length },
        { label: 'Handled', value: workspaceState.handled.length },
      ],
      actions: [{ label: 'Open inbox', href: '#catch-up-inbox' }],
    },
    {
      id: 'catch-up-signals',
      title: 'Signals',
      description: hasFailures
        ? 'Some sources failed, so this view ranks only loaded evidence.'
        : 'Client, readiness, and change signals are ranked from loaded rows.',
      state: hasFailures ? 'error' : hasReplayRows ? 'populated' : 'empty',
      metrics: [
        { label: 'Client scores', value: replay.clientSignalScores.length },
        { label: 'Readiness', value: replay.readinessImpacts.length },
        { label: 'Changes', value: replay.changeDiffCards.length },
      ],
      actions: [{ label: 'Open activity log', href: '/activity' }],
    },
    {
      id: 'catch-up-compose',
      title: 'Composer',
      description:
        replay.followUpDrafts.length > 0
          ? 'Drafts are copy-only and based on real client signals.'
          : 'No client follow-up drafts are currently available.',
      state: replay.followUpDrafts.length > 0 ? 'populated' : 'empty',
      metrics: [{ label: 'Drafts', value: replay.followUpDrafts.length }],
      actions: [{ label: 'Open composer', href: '#follow-up-composer' }],
    },
    {
      id: 'catch-up-rules',
      title: 'Rules',
      description: 'Rules can be paused in this browser without changing source data.',
      state: replay.rules.length > 0 ? 'populated' : 'empty',
      metrics: [{ label: 'Rules', value: replay.rules.length }],
      actions: [{ label: 'Open rules', href: '#catch-up-rules' }],
    },
  ]

  function addAudit(actionLabel: string, detail: string, sourceItemId: string | null) {
    const entry: ReplayAuditEntry = {
      id: `local-${Date.now()}-${workspaceState.audit.length}`,
      actionLabel,
      detail,
      createdAt: new Date().toISOString(),
      sourceItemId,
    }
    setWorkspaceState((state) => ({
      ...state,
      audit: [entry, ...state.audit].slice(0, 20),
    }))
  }

  function markHandled(action: ReplayActionItem) {
    setWorkspaceState((state) => ({
      ...state,
      handled: unique([...state.handled, action.id]),
      snoozed: state.snoozed.filter((id) => id !== action.id),
    }))
    addAudit('Marked handled', action.title, action.id)
  }

  function snooze(action: ReplayActionItem) {
    setWorkspaceState((state) => ({
      ...state,
      snoozed: unique([...state.snoozed, action.id]),
      handled: state.handled.filter((id) => id !== action.id),
    }))
    addAudit('Snoozed', action.title, action.id)
  }

  function restore(action: ReplayActionItem) {
    setWorkspaceState((state) => ({
      ...state,
      handled: state.handled.filter((id) => id !== action.id),
      snoozed: state.snoozed.filter((id) => id !== action.id),
    }))
    addAudit('Restored', action.title, action.id)
  }

  function toggleRule(rule: ReplayRule) {
    const disabled = workspaceState.disabledRules.includes(rule.id)
    setWorkspaceState((state) => ({
      ...state,
      disabledRules: disabled
        ? state.disabledRules.filter((id) => id !== rule.id)
        : unique([...state.disabledRules, rule.id]),
    }))
    addAudit(disabled ? 'Rule resumed' : 'Rule paused', rule.label, rule.id)
  }

  function toggleSection(sectionId: string) {
    setWorkspaceState((state) => {
      const collapsed = state.collapsedSections.includes(sectionId)
      return {
        ...state,
        collapsedSections: collapsed
          ? state.collapsedSections.filter((id) => id !== sectionId)
          : unique([...state.collapsedSections, sectionId]),
      }
    })
  }

  async function copyText(id: string, value: string, auditLabel: string) {
    setCopyError(null)
    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus(id)
      addAudit(auditLabel, 'Copied to clipboard', id)
      window.setTimeout(() => setCopyStatus((current) => (current === id ? null : current)), 1800)
    } catch {
      setCopyError('Clipboard access failed. Select the text and copy it manually.')
    }
  }

  const auditTrail = [...workspaceState.audit, ...replay.auditTrail].slice(0, 12)

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <p className="text-xxs font-semibold uppercase tracking-[0.2em] text-brand-400">
            Catch Up
          </p>
          <h1 className="mt-2 text-2xl font-bold text-stone-100">Start with what changed</h1>
          <p className="mt-2 max-w-3xl text-sm text-stone-400">
            A source-backed work inbox for resume points, client intent, readiness changes, drafts,
            team handoff notes, rules, and audit history.
          </p>
        </div>
        {hasFailures && (
          <div
            role="alert"
            className="rounded-lg border border-amber-700/70 bg-amber-950/30 p-4 text-sm text-amber-100"
          >
            <p className="font-semibold text-amber-50">Catch Up is partially loaded</p>
            <p className="mt-1 text-amber-100/80">
              Could not load {failedSections.join(', ')}. Available sections remain visible.
            </p>
          </div>
        )}
      </header>

      <section className="rounded-lg border border-stone-800 bg-stone-950/70 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Morning Catch Up
            </p>
            <h2 className="mt-1 text-xl font-semibold text-stone-100">
              {replay.dailyStart.headline}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-stone-400">{replay.dailyStart.focus}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {replay.dailyStart.nextHref ? (
              <Button href={replay.dailyStart.nextHref} variant="primary" size="sm">
                <Eye className="h-4 w-4" />
                Open Focus
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => copyText('digest', replay.catchUpDigest.body, 'Digest copied')}
            >
              <Mail className="h-4 w-4" />
              {copyStatus === 'digest' ? 'Copied' : 'Copy Digest'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => copyText('handoff', replay.handoff.body, 'Handoff copied')}
            >
              <Users className="h-4 w-4" />
              {copyStatus === 'handoff' ? 'Copied' : 'Copy Handoff'}
            </Button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MetricTile label="Urgent" value={replay.dailyStart.counts.urgent} tone="urgent" />
          <MetricTile label="High" value={replay.dailyStart.counts.high} tone="high" />
          <MetricTile label="Normal" value={replay.dailyStart.counts.normal} tone="normal" />
        </div>
        {copyError ? <p className="mt-3 text-xs text-red-300">{copyError}</p> : null}
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReplayMetric label="Resume items" value={replay.resumeCount} />
        <ReplayMetric label="Chef actions" value={replay.chefActionCount} />
        <ReplayMetric label="Client signals" value={replay.clientSignalCount} />
        <ReplayMetric label="Retrace sessions" value={replay.retraceSessionCount} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <CollapsibleSection
            id="catch-up-inbox"
            title="Catch Up Inbox"
            description="Ranked actions from source data. Handle and snooze states stay in this browser."
            collapsed={workspaceState.collapsedSections.includes('catch-up-inbox')}
            onToggle={() => toggleSection('catch-up-inbox')}
          >
            <div className="flex flex-wrap gap-2 border-b border-stone-800 px-4 py-3">
              <Filter className="mt-2 h-4 w-4 text-stone-500" />
              {FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    activeFilter === filter.id
                      ? 'bg-brand-600 text-white'
                      : 'bg-stone-900 text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            {visibleActions.length > 0 ? (
              <div className="divide-y divide-stone-800">
                {visibleActions.map((action) => (
                  <ActionRow
                    key={action.id}
                    action={action}
                    handled={workspaceState.handled.includes(action.id)}
                    snoozed={workspaceState.snoozed.includes(action.id)}
                    onHandled={() => markHandled(action)}
                    onSnooze={() => snooze(action)}
                    onRestore={() => restore(action)}
                  />
                ))}
              </div>
            ) : (
              <EmptyBlock message="No actions match this filter." />
            )}
          </CollapsibleSection>

          <div className="grid gap-6 lg:grid-cols-2">
            <CollapsibleSection
              id="client-signal-scores"
              title="Client Signal Scores"
              description="Scores use only loaded portal events and known client IDs."
              collapsed={workspaceState.collapsedSections.includes('client-signal-scores')}
              onToggle={() => toggleSection('client-signal-scores')}
            >
              {replay.clientSignalScores.length > 0 ? (
                <div className="divide-y divide-stone-800">
                  {replay.clientSignalScores.map((score) => (
                    <ClientSignalRow key={score.id} score={score} />
                  ))}
                </div>
              ) : (
                <EmptyBlock message="No known-client signal scores are available." />
              )}
            </CollapsibleSection>

            <CollapsibleSection
              id="readiness-impact"
              title="Readiness Impact Detector"
              description="Prep, event, safety, and menu changes that may affect execution."
              collapsed={workspaceState.collapsedSections.includes('readiness-impact')}
              onToggle={() => toggleSection('readiness-impact')}
            >
              {replay.readinessImpacts.length > 0 ? (
                <div className="divide-y divide-stone-800">
                  {replay.readinessImpacts.map((impact) => (
                    <ReadinessRow key={impact.id} impact={impact} />
                  ))}
                </div>
              ) : (
                <EmptyBlock message="No readiness impacts detected from loaded data." />
              )}
            </CollapsibleSection>
          </div>

          <CollapsibleSection
            id="changed-since-last-time"
            title="Changed Since Last Time"
            description="Entities with multiple tracked updates in the loaded week."
            collapsed={workspaceState.collapsedSections.includes('changed-since-last-time')}
            onToggle={() => toggleSection('changed-since-last-time')}
          >
            {replay.changeDiffCards.length > 0 ? (
              <div className="grid gap-3 p-4 lg:grid-cols-2">
                {replay.changeDiffCards.map((card) => (
                  <DiffCard key={card.id} card={card} />
                ))}
              </div>
            ) : (
              <EmptyBlock message="No repeated entity changes are available for diff cards." />
            )}
          </CollapsibleSection>

          <CollapsibleSection
            id="follow-up-composer"
            title="Follow-Up Composer"
            description="Copy-only drafts from client signals. ChefFlow does not send these automatically."
            collapsed={workspaceState.collapsedSections.includes('follow-up-composer')}
            onToggle={() => toggleSection('follow-up-composer')}
          >
            <FollowUpComposer
              drafts={replay.followUpDrafts}
              selectedDraftId={selectedDraftId}
              draftBody={draftBody}
              copyStatus={copyStatus}
              onSelect={setSelectedDraftId}
              onBodyChange={setDraftBody}
              onCopy={(draft) => copyText(draft.id, draftBody, 'Follow-up draft copied')}
            />
          </CollapsibleSection>

          <div className="grid gap-6 lg:grid-cols-2">
            <CollapsibleSection
              id="catch-up-rules"
              title="Catch Up Rules"
              description="Pause a rule to hide matching action categories in this browser."
              collapsed={workspaceState.collapsedSections.includes('catch-up-rules')}
              onToggle={() => toggleSection('catch-up-rules')}
            >
              <div className="divide-y divide-stone-800">
                {replay.rules.map((rule) => (
                  <RuleRow
                    key={rule.id}
                    rule={rule}
                    disabled={workspaceState.disabledRules.includes(rule.id)}
                    onToggle={() => toggleRule(rule)}
                  />
                ))}
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              id="catch-up-audit"
              title="Catch Up Audit Trail"
              description="Generated actions plus local handle, snooze, copy, and rule events."
              collapsed={workspaceState.collapsedSections.includes('catch-up-audit')}
              onToggle={() => toggleSection('catch-up-audit')}
            >
              <div className="divide-y divide-stone-800">
                {auditTrail.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
              </div>
            </CollapsibleSection>
          </div>

          <CollapsibleSection
            id="resume-now"
            title="Resume Cards"
            description="The strongest source-backed resume points from operational tables."
            collapsed={workspaceState.collapsedSections.includes('resume-now')}
            onToggle={() => toggleSection('resume-now')}
          >
            {replay.resumeCards.length > 0 ? (
              <div className="divide-y divide-stone-800">
                {replay.resumeCards.map((card) => (
                  <ResumeCardRow key={card.id} card={card} />
                ))}
              </div>
            ) : (
              <EmptyBlock message="No resume items are currently available." />
            )}
          </CollapsibleSection>

          <CollapsibleSection
            id="replay-by-day"
            title="Full Activity History"
            description="Today, yesterday, and earlier this week grouped from loaded rows."
            collapsed={workspaceState.collapsedSections.includes('replay-by-day')}
            onToggle={() => toggleSection('replay-by-day')}
          >
            <div className="space-y-4 p-4">
              {replay.periods.map((period) => (
                <ReplayPeriodSection key={period.id} period={period} />
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            id="team-handoff"
            title="Team Handoff Mode"
            description="Copy a concise handoff note for staff or a future shift."
            collapsed={workspaceState.collapsedSections.includes('team-handoff')}
            onToggle={() => toggleSection('team-handoff')}
          >
            <div className="space-y-3 p-4">
              <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
                <p className="text-sm font-semibold text-stone-200">{replay.handoff.title}</p>
                <ul className="mt-2 space-y-1 text-sm text-stone-400">
                  {replay.handoff.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => copyText('handoff-section', replay.handoff.body, 'Handoff copied')}
              >
                <Copy className="h-4 w-4" />
                {copyStatus === 'handoff-section' ? 'Copied' : 'Copy Handoff'}
              </Button>
            </div>
          </CollapsibleSection>
        </div>

        <ContextCommandPanel
          family="activity"
          title="Catch Up command"
          subtitle="Inbox, signals, drafts, handoff, rules, and audit from existing sources."
          statusChips={[
            {
              label: hasFailures ? 'Partial' : 'Loaded',
              tone: hasFailures ? 'warning' : 'success',
            },
            { label: '7 days', tone: 'info' },
          ]}
          sections={commandSections}
        />
      </div>
    </div>
  )
}

function CollapsibleSection({
  id,
  title,
  description,
  collapsed,
  onToggle,
  children,
}: {
  id: string
  title: string
  description: string
  collapsed: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-6 rounded-lg border border-stone-800 bg-stone-950/60">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 border-b border-stone-800 px-4 py-3 text-left transition-colors hover:bg-stone-900/60"
        aria-expanded={!collapsed}
        aria-controls={`${id}-panel`}
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-stone-200">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-stone-500">{description}</span>
        </span>
        {collapsed ? (
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-stone-500" />
        ) : (
          <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-stone-500" />
        )}
      </button>
      {!collapsed ? <div id={`${id}-panel`}>{children}</div> : null}
    </section>
  )
}

function ActionRow({
  action,
  handled,
  snoozed,
  onHandled,
  onSnooze,
  onRestore,
}: {
  action: ReplayActionItem
  handled: boolean
  snoozed: boolean
  onHandled: () => void
  onSnooze: () => void
  onRestore: () => void
}) {
  return (
    <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={action.priority} />
          <Badge variant="info" className="rounded-md px-2 py-0.5 text-xxs">
            {categoryLabel(action.category)}
          </Badge>
          {handled ? <Badge variant="success">Handled</Badge> : null}
          {snoozed ? <Badge variant="warning">Snoozed</Badge> : null}
        </div>
        <p className="mt-2 text-sm font-semibold text-stone-100">{action.title}</p>
        <p className="mt-1 text-sm text-stone-400">{action.detail}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {action.href ? (
          <Button href={action.href} variant="secondary" size="sm">
            Open
          </Button>
        ) : null}
        {handled || snoozed ? (
          <Button type="button" variant="ghost" size="sm" onClick={onRestore}>
            <RotateCcw className="h-4 w-4" />
            Restore
          </Button>
        ) : (
          <>
            <Button type="button" variant="secondary" size="sm" onClick={onSnooze}>
              Snooze
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={onHandled}>
              <Check className="h-4 w-4" />
              Mark Handled
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function ClientSignalRow({ score }: { score: ReplayClientSignalScore }) {
  return (
    <Link
      href={score.href}
      className="block px-4 py-3 transition-colors hover:bg-stone-900"
      aria-label={`Open ${score.label}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-stone-100">{score.label}</p>
          <p className="mt-1 text-xs text-stone-500">{score.detail}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold text-stone-100">{score.score}</p>
          <Badge variant={score.level === 'hot' ? 'error' : score.level === 'warm' ? 'warning' : 'default'}>
            {score.level}
          </Badge>
        </div>
      </div>
    </Link>
  )
}

function ReadinessRow({ impact }: { impact: ReplayReadinessImpact }) {
  const content = (
    <div className="px-4 py-3 transition-colors hover:bg-stone-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-brand-400" />
            <PriorityBadge priority={impact.severity} />
          </div>
          <p className="mt-2 text-sm font-semibold text-stone-100">{impact.title}</p>
          <p className="mt-1 text-sm text-stone-400">{impact.detail}</p>
        </div>
        <span className="shrink-0 rounded-full border border-stone-700 px-2.5 py-1 text-xs text-stone-400">
          {impact.sourceCount}
        </span>
      </div>
    </div>
  )

  return impact.href ? <Link href={impact.href}>{content}</Link> : content
}

function DiffCard({ card }: { card: ReplayChangeDiffCard }) {
  const content = (
    <div className="h-full rounded-lg border border-stone-800 bg-stone-900/60 p-3 transition-colors hover:border-stone-700">
      <p className="text-sm font-semibold text-stone-100">{card.title}</p>
      <p className="mt-2 text-xs text-stone-500">{card.detail}</p>
      <div className="mt-3 grid gap-2">
        <div className="rounded border border-stone-800 bg-stone-950/60 p-2">
          <p className="text-xxs uppercase tracking-wide text-stone-600">Earlier</p>
          <p className="mt-1 text-xs text-stone-300">{card.beforeLabel}</p>
        </div>
        <div className="rounded border border-brand-900/70 bg-brand-950/30 p-2">
          <p className="text-xxs uppercase tracking-wide text-brand-500">Latest</p>
          <p className="mt-1 text-xs text-stone-200">{card.afterLabel}</p>
        </div>
      </div>
    </div>
  )

  return card.href ? <Link href={card.href}>{content}</Link> : content
}

function FollowUpComposer({
  drafts,
  selectedDraftId,
  draftBody,
  copyStatus,
  onSelect,
  onBodyChange,
  onCopy,
}: {
  drafts: ReplayFollowUpDraft[]
  selectedDraftId: string | null
  draftBody: string
  copyStatus: string | null
  onSelect: (id: string) => void
  onBodyChange: (value: string) => void
  onCopy: (draft: ReplayFollowUpDraft) => void
}) {
  const selectedDraft = drafts.find((draft) => draft.id === selectedDraftId) ?? null

  if (drafts.length === 0) return <EmptyBlock message="No client follow-up drafts are available." />

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="space-y-2">
        {drafts.map((draft) => (
          <button
            key={draft.id}
            type="button"
            onClick={() => onSelect(draft.id)}
            className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
              selectedDraftId === draft.id
                ? 'border-brand-700 bg-brand-950/40'
                : 'border-stone-800 bg-stone-900/50 hover:bg-stone-900'
            }`}
          >
            <span className="flex items-center gap-2 text-xs font-semibold text-stone-200">
              <Mail className="h-4 w-4 text-brand-400" />
              {draft.title}
            </span>
            <span className="mt-1 block text-xs text-stone-500">{draft.channel}</span>
          </button>
        ))}
      </div>
      <div className="space-y-3">
        <textarea
          value={draftBody}
          onChange={(event) => onBodyChange(event.target.value)}
          className="min-h-60 w-full rounded-lg border border-stone-800 bg-stone-950 p-3 text-sm leading-6 text-stone-200 outline-none focus:border-brand-700 focus:ring-2 focus:ring-brand-900"
          aria-label="Follow-up draft body"
        />
        <div className="flex flex-wrap gap-2">
          {selectedDraft?.href ? (
            <Button href={selectedDraft.href} variant="secondary" size="sm">
              Open Client
            </Button>
          ) : null}
          {selectedDraft ? (
            <Button type="button" variant="primary" size="sm" onClick={() => onCopy(selectedDraft)}>
              <Copy className="h-4 w-4" />
              {copyStatus === selectedDraft.id ? 'Copied' : 'Copy Draft'}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function RuleRow({
  rule,
  disabled,
  onToggle,
}: {
  rule: ReplayRule
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Settings className="h-4 w-4 text-stone-500" />
          <p className="text-sm font-semibold text-stone-100">{rule.label}</p>
          <PriorityBadge priority={rule.priority} />
          {disabled ? <Badge variant="warning">Paused</Badge> : null}
        </div>
        <p className="mt-1 text-sm text-stone-400">{rule.description}</p>
        <p className="mt-1 text-xs text-stone-500">
          {rule.matchCount} match{rule.matchCount === 1 ? '' : 'es'}
        </p>
      </div>
      <Button type="button" variant={disabled ? 'primary' : 'secondary'} size="sm" onClick={onToggle}>
        {disabled ? 'Resume' : 'Pause'}
      </Button>
    </div>
  )
}

function AuditRow({ entry }: { entry: ReplayAuditEntry }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-3">
        <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-200">{entry.actionLabel}</p>
          <p className="mt-1 text-sm text-stone-500">{entry.detail}</p>
          <p className="mt-1 text-xs text-stone-600">{formatReplayTime(entry.createdAt)}</p>
        </div>
      </div>
    </div>
  )
}

function ResumeCardRow({ card }: { card: ReplayResumeCard }) {
  return (
    <Link href={card.href} className="block px-4 py-3 transition-colors hover:bg-stone-900">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ListChecks className="h-4 w-4 text-brand-400" />
            <PriorityBadge priority={card.priority} />
            <Badge variant="default">{card.type}</Badge>
          </div>
          <p className="mt-2 truncate text-sm font-medium text-stone-200">{card.title}</p>
          <p className="mt-1 truncate text-xs text-stone-500">{card.subtitle}</p>
        </div>
        <span className="shrink-0 text-xs font-medium text-brand-400">{card.recommendedAction}</span>
      </div>
    </Link>
  )
}

function ReplayPeriodSection({ period }: { period: ReplayPeriod }) {
  const total = period.chefActionCount + period.clientSignalCount

  return (
    <section className="rounded-lg border border-stone-800 bg-stone-950/60">
      <div className="flex items-center justify-between gap-4 border-b border-stone-800 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-200">{period.label}</h3>
          <p className="mt-1 text-xs text-stone-500">
            {period.chefActionCount} chef action{period.chefActionCount === 1 ? '' : 's'} and{' '}
            {period.clientSignalCount} client signal{period.clientSignalCount === 1 ? '' : 's'}
          </p>
        </div>
        <span className="rounded-full border border-stone-700 px-2.5 py-1 text-xs text-stone-400">
          {total}
        </span>
      </div>
      {period.items.length > 0 ? (
        <div className="divide-y divide-stone-800">
          {period.items.map((item) => (
            <div key={item.id} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xxs font-semibold ${
                    item.source === 'client'
                      ? 'bg-brand-950 text-brand-300'
                      : 'bg-emerald-950 text-emerald-300'
                  }`}
                >
                  {item.source === 'client' ? 'Client' : item.domainLabel}
                </span>
                <div className="min-w-0 flex-1">
                  {item.href ? (
                    <Link href={item.href} className="text-sm text-stone-200 hover:text-brand-300">
                      {item.label}
                    </Link>
                  ) : (
                    <p className="text-sm text-stone-200">{item.label}</p>
                  )}
                  {item.detail ? (
                    <p className="mt-1 truncate text-xs text-stone-500">{item.detail}</p>
                  ) : null}
                </div>
                <time dateTime={item.createdAt} className="shrink-0 text-xs text-stone-500">
                  {formatReplayTime(item.createdAt)}
                </time>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyBlock message="No activity rows loaded for this period." />
      )}
    </section>
  )
}

function ReplayMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950/60 px-4 py-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-stone-100">{value}</p>
    </div>
  )
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: ReplayActionPriority
}) {
  const toneClass =
    tone === 'urgent'
      ? 'border-red-900/70 bg-red-950/30 text-red-200'
      : tone === 'high'
        ? 'border-amber-900/70 bg-amber-950/30 text-amber-200'
        : 'border-stone-800 bg-stone-900/60 text-stone-200'

  return (
    <div className={`rounded-lg border px-3 py-3 ${toneClass}`}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}

function PriorityBadge({ priority }: { priority: ReplayActionPriority }) {
  return (
    <Badge
      variant={priority === 'urgent' ? 'error' : priority === 'high' ? 'warning' : 'default'}
      className="rounded-md px-2 py-0.5 text-xxs"
    >
      {priority}
    </Badge>
  )
}

function EmptyBlock({ message }: { message: string }) {
  return <p className="px-4 py-6 text-sm text-stone-500">{message}</p>
}

function shouldShowAction(
  action: ReplayActionItem,
  filter: CatchUpFilter,
  state: CatchUpState,
  disabledCategories: Set<ReplayActionCategory>
): boolean {
  const handled = state.handled.includes(action.id)
  const snoozed = state.snoozed.includes(action.id)
  const disabled = disabledCategories.has(action.category)

  if (filter === 'handled') return handled
  if (filter === 'full-history') return true
  if (handled || snoozed || disabled) return false
  if (filter === 'needs-action') return true
  if (filter === 'client') return action.category === 'client' || action.category === 'communication'
  if (filter === 'money') return action.category === 'money'
  if (filter === 'readiness') return action.category === 'readiness'
  if (filter === 'prep') return action.category === 'prep'
  return true
}

function categoryLabel(category: ReplayActionCategory): string {
  if (category === 'communication') return 'Comms'
  return category
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values))
}

function formatReplayTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
