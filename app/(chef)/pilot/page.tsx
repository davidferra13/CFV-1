import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  ClipboardList,
  ExternalLink,
} from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getPilotActivationStatus,
  type PilotActivationStep,
  type PilotActivationStepStatus,
} from '@/lib/pilot/activation'

export const metadata: Metadata = {
  title: 'Pilot Activation',
}

function getStatusBadge(status: PilotActivationStepStatus) {
  if (status === 'done') return <Badge variant="success">Done</Badge>
  if (status === 'manual') return <Badge variant="warning">Manual proof</Badge>
  return <Badge variant="info">Next action</Badge>
}

function StepIcon({ status }: { status: PilotActivationStepStatus }) {
  if (status === 'done') {
    return <CheckCircle2 className="h-5 w-5 text-emerald-400" aria-hidden="true" />
  }

  if (status === 'manual') {
    return <AlertCircle className="h-5 w-5 text-amber-400" aria-hidden="true" />
  }

  return <Circle className="h-5 w-5 text-brand-300" aria-hidden="true" />
}

function PilotStepRow({ step }: { step: PilotActivationStep }) {
  return (
    <div className="flex flex-col gap-4 border-b border-stone-800 py-5 last:border-b-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-900 ring-1 ring-stone-700">
          <StepIcon status={step.status} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-stone-100">{step.label}</h2>
            {getStatusBadge(step.status)}
          </div>
          <p className="mt-1 text-sm text-stone-400">{step.description}</p>
          <p className="mt-2 text-sm text-stone-300">{step.evidence}</p>
        </div>
      </div>
      {step.href ? (
        <Link
          href={step.href}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg border border-stone-700 px-3.5 text-sm font-medium text-stone-200 transition-colors hover:border-brand-700 hover:bg-stone-900 hover:text-brand-200"
        >
          Open
          {step.href.startsWith('/book/') ? (
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          )}
        </Link>
      ) : null}
    </div>
  )
}

export default async function PilotActivationPage() {
  const status = await getPilotActivationStatus()
  const percent = Math.round((status.completedSteps / status.totalSteps) * 100)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-800 bg-brand-950/40 px-3 py-1 text-xs font-semibold text-brand-200">
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            Pilot proof board
          </div>
          <h1 className="text-3xl font-bold text-stone-100">Pilot Activation</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">
            One place to see whether {status.chefName} has enough system evidence for a real
            first-chef pilot: booking, public test, money loop, feedback, and pay-intent proof.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {status.publicBookingHref ? (
            <Button href={status.publicBookingHref} variant="secondary" size="sm">
              Public booking
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
          {status.nextStep?.href ? (
            <Button href={status.nextStep.href} variant="primary" size="sm">
              Next action
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Launch Proof</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-stone-100">{percent}%</div>
            <p className="mt-2 text-sm text-stone-400">
              {status.completedSteps}/{status.totalSteps} proof checks complete
            </p>
            <div className="mt-5 h-2 rounded-full bg-stone-800">
              <div className="h-2 rounded-full bg-brand-500" style={{ width: `${percent}%` }} />
            </div>
            {status.nextStep ? (
              <div className="mt-6 rounded-lg border border-stone-800 bg-stone-950/70 p-4">
                <p className="text-xs font-semibold uppercase text-stone-500">Next blocker</p>
                <p className="mt-1 text-sm font-medium text-stone-100">{status.nextStep.label}</p>
                <p className="mt-1 text-xs leading-5 text-stone-400">{status.nextStep.evidence}</p>
              </div>
            ) : (
              <div className="mt-6 rounded-lg border border-emerald-900 bg-emerald-950/30 p-4">
                <p className="text-sm font-medium text-emerald-200">System proof is complete.</p>
                <p className="mt-1 text-xs leading-5 text-emerald-300">
                  Manual pay-intent evidence still belongs in the pilot notes until a dedicated
                  database field exists.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pilot Checklist</CardTitle>
          </CardHeader>
          <CardContent className="py-0">
            {status.steps.map((step) => (
              <PilotStepRow key={step.key} step={step} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
