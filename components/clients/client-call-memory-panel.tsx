import Link from 'next/link'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ClientCallMemorySnapshot } from '@/lib/clients/client-call-memory'

type ClientCallMemoryPanelProps = {
  snapshot: ClientCallMemorySnapshot | null
  unavailable?: boolean
}

const TEMPERATURE_LABELS: Record<ClientCallMemorySnapshot['relationshipTemperature'], string> = {
  new: 'New',
  warm: 'Warm',
  needs_attention: 'Needs attention',
  quiet: 'Quiet',
}

const TEMPERATURE_VARIANTS: Record<
  ClientCallMemorySnapshot['relationshipTemperature'],
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  new: 'default',
  warm: 'success',
  needs_attention: 'warning',
  quiet: 'info',
}

export function ClientCallMemoryPanel({ snapshot, unavailable = false }: ClientCallMemoryPanelProps) {
  if (unavailable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Call Memory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-3">
            <p className="text-sm font-medium text-amber-200">Call memory unavailable</p>
            <p className="mt-1 text-xs text-amber-100/80">
              ChefFlow could not verify this client&apos;s call history right now.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!snapshot || snapshot.totalCalls === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Call Memory</CardTitle>
            <p className="mt-1 text-sm text-stone-400">
              Relationship signal from scheduled calls, outcomes, and unresolved follow-ups.
            </p>
          </div>
          <Badge variant={TEMPERATURE_VARIANTS[snapshot.relationshipTemperature]}>
            {TEMPERATURE_LABELS[snapshot.relationshipTemperature]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Calls" value={snapshot.totalCalls} />
          <Metric label="Completed" value={snapshot.completedCalls} />
          <Metric label="Open loops" value={snapshot.unresolvedPromises.length} />
          <Metric
            label="Avg quality"
            value={snapshot.averageOutcomeQuality === null ? 'N/A' : `${snapshot.averageOutcomeQuality}/100`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Last Touch
            </p>
            {snapshot.lastCall ? (
              <MemoryLink
                href={snapshot.lastCall.href}
                label={snapshot.lastCall.label}
                meta={`${format(new Date(snapshot.lastCall.scheduledAt), 'MMM d, yyyy')} - ${snapshot.lastCall.status.replace(/_/g, ' ')}`}
              />
            ) : (
              <p className="mt-2 text-sm text-stone-400">No prior calls.</p>
            )}
          </div>

          <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Next Touch
            </p>
            {snapshot.nextCall ? (
              <MemoryLink
                href={snapshot.nextCall.href}
                label={snapshot.nextCall.label}
                meta={`${format(new Date(snapshot.nextCall.scheduledAt), 'MMM d, h:mm a')} - ${snapshot.nextCall.status.replace(/_/g, ' ')}`}
              />
            ) : (
              <p className="mt-2 text-sm text-stone-400">{snapshot.preferredTouch}</p>
            )}
          </div>
        </div>

        {(snapshot.missingOutcomes > 0 || snapshot.weakOutcomes > 0) && (
          <div className="rounded-lg border border-amber-800/60 bg-amber-950/30 p-4 text-sm text-amber-100">
            <p className="font-medium">Call memory needs cleanup</p>
            <p className="mt-1 opacity-80">
              {snapshot.missingOutcomes} missing outcome(s), {snapshot.weakOutcomes} weak outcome(s).
            </p>
          </div>
        )}

        {snapshot.unresolvedPromises.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Unresolved Promises
            </p>
            <div className="mt-2 space-y-2">
              {snapshot.unresolvedPromises.map((item) => (
                <MemoryLink key={item.id} href={item.href} label={item.detail} meta={item.label} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-stone-100">{value}</p>
    </div>
  )
}

function MemoryLink({ href, label, meta }: { href: string; label: string; meta: string }) {
  return (
    <Link href={href} className="block rounded-md border border-stone-700 p-3 hover:bg-stone-800">
      <p className="text-sm font-medium text-stone-100">{label}</p>
      <p className="mt-1 text-xs text-stone-500">{meta}</p>
    </Link>
  )
}
