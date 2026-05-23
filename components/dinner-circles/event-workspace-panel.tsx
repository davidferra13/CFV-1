'use client'

import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react'
import {
  resolveDinnerCircleWorkspaceModules,
  type DinnerCircleWorkspaceModule,
} from '@/lib/dinner-circles/event-workspace'
import type { DinnerCircleActionRole } from '@/lib/dinner-circles/action-surface'

type DinnerCircleEventWorkspacePanelProps = {
  viewerRole: DinnerCircleActionRole
  isHost: boolean
}

export function DinnerCircleEventWorkspacePanel({
  viewerRole,
  isHost,
}: DinnerCircleEventWorkspacePanelProps) {
  const modules = resolveDinnerCircleWorkspaceModules({
    role: viewerRole,
    permissions: {
      canManagePrivacy: isHost,
      canInvite: isHost,
      canBroadcast: isHost,
      canManageTheme: isHost,
    },
    includeUnavailable: true,
  })
  const permitted = modules.filter((module) => module.permitted)
  const gated = modules.filter((module) => !module.permitted)

  return (
    <section className="space-y-4" aria-labelledby="dinner-circle-workspace-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 id="dinner-circle-workspace-title" className="text-base font-semibold">
            Event workspace
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Role-safe surfaces for attendee cards, seating, Q&A, menu reveal, itinerary, backup
            plans, packets, memories, growth actions, and host media.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          {permitted.length} active
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {permitted.map((module) => (
          <WorkspaceModuleRow key={module.id} module={module} />
        ))}
      </div>

      {gated.length > 0 && (
        <details className="rounded-lg border bg-muted/30 p-3">
          <summary className="cursor-pointer text-sm font-medium">
            Role-limited modules ({gated.length})
          </summary>
          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {gated.map((module) => (
              <div key={module.id} className="rounded-md border bg-background p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{module.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {module.disabledReason}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  )
}

function WorkspaceModuleRow({ module }: { module: DinnerCircleWorkspaceModule }) {
  return (
    <article className="min-w-0 rounded-lg border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{module.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{module.summary}</p>
        </div>
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
      </div>

      <dl className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
        <div>
          <dt className="font-medium text-foreground">Privacy</dt>
          <dd>{module.privacyGuardrail}</dd>
        </div>
        <div>
          <dt className="font-medium text-foreground">Proof focus</dt>
          <dd>{module.proofFocus.join(', ')}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex min-h-[40px] items-center rounded-md border px-3 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          {module.primaryAction}
        </button>
        <span className="min-w-0 truncate text-xs text-muted-foreground">{module.source}</span>
      </div>
    </article>
  )
}
