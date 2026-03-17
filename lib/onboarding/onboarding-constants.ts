// Shared constants for onboarding steps.
// Extracted from onboarding-actions.ts because 'use server' files cannot export
// non-async values (Next.js restriction).

export const ONBOARDING_STEPS = [
  {
    key: 'profile',
    title: 'Your Business',
    description: 'Business name, cuisine, service area',
    icon: 'user',
  },
  {
    key: 'services',
    title: 'Your Services',
    description: 'What services you offer (private dining, meal prep, catering, classes)',
    icon: 'briefcase',
  },
  {
    key: 'first_client',
    title: 'First Client',
    description: 'Add your first client (name, email, dietary)',
    icon: 'users',
  },
  {
    key: 'first_recipe',
    title: 'First Recipe',
    description: 'Add your first recipe or import one',
    icon: 'book-open',
  },
  {
    key: 'first_event',
    title: 'First Event',
    description: 'Create your first event',
    icon: 'calendar',
  },
  {
    key: 'pricing',
    title: 'Pricing',
    description: 'Set base rates and pricing',
    icon: 'dollar-sign',
  },
  {
    key: 'calendar',
    title: 'Availability',
    description: 'Set your availability and working hours',
    icon: 'clock',
  },
  {
    key: 'communication',
    title: 'Communication',
    description: 'Set up email and inquiry preferences',
    icon: 'mail',
  },
] as const

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]['key']
