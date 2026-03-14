// Product Tour Configuration
// Defines the onboarding steps for each role. Steps are ordered by priority.
// Each step has a unique ID, display info, and a target element selector
// for the spotlight/tooltip to highlight.

export type TourStepId = string

export type TourStep = {
  id: TourStepId
  title: string
  description: string
  // CSS selector for the element to highlight (null = no spotlight, just checklist)
  target: string | null
  // Where the tooltip appears relative to the target
  placement: 'top' | 'bottom' | 'left' | 'right'
  // Route where this step is relevant (null = show on any page)
  route: string | null
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
  welcomeSubtitle: 'Your business command center. Here is a quick tour of the essentials.',
  welcomePoints: [
    'Manage events, clients, and finances in one place',
    'Get AI-powered insights from Remy, your concierge',
    'Track every dollar with the built-in ledger',
    'Send professional quotes and invoices to clients',
  ],
  steps: [
    {
      id: 'chef.dashboard',
      title: 'Your Dashboard',
      description:
        'This is your command center. Priority alerts, upcoming events, revenue stats, and AI insights all live here.',
      target: null,
      placement: 'bottom',
      route: '/dashboard',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/dashboard' },
    },
    {
      id: 'chef.create_event',
      title: 'Create Your First Event',
      description:
        'Events are the core of ChefFlow. Create one to start managing bookings, menus, and payments.',
      target: '[data-tour="create-event"]',
      placement: 'bottom',
      route: '/events',
      autoComplete: false,
    },
    {
      id: 'chef.add_client',
      title: 'Add a Client',
      description:
        'Import your existing clients or add new ones. Their dietary restrictions, allergies, and preferences are tracked automatically.',
      target: '[data-tour="add-client"]',
      placement: 'bottom',
      route: '/clients',
      autoComplete: false,
    },
    {
      id: 'chef.send_quote',
      title: 'Send a Quote',
      description:
        'Create professional quotes with line items, send them to clients, and track approval status.',
      target: null,
      placement: 'bottom',
      route: null,
      autoComplete: false,
    },
    {
      id: 'chef.add_recipe',
      title: 'Add a Recipe',
      description:
        'Build your recipe library with methods, timing, dietary tags, and food cost tracking.',
      target: '[data-tour="add-recipe"]',
      placement: 'bottom',
      route: '/recipes',
      autoComplete: false,
    },
    {
      id: 'chef.setup_payments',
      title: 'Set Up Payments',
      description:
        'Connect Stripe to accept payments directly from clients. Deposits, installments, and full payments are all supported.',
      target: null,
      placement: 'bottom',
      route: '/settings/payments',
      autoComplete: false,
    },
    {
      id: 'chef.explore_calendar',
      title: 'Check Your Calendar',
      description:
        'See all your events on a calendar view. Drag to reschedule, click to see details.',
      target: null,
      placement: 'bottom',
      route: '/calendar',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/calendar' },
    },
  ],
}

// ─── Client Tour ──────────────────────────────────────────────────────────────

export const CLIENT_TOUR: TourConfig = {
  role: 'client',
  welcomeTitle: 'Welcome to Your Portal',
  welcomeSubtitle: 'Everything about your private chef experience, in one place.',
  welcomePoints: [
    'View and manage your upcoming events',
    'Review and approve menus your chef prepares',
    'Pay invoices and track your spending',
    'Earn loyalty rewards with every booking',
  ],
  steps: [
    {
      id: 'client.my_events',
      title: 'Your Events',
      description:
        'All your upcoming and past events with your chef. View details, menus, and payment status.',
      target: null,
      placement: 'bottom',
      route: '/my-events',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/my-events' },
    },
    {
      id: 'client.view_quote',
      title: 'Review a Quote',
      description:
        'When your chef sends you a quote, it appears here. Review line items and approve or request changes.',
      target: null,
      placement: 'bottom',
      route: '/my-quotes',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/my-quotes' },
    },
    {
      id: 'client.make_payment',
      title: 'Make a Payment',
      description:
        'Pay deposits or full invoices securely through Stripe. Your payment history is always available.',
      target: null,
      placement: 'bottom',
      route: null,
      autoComplete: false,
    },
    {
      id: 'client.check_rewards',
      title: 'Loyalty Rewards',
      description:
        'Earn points with every booking. Check your tier, available rewards, and redemption history.',
      target: null,
      placement: 'bottom',
      route: '/my-rewards',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/my-rewards' },
    },
    {
      id: 'client.update_profile',
      title: 'Update Your Profile',
      description:
        'Keep your dietary restrictions, allergies, and contact info current so your chef can serve you best.',
      target: null,
      placement: 'bottom',
      route: '/my-profile',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/my-profile' },
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
  steps: [
    {
      id: 'staff.dashboard',
      title: 'Your Dashboard',
      description: 'See your upcoming shifts, active tasks, and quick stats at a glance.',
      target: null,
      placement: 'bottom',
      route: '/staff-dashboard',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/staff-dashboard' },
    },
    {
      id: 'staff.view_schedule',
      title: 'Your Schedule',
      description:
        'All your assigned shifts in one place. Confirm availability and see event details.',
      target: null,
      placement: 'bottom',
      route: '/staff-schedule',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/staff-schedule' },
    },
    {
      id: 'staff.check_tasks',
      title: 'Your Tasks',
      description: 'Prep lists, setup instructions, and task assignments for your upcoming events.',
      target: null,
      placement: 'bottom',
      route: '/staff-tasks',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/staff-tasks' },
    },
    {
      id: 'staff.browse_recipes',
      title: 'Recipe Library',
      description: 'Look up recipes, plating guides, and dietary notes for any dish on the menu.',
      target: null,
      placement: 'bottom',
      route: '/staff-recipes',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/staff-recipes' },
    },
  ],
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
