import Link from 'next/link'
import {
  AlertTriangle,
  Archive,
  Brain,
  CheckCircle,
  Edit3,
  Filter,
  Lightbulb,
  Lock,
  Search,
  Shield,
} from '@/components/ui/icons'
import {
  addRemyDecisionMemoryAction,
  archiveRemyDecisionMemoryAction,
  updateRemyDecisionMemoryAction,
} from '@/lib/remy/operating-hub-actions'
import type { RemyHubCard, RemyHubUrgency, RemyOperatingHubData } from '@/lib/remy/operating-hub'
import {
  RemySimulationMode,
  RemyVoiceMemoIntake,
} from '@/components/remy/remy-voice-simulation-client'

const MEMORY_CATEGORIES = [
  'chef_preference',
  'client_insight',
  'business_rule',
  'communication_style',
  'culinary_note',
  'scheduling_pattern',
  'pricing_pattern',
  'workflow_preference',
] as const

export function RemyOperatingHub({
  data,
  query,
  domain,
  urgency,
}: {
  data: RemyOperatingHubData
  query: string
  domain: string
  urgency: string
}) {
  const briefing = filterCards(data.briefing, domain, urgency)
  const followUps = filterCards(data.followUpRadar, domain, urgency)
  const inbox = filterCards(data.inboxTriage, domain, urgency)
  const approvals = filterCards(data.approvalCenter, domain, urgency)
  const patterns = filterCards(data.patterns, domain, urgency)

  return (
    <div className="min-h-full overflow-y-auto bg-stone-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 p-4 lg:p-6">
        <header className="flex flex-col gap-4 border-b border-stone-800 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">
              Remy operating layer
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-stone-100">
              Briefing, radar, approvals, and memory
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-stone-400">
              Built from tenant-scoped records where available. Empty and unavailable states are
              shown honestly; this hub does not send, approve, or mutate business records without
              explicit chef action.
            </p>
          </div>
          <form className="flex w-full max-w-md items-center gap-2" action="/remy/operating">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-500" />
              <input
                name="q"
                defaultValue={query}
                className="w-full rounded-md border border-stone-800 bg-stone-900 py-2 pl-9 pr-3 text-sm text-stone-100 outline-none focus:border-brand-500"
                placeholder="Ask the business..."
              />
            </div>
            <button className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500">
              Search
            </button>
          </form>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-stone-500" />
          {[
            'all',
            'calendar',
            'pipeline',
            'quotes',
            'inbox',
            'approvals',
            'operations',
            'safety',
          ].map((value) => (
            <FilterLink
              key={value}
              label={value}
              href={filterHref(query, value === 'all' ? '' : value, urgency)}
              active={(domain || 'all') === value}
            />
          ))}
          {(['critical', 'high', 'medium', 'low'] as RemyHubUrgency[]).map((value) => (
            <FilterLink
              key={value}
              label={value}
              href={filterHref(query, domain, urgency === value ? '' : value)}
              active={urgency === value}
            />
          ))}
        </div>

        <section className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
          <Panel
            title="Briefing"
            icon={<Lightbulb className="h-4 w-4" />}
            empty="Nothing needs attention in this filtered briefing."
          >
            <CardList cards={briefing} />
          </Panel>
          <Panel title="Workload Awareness" icon={<AlertTriangle className="h-4 w-4" />}>
            <div className="rounded-md border border-stone-800 bg-stone-900 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-stone-100">{data.workload.summary}</p>
                <span className={workloadBadge(data.workload.level)}>{data.workload.level}</span>
              </div>
              <p className="mt-2 text-sm text-stone-400">
                Score: {data.workload.score === null ? 'unknown' : `${data.workload.score}/100`}
              </p>
              <ul className="mt-3 space-y-1 text-xs text-stone-500">
                {data.workload.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            </div>
            <RemySimulationMode workload={data.workload} />
          </Panel>
        </section>

        {query ? (
          <Panel
            title="Ask The Business Search"
            icon={<Search className="h-4 w-4" />}
            empty="No tenant-authorized matches found."
          >
            {data.searchResults.length === 0 ? (
              <EmptyLine text="No tenant-authorized matches found for this query." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {data.searchResults.map((result) => (
                  <article
                    key={result.id}
                    className="rounded-md border border-stone-800 bg-stone-900 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-stone-100">{result.title}</p>
                      <span className="rounded-full bg-stone-800 px-2 py-1 text-xs text-stone-300">
                        {result.domain}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-stone-400">{result.excerpt}</p>
                    {result.href ? (
                      <Link
                        className="mt-3 inline-block text-xs font-medium text-brand-300 hover:text-brand-200"
                        href={result.href}
                      >
                        Open source
                      </Link>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </Panel>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-3">
          <Panel
            title="Inbox Triage"
            icon={<Brain className="h-4 w-4" />}
            empty="No unread inbox records available for this filter."
          >
            <CardList cards={inbox} compact />
          </Panel>
          <Panel
            title="Follow-Up Radar"
            icon={<CheckCircle className="h-4 w-4" />}
            empty="No follow-up candidates found."
          >
            <CardList cards={followUps} compact />
          </Panel>
          <Panel
            title="Approval Center"
            icon={<Shield className="h-4 w-4" />}
            empty="No AI-prepared actions are awaiting review."
          >
            <CardList cards={approvals} compact />
          </Panel>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <Panel
            title="Explain-Why Cards"
            icon={<Lightbulb className="h-4 w-4" />}
            empty="No explain-why cards for this filter."
          >
            <CardList
              cards={filterCards(data.explainWhyCards, domain, urgency).slice(0, 8)}
              compact
              showSources
            />
          </Panel>
          <Panel
            title="Pattern Detection"
            icon={<Brain className="h-4 w-4" />}
            empty="Insufficient real data for pattern detection."
          >
            <CardList cards={patterns} compact showSources />
          </Panel>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <MemoryPanel data={data} />
          <RemyVoiceMemoIntake />
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <Panel title="Safety Dashboard" icon={<Shield className="h-4 w-4" />}>
            <div className="grid gap-3">
              {data.safety.restrictions.map((restriction) => (
                <div
                  key={restriction}
                  className="rounded-md border border-stone-800 bg-stone-900 p-3 text-sm text-stone-300"
                >
                  {restriction}
                </div>
              ))}
              <div className="rounded-md border border-stone-800 bg-stone-900 p-3 text-sm text-stone-400">
                Audit window: {data.safety.auditSummary.total} actions,{' '}
                {data.safety.auditSummary.blocked} blocked, {data.safety.auditSummary.error}{' '}
                errored.
              </div>
            </div>
          </Panel>
          <Panel title="Client-Safe Mode" icon={<Lock className="h-4 w-4" />}>
            <ListBlock title="Allowed" items={data.clientSafeMode.allowlist} />
            <ListBlock title="Blocked" items={data.clientSafeMode.blockedFields} />
            <ListBlock title="Review required" items={data.clientSafeMode.reviewRequired} />
          </Panel>
          <Panel
            title="Source Ledger"
            icon={<Archive className="h-4 w-4" />}
            empty="No source ledger entries available."
          >
            <div className="grid gap-2">
              {data.sourceLedger.slice(0, 12).map((source) => (
                <div
                  key={source.id}
                  className="rounded-md border border-stone-800 bg-stone-900 p-3"
                >
                  <p className="text-sm font-medium text-stone-100">{source.label}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {source.recordType} · {source.status}
                  </p>
                  <p className="mt-2 text-xs text-stone-400">{source.excerpt}</p>
                </div>
              ))}
            </div>
          </Panel>
        </section>

        <Panel title="Data Availability" icon={<CheckCircle className="h-4 w-4" />}>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            {data.dataAvailability.map((source) => (
              <div
                key={source.source}
                className="rounded-md border border-stone-800 bg-stone-900 p-3"
              >
                <p className="text-sm font-medium text-stone-100">{source.source}</p>
                <p
                  className={
                    source.available
                      ? 'mt-1 text-xs text-emerald-300'
                      : 'mt-1 text-xs text-amber-300'
                  }
                >
                  {source.available ? 'available' : 'unavailable'}
                </p>
                <p className="mt-2 text-xs text-stone-500">{source.note}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}

function MemoryPanel({ data }: { data: RemyOperatingHubData }) {
  return (
    <section className="rounded-lg border border-stone-800 bg-stone-950 p-4">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-brand-400" />
        <h2 className="text-base font-semibold text-stone-100">Decision and Profile Memory</h2>
      </div>
      <form
        action={addRemyDecisionMemoryAction}
        className="mt-4 grid gap-3 rounded-md border border-stone-800 bg-stone-900 p-3"
      >
        <textarea
          name="content"
          required
          className="min-h-20 rounded-md border border-stone-700 bg-stone-950 p-3 text-sm text-stone-100"
          placeholder="Add a chef-approved decision memory..."
        />
        <div className="grid gap-2 sm:grid-cols-[1fr_110px_auto]">
          <select
            name="category"
            className="rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
          >
            {MEMORY_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <input
            name="importance"
            type="number"
            min={1}
            max={10}
            defaultValue={6}
            className="rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
          />
          <button className="rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500">
            Add
          </button>
        </div>
      </form>
      <div className="mt-4 grid gap-3">
        {data.memories.length === 0 ? (
          <div className="rounded-md border border-dashed border-stone-800 p-3 text-sm text-stone-500">
            No active memories found. Add a chef-approved memory above; proposed voice memo facts
            stay draft-only until approved.
          </div>
        ) : (
          data.memories.slice(0, 10).map((memory) => (
            <article
              key={memory.id}
              className="rounded-md border border-stone-800 bg-stone-900 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-stone-100">{memory.content}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {memory.type.replace(/_/g, ' ')} · {memory.confidence} · {memory.sensitivity}
                  </p>
                </div>
                <form action={archiveRemyDecisionMemoryAction}>
                  <input type="hidden" name="memoryId" value={memory.id} />
                  <button className="inline-flex items-center gap-1 rounded-md border border-stone-700 px-2 py-1 text-xs text-stone-300 hover:bg-stone-800">
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </button>
                </form>
              </div>
              <details className="mt-3">
                <summary className="inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-brand-300">
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit memory
                </summary>
                <form action={updateRemyDecisionMemoryAction} className="mt-3 grid gap-2">
                  <input type="hidden" name="memoryId" value={memory.id} />
                  <textarea
                    name="content"
                    defaultValue={memory.content}
                    className="min-h-20 rounded-md border border-stone-700 bg-stone-950 p-3 text-sm text-stone-100"
                  />
                  <div className="grid gap-2 sm:grid-cols-[1fr_110px_auto]">
                    <select
                      name="category"
                      defaultValue={memory.type}
                      className="rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
                    >
                      {MEMORY_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                    <input
                      name="importance"
                      type="number"
                      min={1}
                      max={10}
                      defaultValue={memory.confidence === 'deterministic' ? 8 : 5}
                      className="rounded-md border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100"
                    />
                    <button className="rounded-md border border-brand-700 px-3 py-2 text-sm font-medium text-brand-200 hover:bg-brand-950">
                      Save
                    </button>
                  </div>
                </form>
              </details>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

function Panel({
  title,
  icon,
  empty,
  children,
}: {
  title: string
  icon: React.ReactNode
  empty?: string
  children?: React.ReactNode
}) {
  const hasChildren = Boolean(children)
  return (
    <section className="rounded-lg border border-stone-800 bg-stone-950 p-4">
      <div className="mb-4 flex items-center gap-2 text-brand-400">
        {icon}
        <h2 className="text-base font-semibold text-stone-100">{title}</h2>
      </div>
      {hasChildren ? (
        children
      ) : (
        <div className="rounded-md border border-dashed border-stone-800 p-3 text-sm text-stone-500">
          {empty}
        </div>
      )}
    </section>
  )
}

function CardList({
  cards,
  compact,
  showSources,
}: {
  cards: RemyHubCard[]
  compact?: boolean
  showSources?: boolean
}) {
  if (cards.length === 0) return <EmptyLine text="No records match this filter." />
  return (
    <div className={compact ? 'grid gap-3' : 'grid gap-3 md:grid-cols-2'}>
      {cards.map((card) => (
        <article key={card.id} className="rounded-md border border-stone-800 bg-stone-900 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-stone-100">{card.title}</p>
              <p className="mt-1 text-sm text-stone-400">{card.detail}</p>
            </div>
            <span className={urgencyBadge(card.urgency)}>{card.urgency}</span>
          </div>
          <p className="mt-3 text-xs text-stone-500">{card.confidenceLabel}</p>
          {showSources && card.sources.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {card.sources.slice(0, 3).map((source) =>
                source.href ? (
                  <Link
                    key={source.id}
                    href={source.href}
                    className="rounded-full bg-stone-800 px-2 py-1 text-xs text-brand-300"
                  >
                    {source.recordType}
                  </Link>
                ) : (
                  <span
                    key={source.id}
                    className="rounded-full bg-stone-800 px-2 py-1 text-xs text-stone-400"
                  >
                    {source.status}
                  </span>
                )
              )}
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {card.nextOptions.slice(0, 3).map((option) => (
              <span
                key={option}
                className="rounded-full border border-stone-700 px-2 py-1 text-xs text-stone-400"
              >
                {option}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  )
}

function EmptyLine({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-stone-800 p-3 text-sm text-stone-500">
      {text}
    </div>
  )
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="rounded-md border border-stone-800 bg-stone-900 p-2 text-sm text-stone-300"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'rounded-full bg-brand-600 px-3 py-1 text-xs font-medium text-white'
          : 'rounded-full border border-stone-800 px-3 py-1 text-xs font-medium text-stone-400 hover:bg-stone-900'
      }
    >
      {label}
    </Link>
  )
}

function filterCards(cards: RemyHubCard[], domain: string, urgency: string): RemyHubCard[] {
  return cards.filter((card) => {
    if (domain && card.domain !== domain) return false
    if (urgency && card.urgency !== urgency) return false
    return true
  })
}

function filterHref(query: string, domain: string, urgency: string): string {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (domain) params.set('domain', domain)
  if (urgency) params.set('urgency', urgency)
  const suffix = params.toString()
  return `/remy/operating${suffix ? `?${suffix}` : ''}`
}

function urgencyBadge(urgency: RemyHubUrgency): string {
  if (urgency === 'critical')
    return 'rounded-full bg-red-950 px-2 py-1 text-xs font-medium text-red-200'
  if (urgency === 'high')
    return 'rounded-full bg-amber-950 px-2 py-1 text-xs font-medium text-amber-200'
  if (urgency === 'medium')
    return 'rounded-full bg-blue-950 px-2 py-1 text-xs font-medium text-blue-200'
  return 'rounded-full bg-stone-800 px-2 py-1 text-xs font-medium text-stone-300'
}

function workloadBadge(level: RemyOperatingHubData['workload']['level']): string {
  if (level === 'overloaded')
    return 'rounded-full bg-red-950 px-2 py-1 text-xs font-medium text-red-200'
  if (level === 'heavy')
    return 'rounded-full bg-amber-950 px-2 py-1 text-xs font-medium text-amber-200'
  if (level === 'steady')
    return 'rounded-full bg-blue-950 px-2 py-1 text-xs font-medium text-blue-200'
  if (level === 'unknown')
    return 'rounded-full bg-stone-800 px-2 py-1 text-xs font-medium text-stone-300'
  return 'rounded-full bg-emerald-950 px-2 py-1 text-xs font-medium text-emerald-200'
}
