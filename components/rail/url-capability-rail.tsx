'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  buildUrlCapabilityConfidenceStrip,
  buildUrlCapabilityXrayReport,
  type UrlCapabilityAction,
  type UrlCapabilityContract,
  type UrlCapabilityXrayReport,
} from '@/lib/navigation/url-capability-registry'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
} from '@/components/ui/icons'

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function formatTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function openCommandPalette() {
  window.dispatchEvent(new CustomEvent('open-command-palette'))
}

function ActionButton({ action, fill = false }: { action: UrlCapabilityAction; fill?: boolean }) {
  const className = cn(
    'inline-flex min-h-9 min-w-0 max-w-full items-center justify-center gap-1.5 overflow-hidden rounded-md px-3 text-xs font-semibold transition-colors',
    fill
      ? 'border border-[#8be7b6] bg-[#8be7b6] text-[#10130f] shadow-sm hover:bg-[#a7f3c8]'
      : action.tone === 'recovery'
        ? 'border border-[#e9bf74]/40 bg-[#3a2a16] text-[#ffe6b6] hover:bg-[#46331b]'
        : action.tone === 'proof'
          ? 'border border-[#79d3e9]/40 bg-[#122b32] text-[#c8f5ff] hover:bg-[#173640]'
          : action.tone === 'blocked'
            ? 'cursor-not-allowed border border-[#f09a9a]/30 bg-[#341918] text-[#ffd0ca] opacity-80'
            : 'border border-[#44382f] bg-[#241f1a] text-[#fff7ed] hover:bg-[#2d261f]'
  )

  const content = (
    <>
      <span className="truncate">{action.label}</span>
      {action.requiresApproval ? <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
      {action.href ? <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
    </>
  )

  if (!action.href) {
    return (
      <button type="button" className={className} disabled title={action.disabledReason}>
        {content}
      </button>
    )
  }

  return (
    <Link href={action.href} className={className} title={action.description}>
      {content}
    </Link>
  )
}

function TrustPill({ contract }: { contract: UrlCapabilityContract }) {
  const strip = buildUrlCapabilityConfidenceStrip(contract.routePattern, 'chef')

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] text-[#d9c9b8]">
      <span className="inline-flex items-center gap-1 rounded-full border border-[#8be7b6]/35 bg-[#143123] px-2 py-1 text-[#bcffd8]">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        {formatPercent(strip.confidence)}
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-[#79d3e9]/35 bg-[#122b32] px-2 py-1 text-[#c8f5ff]">
        <Clock className="h-3.5 w-3.5" aria-hidden />
        {formatTimestamp(strip.lastUpdated)}
      </span>
      {strip.sensitivityWarning ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-[#e9bf74]/40 bg-[#3a2a16] px-2 py-1 text-[#ffe6b6]">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          gated
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1 rounded-full border border-[#44382f] bg-[#241f1a] px-2 py-1">
        <CheckCircle2 className="h-3.5 w-3.5 text-[#8be7b6]" aria-hidden />
        {strip.syncStatus}
      </span>
    </div>
  )
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.slice(0, 6).map((item) => (
        <span
          key={item}
          className="rounded-full border border-[#44382f] bg-[#241f1a] px-2 py-1 text-[11px] text-[#d9c9b8]"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function XrayDrawer({
  contract,
  report,
}: {
  contract: UrlCapabilityContract
  report: UrlCapabilityXrayReport
}) {
  const secondary = [
    ...contract.contextActions.slice(3),
    ...contract.recoveryActions,
    ...contract.proofActions,
  ]

  return (
    <div className="border-t border-[#332b24] bg-[#15120f] px-3 py-3">
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.1fr]">
        <section className="rounded-md border border-[#332b24] bg-[#1c1814] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#9e8c7b]">
            Reads
          </p>
          <ChipList items={contract.readable} />
          <p className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wider text-[#9e8c7b]">
            Writes
          </p>
          <ChipList items={contract.writable} />
        </section>
        <section className="rounded-md border border-[#332b24] bg-[#1c1814] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#9e8c7b]">
            More
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {secondary.map((action) => (
              <ActionButton key={action.id} action={action} />
            ))}
            {contract.blockedActions.map((action) => (
              <ActionButton key={action.id} action={action} />
            ))}
          </div>
        </section>
        <section className="rounded-md border border-[#332b24] bg-[#1c1814] p-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#9e8c7b]">
            X-Ray
          </p>
          <div className="space-y-2 text-xs leading-5 text-[#d9c9b8]">
            <p>Route policy: {report.routePolicy.aligned ? 'aligned' : 'needs review'}</p>
            <p>Rail readiness: {contract.xray.railReadiness}</p>
            <p>Finish gate: {contract.xray.finishGate.join(', ')}</p>
            <p>Page: {contract.xray.page}</p>
          </div>
        </section>
      </div>
    </div>
  )
}

function RailContent({
  contract,
  report,
  compact = false,
}: {
  contract: UrlCapabilityContract
  report: UrlCapabilityXrayReport
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      data-cf-url-capability-rail={contract.routePattern}
      className="mb-4 overflow-hidden rounded-lg border border-[#332b24] bg-[#15120f] text-[#fff7ed] shadow-xl shadow-black/20"
    >
      <div
        className={cn(
          'grid items-center gap-3 px-3 py-3',
          compact
            ? 'grid-cols-1'
            : 'xl:grid-cols-[minmax(220px,0.9fr)_minmax(360px,1.25fr)_minmax(240px,0.85fr)]'
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[#79d3e9]/35 bg-[#122b32] text-[#c8f5ff]">
            <Bot className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#fff7ed]">{contract.title}</p>
            <p className="truncate text-[11px] text-[#bca895]">
              {contract.domain} / {contract.primaryObject} / {contract.shareability}
            </p>
          </div>
        </div>

        <div className="min-w-0 rounded-md border border-[#8be7b6]/35 bg-[#143123] p-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9df2c1]">
                Now
              </p>
              <p className="truncate text-sm font-semibold text-[#f0fff6]">
                {contract.primaryAction.label}
              </p>
            </div>
            <ActionButton action={contract.primaryAction} fill />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <TrustPill contract={contract} />
          <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-2')}>
            {contract.contextActions.slice(0, compact ? 2 : 3).map((action) => (
              <ActionButton key={action.id} action={action} />
            ))}
            <button
              type="button"
              onClick={openCommandPalette}
              className="inline-flex min-h-9 min-w-0 max-w-full items-center justify-center gap-1.5 overflow-hidden rounded-md border border-[#44382f] bg-[#241f1a] px-3 text-xs font-semibold text-[#fff7ed] transition-colors hover:bg-[#2d261f]"
            >
              <Search className="h-3.5 w-3.5" aria-hidden />
              More
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#332b24] px-3 py-2 text-[11px] text-[#bca895]">
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[#79d3e9]" aria-hidden />
          <span className="truncate">Remy prepare requires approval before state changes.</span>
        </span>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-[#44382f] px-2.5 text-xs font-semibold text-[#fff7ed] transition-colors hover:bg-[#241f1a]"
          aria-expanded={open}
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          X-Ray
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', open ? 'rotate-180' : '')}
            aria-hidden
          />
        </button>
      </div>

      {open ? <XrayDrawer contract={contract} report={report} /> : null}
    </div>
  )
}

export function UrlCapabilityRail() {
  const pathname = usePathname() || '/dashboard'
  const report = useMemo(() => buildUrlCapabilityXrayReport(pathname, 'chef'), [pathname])
  const contract = report.contract

  if (!contract) return null

  return (
    <>
      <aside className="hidden md:block" aria-label="URL capability rail">
        <RailContent contract={contract} report={report} />
      </aside>
      <aside className="md:hidden" aria-label="URL capability rail">
        <RailContent contract={contract} report={report} compact />
      </aside>
    </>
  )
}
