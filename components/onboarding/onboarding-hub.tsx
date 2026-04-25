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
  Mail,
  FileText,
  CalendarDays,
  ClipboardList,
  Receipt,
} from '@/components/ui/icons'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type {
  FirstWeekActivationStepKey,
  FirstWeekActivationStep,
} from '@/lib/onboarding/first-week-activation'
import type { OnboardingProgress } from '@/lib/onboarding/progress-actions'
import type { ArchetypeId } from '@/lib/archetypes/presets'

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

const STEP_ICONS: Record<FirstWeekActivationStepKey, React.ElementType> = {
  profile_ready: User,
  lead_captured: Mail,
  quote_sent: FileText,
  event_created: CalendarDays,
  prep_started: ClipboardList,
  invoice_ready: Receipt,
}

const STEP_CTA: Record<FirstWeekActivationStepKey, string> = {
  profile_ready: 'Finish Setup',
  lead_captured: 'Capture Lead',
  quote_sent: 'Create Quote',
  event_created: 'Create Event',
  prep_started: 'Open Events',
  invoice_ready: 'Open Invoices',
}

type SecondarySetupItem = {
  key: string
  label: string
  description: string
  href: string
  ctaLabel: string
  done: boolean
  doneSummary: string
  icon: React.ElementType
  optional?: boolean
  archetypes?: ArchetypeId[]
  tourId?: string
}

function getSecondarySetupItems(
  progress: OnboardingProgress,
  archetype?: ArchetypeId | null
): SecondarySetupItem[] {
  const items: SecondarySetupItem[] = [
    {
      key: 'clients',
      label: 'Client import',
      description: 'Bring over existing clients, contact details, dietary notes, and history.',
      href: '/onboarding/clients',
      ctaLabel: 'Import Clients',
      done: progress.secondarySetup.clientsImported,
      doneSummary:
        progress.secondarySetup.clientsCount === 1
          ? '1 client available'
          : `${progress.secondarySetup.clientsCount} clients available`,
      icon: Users,
      tourId: 'chef-import-clients',
    },
    {
      key: 'recipes',
      label: 'Recipe library',
      description: 'Add recipes, timing, dietary tags, and yield for dishes you cook often.',
      href: '/onboarding/recipes',
      ctaLabel: 'Add Recipes',
      done: progress.secondarySetup.recipesAdded,
      doneSummary:
        progress.secondarySetup.recipesCount === 1
          ? '1 recipe added'
          : `${progress.secondarySetup.recipesCount} recipes added`,
      icon: BookOpen,
      tourId: 'chef-add-recipes',
    },
    {
      key: 'loyalty',
      label: 'Loyalty program',
      description: 'Configure rewards once the first paid loop is no longer the main gap.',
      href: '/onboarding/loyalty',
      ctaLabel: 'Set Up Loyalty',
      done: progress.secondarySetup.loyaltyConfigured,
      doneSummary: 'Loyalty program configured',
      icon: Star,
      tourId: 'chef-setup-loyalty',
    },
    {
      key: 'staff',
      label: 'Staff roster',
      description: 'Add sous chefs, servers, assistants, and rates for team-based work.',
      href: '/onboarding/staff',
      ctaLabel: 'Add Staff',
      done: progress.secondarySetup.staffAdded,
      doneSummary:
        progress.secondarySetup.staffCount === 1
          ? '1 staff member added'
          : `${progress.secondarySetup.staffCount} staff members added`,
      icon: Users2,
      optional: true,
      archetypes: ['caterer', 'restaurant'],
      tourId: 'chef-setup-staff',
    },
  ]

  return items.filter((item) => {
    if (!item.archetypes) return true
    if (!archetype) return true
    return item.archetypes.includes(archetype)
  })
}

function ActivationCard({ step }: { step: FirstWeekActivationStep }) {
  const Icon = STEP_ICONS[step.key]

  return (
    <Card className={step.done ? 'border-green-200 bg-green-950' : 'bg-stone-900'}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-base font-semibold">
          <div className={`p-2 rounded-lg ${step.done ? 'bg-green-900' : 'bg-stone-800'}`}>
            <Icon className={`h-4 w-4 ${step.done ? 'text-green-600' : 'text-stone-300'}`} />
          </div>
          <span className="flex-1">{step.label}</span>
          {step.done ? (
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
          ) : (
            <Circle className="h-5 w-5 text-stone-300 flex-shrink-0" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-stone-300">{step.description}</p>
          {step.evidenceLabel && (
            <p className={`text-sm font-medium ${step.done ? 'text-green-700' : 'text-stone-400'}`}>
              {step.evidenceLabel}
            </p>
          )}
        </div>
        <Link href={step.href} className="flex-shrink-0">
          <Button variant={step.done ? 'secondary' : 'primary'} className="whitespace-nowrap">
            {step.done ? 'Open' : STEP_CTA[step.key]}
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
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
  const pct = Math.round((progress.completedSteps / progress.totalSteps) * 100)
  const secondaryItems = getSecondarySetupItems(progress, archetype)

  return (
    <div className="min-h-screen bg-stone-800">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div data-tour="chef-onboarding-home">
          <p className="text-sm text-amber-400 font-medium mb-2">Run the first booking loop.</p>
          <h1 className="text-3xl font-bold text-stone-100">Activate Your First Week</h1>
          <p className="text-stone-300 mt-2">
            Finish the path ChefFlow needs to prove value: profile, lead, quote, event, prep, and
            invoice.
          </p>
        </div>

        <div>
          <div className="flex justify-between text-sm text-stone-300 mb-2">
            <span>
              {progress.completedSteps} of {progress.totalSteps} activation steps complete
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

        {progress.nextStep && (
          <div className="rounded-lg border border-amber-700 bg-amber-950/40 px-4 py-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-amber-200">Next activation step</p>
              <p className="text-sm text-amber-100">{progress.nextStep.label}</p>
            </div>
            <Link href={progress.nextStep.href}>
              <Button variant="primary" className="whitespace-nowrap">
                Continue
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        )}

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

        <div className="space-y-4">
          {progress.steps.map((step) => (
            <ActivationCard key={step.key} step={step} />
          ))}
        </div>

        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">More setup you can do next</h2>
            <p className="text-sm text-stone-400">
              These tools stay available, but they do not block the first paid workflow.
            </p>
          </div>
          <div className="space-y-3">
            {secondaryItems.map((item) => {
              const Icon = item.icon
              return (
                <Card
                  key={item.key}
                  className={item.done ? 'border-stone-700 bg-stone-900/70' : 'bg-stone-900'}
                  {...(item.tourId ? { 'data-tour': item.tourId } : {})}
                >
                  <CardContent className="flex items-center justify-between gap-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-stone-800">
                        <Icon className="h-4 w-4 text-stone-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-stone-100">{item.label}</p>
                          {item.optional && (
                            <span className="text-xs text-stone-400">Optional</span>
                          )}
                        </div>
                        <p className="text-sm text-stone-400">{item.description}</p>
                        {item.done && (
                          <p className="text-sm font-medium text-green-700">{item.doneSummary}</p>
                        )}
                      </div>
                    </div>
                    <Link href={item.href} className="flex-shrink-0">
                      <Button
                        variant={item.done ? 'secondary' : 'ghost'}
                        className="whitespace-nowrap"
                      >
                        {item.done ? 'Edit' : item.ctaLabel}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        <div className="pt-4 border-t border-stone-700 flex items-center justify-between">
          <p className="text-sm text-stone-500">
            You can return here any time from the Settings menu.
          </p>
          <Link href="/dashboard">
            <Button variant="ghost">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
