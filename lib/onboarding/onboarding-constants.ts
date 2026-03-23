// Shared constants for onboarding steps.
// Extracted from onboarding-actions.ts because 'use server' files cannot export
// non-async values (Next.js restriction).
//
// WIZARD_STEPS = the 3 required steps shown in the first-run wizard (fast path).
// ONBOARDING_STEPS = all steps including optional ones shown in the hub post-wizard.

export const ONBOARDING_STEPS = [
  {
    key: 'profile',
    title: 'Your Business',
    description: 'Business name, cuisine, service area',
    icon: 'user',
    optional: false,
  },
  {
    key: 'connect_gmail',
    title: 'Connect Gmail',
    description: 'Auto-import leads from Take a Chef, Bark, Thumbtack and more',
    icon: 'mail',
    optional: false,
  },
  {
    key: 'first_event',
    title: 'First Event',
    description: 'Create your first event',
    icon: 'calendar',
    optional: false,
  },
  {
    key: 'services',
    title: 'Your Services',
    description: 'What services you offer (private dining, meal prep, catering, classes)',
    icon: 'briefcase',
    optional: true,
  },
  {
    key: 'first_client',
    title: 'First Client',
    description: 'Add your first client (name, email, dietary)',
    icon: 'users',
    optional: true,
  },
  {
    key: 'first_recipe',
    title: 'First Recipe',
    description: 'Add your first recipe or import one',
    icon: 'book-open',
    optional: true,
  },
  {
    key: 'pricing',
    title: 'Pricing',
    description: 'Set base rates and pricing',
    icon: 'dollar-sign',
    optional: true,
  },
  {
    key: 'calendar',
    title: 'Availability',
    description: 'Set your availability and working hours',
    icon: 'clock',
    optional: true,
  },
  {
    key: 'communication',
    title: 'Communication',
    description: 'Set up email and inquiry preferences',
    icon: 'mail',
    optional: true,
  },
] as const

// The 3 required steps that must be completed before the wizard is considered done.
export const WIZARD_STEPS = ONBOARDING_STEPS.filter((s) => !s.optional)

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]['key']
