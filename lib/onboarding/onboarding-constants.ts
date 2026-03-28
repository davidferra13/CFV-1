// Shared constants for setup steps (formerly "onboarding").
// Extracted from onboarding-actions.ts because 'use server' files cannot export
// non-async values (Next.js restriction).
//
// WIZARD_STEPS = the 6 steps shown in the first-run setup wizard (all skippable).
// ONBOARDING_STEPS = all steps including post-wizard hub items.

export const ONBOARDING_STEPS = [
  {
    key: 'profile',
    title: 'Your Profile',
    description: 'Photo, business name, cuisines, location, website, bio',
    icon: 'user',
    optional: false,
  },
  {
    key: 'portfolio',
    title: 'Your Food',
    description: 'Upload photos of your best dishes and events',
    icon: 'camera',
    optional: false,
  },
  {
    key: 'first_menu',
    title: 'Your First Menu',
    description: 'Create a menu with a few dishes to get started',
    icon: 'utensils',
    optional: false,
  },
  {
    key: 'pricing',
    title: 'Your Pricing',
    description: 'Set base rates so clients know what to expect',
    icon: 'dollar-sign',
    optional: false,
  },
  {
    key: 'connect_gmail',
    title: 'Connect Your Inbox',
    description: 'Auto-import inquiries from your email inbox',
    icon: 'mail',
    optional: false,
  },
  {
    key: 'first_event',
    title: 'Your First Booking',
    description: 'Create your first event or booking',
    icon: 'calendar',
    optional: false,
  },
  // Post-wizard hub steps (not shown in wizard)
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

// The 5 wizard steps. All are skippable; only business name is truly required.
export const WIZARD_STEPS = ONBOARDING_STEPS.filter((s) => !s.optional)

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]['key']

// US states for location dropdown
export const US_STATES = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
  'District of Columbia',
  'Other (International)',
] as const
