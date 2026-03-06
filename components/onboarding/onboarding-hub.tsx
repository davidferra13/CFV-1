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
    label: 'Profile & Payments',
    description: 'Your business name, photo, bio, and Stripe Connect for collecting payment.',
    icon: User,
    href: '/settings/my-profile',
    ctaLabel: 'Edit Profile',
    doneSummary: () => 'Profile complete',
  },
  {
    key: 'clients',
    label: 'Client List',
    description:
      'Import every existing client — their contact info, dietary restrictions, allergies, and service history.',
    icon: Users,
    href: '/onboarding/clients',
    ctaLabel: 'Import Clients',
    doneSummary: (p) =>
      p.clients.count === 1 ? '1 client imported' : `${p.clients.count} clients imported`,
  },
  {
    key: 'loyalty',
    label: 'Loyalty Program',
    description:
      "Configure your tier thresholds and reward catalog, then seed every client's historical point balance.",
    icon: Star,
    href: '/onboarding/loyalty',
    ctaLabel: 'Set Up Loyalty',
    doneSummary: () => 'Loyalty program configured',
  },
  {
    key: 'recipes',
    label: 'Recipe Library',
    description:
      'Build your recipe book — methods, timing, dietary tags, and yield for every dish you cook.',
    icon: BookOpen,
    href: '/onboarding/recipes',
    ctaLabel: 'Add Recipes',
    doneSummary: (p) =>
      p.recipes.count === 1 ? '1 recipe added' : `${p.recipes.count} recipes added`,
  },
  {
    key: 'staff',
    label: 'Staff Roster',
    description:
      'Add team members you work with — sous chefs, servers, assistants — and their rates.',
    icon: Users2,
    href: '/onboarding/staff',
    ctaLabel: 'Add Staff',
    doneSummary: (p) =>
      p.staff.count === 1 ? '1 staff member added' : `${p.staff.count} staff members added`,
    optional: true,
  },
]

export function OnboardingHub({ progress }: { progress: OnboardingProgress }) {
  const pct = Math.round((progress.completedPhases / progress.totalPhases) * 100)

  return (
    <div className="min-h-screen bg-stone-800">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Set Up Your Business</h1>
          <p className="text-stone-300 mt-2">
            Migrate your existing clients, recipes, and loyalty program so ChefFlow knows your
            business from day one.
          </p>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-sm text-stone-300 mb-2">
            <span>
              {progress.completedPhases} of {progress.totalPhases} phases complete
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
            <div
              className="h-2 bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Phase cards */}
        <div className="space-y-4">
          {PHASES.map((phase) => {
            const isDone =
              phase.key === 'profile'
                ? progress.profile
                : phase.key === 'clients'
                  ? progress.clients.done
                  : phase.key === 'loyalty'
                    ? progress.loyalty.done
                    : phase.key === 'recipes'
                      ? progress.recipes.done
                      : progress.staff.done

            const Icon = phase.icon

            return (
              <Card
                key={phase.key}
                className={isDone ? 'border-green-200 bg-green-950' : 'bg-stone-900'}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-3 text-base font-semibold">
                    <div className={`p-2 rounded-lg ${isDone ? 'bg-green-900' : 'bg-stone-800'}`}>
                      <Icon className={`h-4 w-4 ${isDone ? 'text-green-600' : 'text-stone-300'}`} />
                    </div>
                    <span className="flex-1">{phase.label}</span>
                    {phase.optional && (
                      <span className="text-xs font-normal text-stone-300">Optional</span>
                    )}
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-stone-300 flex-shrink-0" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-end justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-stone-300">{phase.description}</p>
                    {isDone && (
                      <p className="text-sm font-medium text-green-700">
                        ✓ {phase.doneSummary(progress)}
                      </p>
                    )}
                  </div>
                  <Link href={phase.href} className="flex-shrink-0">
                    <Button
                      variant={isDone ? 'secondary' : 'primary'}
                      className="whitespace-nowrap"
                    >
                      {isDone ? 'Edit' : phase.ctaLabel}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Go to dashboard */}
        <div className="pt-4 border-t border-stone-700 flex items-center justify-between">
          <p className="text-sm text-stone-500">
            You can return here any time from the Settings menu.
          </p>
          <Link href="/dashboard">
            <Button variant="ghost">Go to Dashboard →</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
