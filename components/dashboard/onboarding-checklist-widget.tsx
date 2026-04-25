import Link from 'next/link'
import { CheckCircle2, Circle, ArrowRight } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { OnboardingProgress } from '@/lib/onboarding/progress-actions'

interface Props {
  progress: OnboardingProgress
}

export function OnboardingChecklistWidget({ progress }: Props) {
  if (!progress.nextStep) return null

  const pct = Math.round((progress.completedSteps / progress.totalSteps) * 100)

  return (
    <Card className="border-brand-700 bg-brand-950/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">First Booking Loop</CardTitle>
          <span className="text-xs text-stone-500">
            {progress.completedSteps}/{progress.totalSteps} complete
          </span>
        </div>
        <div className="w-full bg-stone-700 rounded-full h-1.5 mt-2">
          <div
            className="bg-brand-500 h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <p className="mb-2 text-xs text-stone-300">
          Prove ChefFlow with one paid workflow: lead, quote, event, prep, and invoice.
        </p>
        <ul className="space-y-2">
          {progress.steps.map((step) => (
            <li key={step.key}>
              {step.done ? (
                <div className="flex items-start gap-2.5 rounded-md px-2 py-1.5 opacity-50 cursor-default">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-300 line-through">{step.label}</p>
                    {step.evidenceLabel && (
                      <p className="text-xs-tight text-stone-400 mt-0.5">{step.evidenceLabel}</p>
                    )}
                  </div>
                </div>
              ) : (
                <Link
                  href={step.href}
                  className="flex items-start gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-brand-900/60 cursor-pointer"
                >
                  <Circle className="h-4 w-4 text-stone-300 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-200">{step.label}</p>
                    <p className="text-xs-tight text-stone-300 mt-0.5">
                      {step.evidenceLabel ?? step.description}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-brand-400 shrink-0 mt-0.5" />
                </Link>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-3 pt-2 border-t border-stone-800">
          <Link
            href={progress.nextStep.href}
            className="text-xs font-medium text-brand-500 hover:text-brand-400 flex items-center gap-1"
          >
            {progress.nextStep.label} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
