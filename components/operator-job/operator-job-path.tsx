import Link from 'next/link'
import { AlertTriangle, CheckCircle, Clock } from '@/components/ui/icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type {
  ChefOperatorJobJourney,
  OperatorJobStep,
  OperatorJobStepStatus,
} from '@/lib/operator-job/journey'

function stepVariant(status: OperatorJobStepStatus): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'complete') return 'success'
  if (status === 'blocked') return 'error'
  if (status === 'current') return 'warning'
  return 'default'
}

function StepIcon({ status }: { status: OperatorJobStepStatus }) {
  if (status === 'complete') return <CheckCircle className="h-4 w-4 text-emerald-400" />
  if (status === 'blocked') return <AlertTriangle className="h-4 w-4 text-rose-400" />
  return <Clock className="h-4 w-4 text-stone-400" />
}

function StepRow({ step }: { step: OperatorJobStep }) {
  return (
    <Link
      href={step.href}
      aria-current={step.status === 'current' || step.status === 'blocked' ? 'step' : undefined}
      className="block rounded-lg border border-stone-800 bg-stone-950/50 p-3 transition-colors hover:border-stone-700 hover:bg-stone-900/70"
    >
      <div className="flex items-start gap-3">
        <StepIcon status={step.status} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-stone-100">{step.label}</p>
            <Badge variant={stepVariant(step.status)}>{step.status}</Badge>
          </div>
          <p className="mt-1 text-xs leading-5 text-stone-400">{step.summary}</p>
        </div>
      </div>
    </Link>
  )
}

export function OperatorJobPath({ journey }: { journey: ChefOperatorJobJourney }) {
  return (
    <Card
      className="p-4 sm:p-5"
      data-cf-surface="chef:operator-job-path"
      data-cf-connection-key={journey.connectionKey}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
            One connected job
          </p>
          <h2 className="mt-1 text-lg font-semibold text-stone-100">{journey.title}</h2>
          {journey.clientName ? (
            <p className="mt-1 text-sm text-stone-400">{journey.clientName}</p>
          ) : null}
          <p className="mt-2 text-xs text-stone-500">
            Inquiry, client, quote, menu, event, production, service, payment, and follow-up stay on this path.
          </p>
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-950/70 p-4 lg:w-80">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
            Next useful action
          </p>
          <p className="mt-2 text-base font-semibold text-stone-100">
            {journey.currentStep.actionLabel}
          </p>
          <p className="mt-1 text-sm text-stone-400">{journey.currentStep.summary}</p>
          <Button href={journey.currentStep.href} variant="secondary" size="sm" className="mt-3">
            {journey.currentStep.actionLabel}
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {journey.steps.map((step) => (
          <StepRow key={step.key} step={step} />
        ))}
      </div>
    </Card>
  )
}
