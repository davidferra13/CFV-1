// Onboarding Checklist Widget - shows setup completion status for new chefs
// Displayed on dashboard until all 5 phases are complete.
// Drives the chef to /onboarding to complete any missing steps.

import Link from 'next/link'
import { CheckCircle2, Circle, ArrowRight } from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { OnboardingProgress } from '@/lib/onboarding/progress-actions'

interface Props {
  progress: OnboardingProgress
}

const STEPS: Array<{
  key: keyof Omit<OnboardingProgress, 'completedPhases' | 'totalPhases'>
  label: string
  detail: string
  href: string
}> = [
  {
    key: 'profile',
    label: 'Complete your profile',
    detail: 'Business name + display name',
    href: '/settings/profile',
  },
  {
    key: 'clients',
    label: 'Add your first client',
    detail: 'Import or enter manually',
    href: '/onboarding/clients',
  },
  {
    key: 'loyalty',
    label: 'Configure loyalty program',
    detail: 'Set up rewards for repeat clients',
    href: '/onboarding/loyalty',
  },
  {
    key: 'recipes',
    label: 'Enter your first recipe',
    detail: 'Build your culinary library',
    href: '/onboarding/recipes',
  },
  {
    key: 'staff',
    label: 'Add a team member',
    detail: 'Staff roster for scheduling',
    href: '/onboarding/staff',
  },
]

function isDone(progress: OnboardingProgress, key: string): boolean {
  const val = progress[key as keyof OnboardingProgress]
  if (typeof val === 'boolean') return val
  if (typeof val === 'object' && val !== null && 'done' in val)
    return (val as { done: boolean }).done
  return false
}

export function OnboardingChecklistWidget({ progress }: Props) {
  if (progress.completedPhases >= progress.totalPhases) return null

  const pct = Math.round((progress.completedPhases / progress.totalPhases) * 100)

  return (
    <Card className="border-brand-700 bg-brand-950/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Getting Started</CardTitle>
          <span className="text-xs text-stone-500">
            {progress.completedPhases}/{progress.totalPhases} complete
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-stone-700 rounded-full h-1.5 mt-2">
          <div
            className="bg-brand-500 h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <ul className="space-y-2">
          {STEPS.map((step) => {
            const done = isDone(progress, step.key)
            return (
              <li key={step.key}>
                {done ? (
                  <div className="flex items-start gap-2.5 rounded-md px-2 py-1.5 opacity-50 cursor-default">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-stone-300 line-through">
                        {step.label}
                      </p>
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
                      <p className="text-xs-tight text-stone-300 mt-0.5">{step.detail}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-brand-400 shrink-0 mt-0.5" />
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
        <div className="mt-3 pt-2 border-t border-stone-800">
          <Link
            href="/onboarding"
            className="text-xs font-medium text-brand-500 hover:text-brand-400 flex items-center gap-1"
          >
            Open setup guide <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
