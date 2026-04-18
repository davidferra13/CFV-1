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
import type { ArchetypeId } from '@/lib/archetypes/presets'

type Phase = {
  key: keyof Omit<OnboardingProgress, 'completedPhases' | 'totalPhases'>
  label: string
  description: string
  icon: React.ElementType
  href: string
  ctaLabel: string
  doneSummary: (progress: OnboardingProgress) => string
  optional?: boolean
  /** Which archetypes see this phase. Undefined = all. */
  archetypes?: ArchetypeId[]
  /** Tour target ID for spotlight system (FC-G3) */
  tourId?: string
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
      'Import every existing client - their contact info, dietary restrictions, allergies, and service history.',
    icon: Users,
    href: '/onboarding/clients',
    ctaLabel: 'Import Clients',
    tourId: 'chef-import-clients',
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
    tourId: 'chef-setup-loyalty',
    doneSummary: () => 'Loyalty program configured',
  },
  {
    key: 'recipes',
    label: 'Recipe Library',
    description:
      'Build your recipe book - methods, timing, dietary tags, and yield for every dish you cook.',
    icon: BookOpen,
    href: '/onboarding/recipes',
    ctaLabel: 'Add Recipes',
    tourId: 'chef-add-recipes',
    doneSummary: (p) =>
      p.recipes.count === 1 ? '1 recipe added' : `${p.recipes.count} recipes added`,
  },
  {
    key: 'staff',
    label: 'Staff Roster',
    description:
      'Add team members you work with - sous chefs, servers, assistants - and their rates.',
    icon: Users2,
    href: '/onboarding/staff',
    ctaLabel: 'Add Staff',
    tourId: 'chef-setup-staff',
    doneSummary: (p) =>
      p.staff.count === 1 ? '1 staff member added' : `${p.staff.count} staff members added`,
    optional: true,
    archetypes: ['caterer', 'restaurant'],
  },
]

type WizardStep = { step_key: string; completed_at: string | null; skipped: boolean }

const WIZARD_STEP_LABELS: Record<string, string> = {
  profile: 'Profile',
  portfolio: 'Portfolio photos',
  first_menu: 'Menu',
  pricing: 'Pricing',
  connect_gmail: 'Gmail sync',
  first_event: 'First booking',
  chef_network: 'Chef network',
}

export function OnboardingHub({
  progress,
  archetype,
  wizardSteps = [],
}: {
  progress: OnboardingProgress
  archetype?: ArchetypeId | null
  wizardSteps?: WizardStep[]
}) {
  // Filter phases by archetype
  const visiblePhases = PHASES.filter((phase) => {
    if (!phase.archetypes) return true
    if (!archetype) return true
    return phase.archetypes.includes(archetype)
  })

  const visibleCompleted = visiblePhases.filter((phase) => {
    const val = progress[phase.key as keyof OnboardingProgress]
    if (typeof val === 'boolean') return val
    if (typeof val === 'object' && val !== null && 'done' in val)
      return (val as { done: boolean }).done
    return false
  }).length

  const pct = Math.round((visibleCompleted / visiblePhases.length) * 100)

  return (
    <div className="min-h-screen bg-stone-800">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <div data-tour="chef-onboarding-home">
          <p className="text-sm text-amber-400 font-medium mb-2">
            Your workspace is configured. Now bring in your data.
          </p>
          <h1 className="text-3xl font-bold text-stone-100">Set Up Your Business</h1>
          <p className="text-stone-300 mt-2">
            Import your existing clients, recipes, and loyalty program so ChefFlow knows your
            business from day one.
          </p>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-sm text-stone-300 mb-2">
            <span>
              {visibleCompleted} of {visiblePhases.length} phases complete
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

        {/* Wizard summary - acknowledge what was already configured */}
        {wizardSteps.length > 0 &&
          (() => {
            const completed = wizardSteps.filter(
              (s) => s.completed_at && !s.skipped && WIZARD_STEP_LABELS[s.step_key]
            )
            if (completed.length === 0) return null
            return (
              <div className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-3">
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
                  Already configured during setup
                </p>
                <div className="flex flex-wrap gap-2">
                  {completed.map((s) => (
                    <span
                      key={s.step_key}
                      className="inline-flex items-center gap-1 rounded-full bg-green-950 border border-green-800 px-2.5 py-0.5 text-xs text-green-400"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {WIZARD_STEP_LABELS[s.step_key]}
                    </span>
                  ))}
                </div>
              </div>
            )
          })()}

        {/* Phase cards */}
        <div className="space-y-4">
          {visiblePhases.map((phase) => {
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
                {...(phase.tourId ? { 'data-tour': phase.tourId } : {})}
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
