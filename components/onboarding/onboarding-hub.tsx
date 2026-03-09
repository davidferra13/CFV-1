'use client'

import Link from 'next/link'
import {
  CheckCircle2,
  Circle,
  Users,
  Star,
  BookOpen,
  Users2,
  User,
  ArrowRight,
} from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { LaunchStatus } from '@/lib/onboarding/launch-status'
import type { OnboardingProgress } from '@/lib/onboarding/progress-actions'

type Phase = {
  key: keyof Omit<OnboardingProgress, 'completedPhases' | 'totalPhases'>
  label: string
  description: string
  icon: React.ElementType
  href: string
  ctaLabel: string
  doneSummary: (progress: OnboardingProgress) => string
  optional?: boolean
}

const PHASES: Phase[] = [
  {
    key: 'profile',
    label: 'Profile',
    description: 'Your business name, public story, and the basics clients see first.',
    icon: User,
    href: '/settings/my-profile',
    ctaLabel: 'Edit Profile',
    doneSummary: () => 'Profile basics are in place',
  },
  {
    key: 'clients',
    label: 'Client List',
    description:
      'Import every existing client: contact info, dietary restrictions, allergies, and service history.',
    icon: Users,
    href: '/onboarding/clients',
    ctaLabel: 'Import Clients',
    doneSummary: (p) =>
      p.clients.count === 1 ? '1 client imported' : `${p.clients.count} clients imported`,
  },
  {
    key: 'loyalty',
    label: 'Loyalty Program',
    description: "Configure your tiers and rewards, then seed each client's historical points.",
    icon: Star,
    href: '/onboarding/loyalty',
    ctaLabel: 'Set Up Loyalty',
    doneSummary: () => 'Loyalty program configured',
  },
  {
    key: 'recipes',
    label: 'Recipe Library',
    description: 'Build the recipe book ChefFlow should use for your real events.',
    icon: BookOpen,
    href: '/onboarding/recipes',
    ctaLabel: 'Add Recipes',
    doneSummary: (p) =>
      p.recipes.count === 1 ? '1 recipe added' : `${p.recipes.count} recipes added`,
  },
  {
    key: 'staff',
    label: 'Staff Roster',
    description: 'Add the sous chefs, servers, assistants, and rates you use regularly.',
    icon: Users2,
    href: '/onboarding/staff',
    ctaLabel: 'Add Staff',
    doneSummary: (p) =>
      p.staff.count === 1 ? '1 staff member added' : `${p.staff.count} staff members added`,
    optional: true,
  },
]

function isPhaseDone(progress: OnboardingProgress, key: Phase['key']): boolean {
  if (key === 'profile') return progress.profile
  if (key === 'clients') return progress.clients.done
  if (key === 'loyalty') return progress.loyalty.done
  if (key === 'recipes') return progress.recipes.done
  return progress.staff.done
}

