// Product Tour Configuration
// Defines the onboarding steps for each role. Steps are ordered by priority.
// Each step has a unique ID, display info, and a target element selector
// for the spotlight/tooltip to highlight.

export type TourStepId = string

export type TourStep = {
  id: TourStepId
  title: string
  description: string
  // CSS selector for the dedicated element to highlight
  target: string
  // Where the tooltip appears relative to the target
  placement: 'top' | 'bottom' | 'left' | 'right'
  // Route where this step is relevant
  route: string
  // Whether this step can be auto-completed by detecting real usage
  autoComplete: boolean
  // The action/page that completes this step (for auto-detection)
  completionCheck?: {
    type: 'route_visited' | 'element_exists' | 'manual'
    value?: string
  }
}

export type TourConfig = {
  role: 'chef' | 'client' | 'staff'
  welcomeTitle: string
  welcomeSubtitle: string
  welcomePoints: string[]
  steps: TourStep[]
}

// ─── Chef Tour ────────────────────────────────────────────────────────────────

export const CHEF_TOUR: TourConfig = {
  role: 'chef',
  welcomeTitle: 'Welcome to ChefFlow',
  welcomeSubtitle: 'Complete your setup and migrate the core pieces of your business.',
  welcomePoints: [
    'Finish your account setup and payment readiness',
    'Import existing clients before sending portal invites',
    'Seed your recipe library so future proposals start with real dishes',
    'Configure loyalty history once so balances stay accurate',
  ],
  steps: [
    {
      id: 'chef.onboarding',
      title: 'Setup Overview',
      description:
        'Start here to finish the core setup flow, review your migration progress, and unlock the rest of the product.',
      target: '[data-tour="chef-onboarding-home"]',
      placement: 'bottom',
      route: '/onboarding',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/onboarding' },
    },
    {
      id: 'chef.import_clients',
      title: 'Import Your Clients',
      description:
        'Bring over your real client list first so future booking, loyalty, and communication data starts clean.',
      target: '[data-tour="chef-import-clients"]',
      placement: 'bottom',
      route: '/onboarding/clients',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/onboarding/clients' },
    },
    {
      id: 'chef.add_recipe',
      title: 'Seed Your Recipe Library',
      description:
        'Add your core dishes now so proposals, costing, and future event planning have real culinary data to work from.',
      target: '[data-tour="chef-add-recipes"]',
      placement: 'bottom',
      route: '/onboarding/recipes',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/onboarding/recipes' },
    },
    {
      id: 'chef.setup_staff',
      title: 'Add Your Team',
      description:
        'Capture your regular crew during setup so staffing and future event assignments do not start from zero.',
      target: '[data-tour="chef-setup-staff"]',
      placement: 'bottom',
      route: '/onboarding/staff',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/onboarding/staff' },
    },
    {
      id: 'chef.configure_loyalty',
      title: 'Set Up Loyalty History',
      description:
        'Load your reward rules and historical balances once so the loyalty ledger starts in a trustworthy state.',
      target: '[data-tour="chef-setup-loyalty"]',
      placement: 'bottom',
      route: '/onboarding/loyalty',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/onboarding/loyalty' },
    },
  ],
}

// ─── Client Tour ──────────────────────────────────────────────────────────────

export const CLIENT_TOUR: TourConfig = {
  role: 'client',
  welcomeTitle: 'Welcome to Your Portal',
  welcomeSubtitle: 'Keep your profile accurate so your chef can plan around real preferences.',
  welcomePoints: [
    'Update dietary needs and household details in one place',
    'Share how you want to collaborate on meals and recommendations',
    'Control when ChefFlow sends planning-related notifications',
    'Send feedback directly from your portal profile',
  ],
  steps: [
    {
      id: 'client.update_profile',
      title: 'Update Your Profile',
      description:
        'Keep your dietary restrictions, allergies, and contact info current so your chef can serve you best.',
      target: '[data-tour="client-update-profile"]',
      placement: 'bottom',
      route: '/my-profile',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/my-profile' },
    },
    {
      id: 'client.notification_preferences',
      title: 'Notification Preferences',
      description:
        'Choose whether ChefFlow can nudge you about schedule and planning signals from your chef.',
      target: '[data-tour="client-notification-preferences"]',
      placement: 'bottom',
      route: '/my-profile',
      autoComplete: false,
    },
    {
      id: 'client.share_feedback',
      title: 'Share Feedback',
      description: 'Tell the team what is working and what is not without leaving your portal.',
      target: '[data-tour="client-share-feedback"]',
      placement: 'bottom',
      route: '/my-profile',
      autoComplete: false,
    },
  ],
}

// ─── Staff Tour ───────────────────────────────────────────────────────────────

export const STAFF_TOUR: TourConfig = {
  role: 'staff',
  welcomeTitle: 'Welcome to Staff Portal',
  welcomeSubtitle: 'See your schedule, tasks, and recipes for upcoming events.',
  welcomePoints: [
    'View your assigned shifts and events',
    'Check prep tasks and station assignments',
    'Look up recipes and plating instructions',
    'Confirm your availability',
  ],
  steps: [],
}

// ─── Lookup ───────────────────────────────────────────────────────────────────

export const TOUR_CONFIGS: Record<string, TourConfig> = {
  chef: CHEF_TOUR,
  client: CLIENT_TOUR,
  staff: STAFF_TOUR,
}

export function getTourConfig(role: string): TourConfig | null {
  return TOUR_CONFIGS[role] ?? null
}