export function OnboardingHub({
  progress,
  launchStatus,
}: {
  progress: OnboardingProgress
  launchStatus: LaunchStatus
}) {
  const pct = Math.round((progress.completedPhases / progress.totalPhases) * 100)
  const launchSteps = [
    {
      key: 'profile',
      label: 'Business profile',
      done: launchStatus.profileDone,
      href: '/settings/my-profile',
      ctaLabel: launchStatus.profileDone ? 'Review profile' : 'Finish profile',
      detail: launchStatus.profileDone
        ? `Ready as ${launchStatus.displayName}`
        : 'Add the name and basics clients should see first.',
    },
    {
      key: 'url',
      label: 'Public profile URL',
      done: launchStatus.publicUrlDone,
      href: '/settings/public-profile',
      ctaLabel: launchStatus.publicUrlDone ? 'Review URL' : 'Claim your URL',
      detail: launchStatus.publicUrlDone
        ? `chef/${launchStatus.slug}`
        : 'Pick the link clients and partners will share.',
    },
    {
      key: 'payments',
      label: 'Stripe payouts',
      done: launchStatus.paymentsDone,
      href: '/settings/stripe-connect',
      ctaLabel: launchStatus.paymentsDone ? 'Review payouts' : 'Connect Stripe',
      detail: launchStatus.paymentsDone
        ? 'Payments and payouts are ready.'
        : 'Connect Stripe so deposits and payouts work.',
    },
  ]
  const launchCompleted = launchSteps.filter((step) => step.done).length
  const nextPhase = PHASES.find((phase) => !isPhaseDone(progress, phase.key)) ?? null

  return (
    <div className="min-h-screen bg-stone-950">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-12">
        <div className="space-y-3">
          <span className="inline-flex w-fit items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
            Phase 2
          </span>
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Bring Your Business Into ChefFlow</h1>
            <p className="mt-2 max-w-3xl text-stone-300">
              Core launch is finished. Now import the real clients, recipes, loyalty data, and team
              details that make the workspace useful day to day.
            </p>
          </div>
        </div>

        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-stone-900 to-stone-950">
          <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
                Next recommended step
              </p>
              <h2 className="text-2xl font-semibold text-stone-100">
                {nextPhase ? nextPhase.label : 'Start running the workspace'}
              </h2>
              <p className="max-w-2xl text-sm text-stone-300">
                {nextPhase
                  ? nextPhase.description
                  : 'Core launch and migration are done. Head to the dashboard and use the live workflow.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={nextPhase?.href ?? '/dashboard'}>
                <Button variant="primary">
                  {nextPhase ? nextPhase.ctaLabel : 'Go to Dashboard'}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="secondary">Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <Card className="border-stone-800 bg-stone-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-stone-100">
                Core launch checklist
              </CardTitle>
              <p className="text-sm text-stone-400">
                {launchCompleted}/{launchSteps.length} launch tasks ready
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {launchSteps.map((step) => (
                <div
                  key={step.key}
                  className="rounded-xl border border-stone-800 bg-stone-950/70 p-4"
                >
                  <div className="flex items-start gap-3">
                    {step.done ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-semibold text-stone-100">{step.label}</p>
                      <p className="text-sm text-stone-400">{step.detail}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link href={step.href}>
                      <Button variant={step.done ? 'secondary' : 'primary'} size="sm">
                        {step.ctaLabel}
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-stone-800 bg-stone-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-stone-100">
                Business migration progress
              </CardTitle>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-stone-300">
                  <span>
                    {progress.completedPhases} of {progress.totalPhases} migration steps complete
                  </span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-stone-800">
                  <div
                    className="h-2 rounded-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-stone-400">
                Start with the first incomplete card below. Nothing is locked if you need to bounce
                between setup work and live operations.
              </p>
              {nextPhase && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                    Start here
                  </p>
                  <p className="mt-1 text-sm font-semibold text-stone-100">{nextPhase.label}</p>
                  <p className="mt-1 text-sm text-stone-300">{nextPhase.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {PHASES.map((phase) => {
            const isDone = isPhaseDone(progress, phase.key)
            const Icon = phase.icon

            return (
              <Card
                key={phase.key}
                className={isDone ? 'border-green-200 bg-green-950' : 'bg-stone-900'}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-base font-semibold">
                    <div className={`rounded-lg p-2 ${isDone ? 'bg-green-900' : 'bg-stone-800'}`}>
                      <Icon className={`h-4 w-4 ${isDone ? 'text-green-600' : 'text-stone-300'}`} />
                    </div>
                    <span className="flex-1">{phase.label}</span>
                    {phase.optional && (
                      <span className="text-xs font-normal text-stone-300">Optional</span>
                    )}
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 flex-shrink-0 text-stone-300" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-end justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-stone-300">{phase.description}</p>
                    {isDone && (
                      <p className="text-sm font-medium text-green-700">
                        Done: {phase.doneSummary(progress)}
                      </p>
                    )}
                  </div>
                  <Link href={phase.href} className="flex-shrink-0">
                    <Button
                      variant={isDone ? 'secondary' : 'primary'}
                      className="whitespace-nowrap"
                    >
                      {isDone ? 'Edit' : phase.ctaLabel}
                      <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="flex items-center justify-between border-t border-stone-700 pt-4">
          <p className="text-sm text-stone-500">
            You can return here any time while the setup work is in motion.
          </p>
          <Link href="/dashboard">
            <Button variant="ghost">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
