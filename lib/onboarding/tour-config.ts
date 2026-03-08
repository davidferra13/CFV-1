// Product Tour Configuration
// Defines interactive walkthrough steps for each role. Each step navigates
// to a real page, highlights a real UI element, and shows an animated cursor
// pointing at what to click.

export type TourStepId = string

export type TourStep = {
  id: TourStepId
  title: string
  description: string
  // CSS selector for the element to highlight (null = page overview, no spotlight)
  target: string | null
  // Where the tooltip appears relative to the target
  placement: 'top' | 'bottom' | 'left' | 'right'
  // Route to navigate to before showing this step
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
  welcomeSubtitle:
    'Let us walk you through the essentials. We will show you exactly where everything is.',
  welcomePoints: [
    'We will guide you through each page with a visual walkthrough',
    'A cursor will point to each feature as we explain it',
    'You can click highlighted elements to try them, or skip ahead',
    'Takes about 2 minutes. You can replay it anytime from Settings.',
  ],
  steps: [
    {
      id: 'chef.dashboard',
      title: 'Your Command Center',
      description:
        'This is your dashboard. Priority alerts, upcoming events, revenue, and AI insights are all visible at a glance. No clicking required to see your numbers.',
      target: '[data-tour="dashboard-header"]',
      placement: 'bottom',
      route: '/dashboard',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/dashboard' },
    },
    {
      id: 'chef.shortcuts',
      title: 'Quick Actions',
      description:
        'These shortcuts give you one-tap access to the things you do most. Briefings, inbox, calendar, and more.',
      target: '[data-tour="shortcut-strip"]',
      placement: 'bottom',
      route: '/dashboard',
      autoComplete: false,
    },
    {
      id: 'chef.sidebar',
      title: 'Your Navigation',
      description:
        'The sidebar has everything organized by category: Sales, Clients, Events, Culinary, Finance, and more. It collapses into a rail on smaller screens.',
      target: '[data-tour="sidebar-nav"]',
      placement: 'right',
      route: '/dashboard',
      autoComplete: false,
    },
    {
      id: 'chef.create_event',
      title: 'Create Your First Event',
      description:
        'Events are the core of ChefFlow. Click this button to create one. It will walk you through date, location, menu, and pricing.',
      target: '[data-tour="create-event"]',
      placement: 'bottom',
      route: '/events',
      autoComplete: false,
    },
    {
      id: 'chef.add_client',
      title: 'Add a Client',
      description:
        'Import existing clients or add new ones here. Their dietary restrictions, allergies, and preferences are tracked automatically across all events.',
      target: '[data-tour="add-client"]',
      placement: 'bottom',
      route: '/clients',
      autoComplete: false,
    },
    {
      id: 'chef.add_recipe',
      title: 'Build Your Recipe Library',
      description:
        'Add your recipes here with methods, timing, dietary tags, and food cost tracking. Your recipe book is private and never shared.',
      target: '[data-tour="add-recipe"]',
      placement: 'bottom',
      route: '/recipes',
      autoComplete: false,
    },
    {
      id: 'chef.meet_remy',
      title: 'Meet Remy, Your AI Concierge',
      description:
        'Remy helps you with tasks like checking revenue, finding client info, drafting emails, and more. Click this button anytime to chat with Remy.',
      target: '[data-tour="remy-button"]',
      placement: 'right',
      route: '/dashboard',
      autoComplete: false,
    },
    {
      id: 'chef.explore_calendar',
      title: 'Your Calendar',
      description:
        'See all your events on a calendar. Day, week, and year views are available. Click any event to see its details.',
      target: '[data-tour="calendar-view"]',
      placement: 'left',
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
  welcomeSubtitle: 'Let us show you around. This is where you manage everything with your chef.',
  welcomePoints: [
    'We will walk you through each section step by step',
    'A cursor will point to each feature as we explain it',
    'Click any highlighted element to try it out',
    'Takes about a minute. You can replay anytime.',
  ],
  steps: [
    {
      id: 'client.my_events',
      title: 'Your Events',
      description:
        'All your upcoming and past events with your chef. View details, menus, and payment status for each one.',
      target: '[data-tour="client-events"]',
      placement: 'bottom',
      route: '/my-events',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/my-events' },
    },
    {
      id: 'client.view_quote',
      title: 'Review Quotes',
      description:
        'When your chef sends you a quote, it appears here. Review line items and approve or request changes.',
      target: '[data-tour="client-quotes"]',
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
      target: '[data-tour="client-rewards"]',
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
      target: '[data-tour="client-profile"]',
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
  welcomeSubtitle: 'Here is a quick walkthrough of your tools.',
  welcomePoints: [
    'We will show you where everything is',
    'Your schedule, tasks, and recipes are all here',
    'Takes less than a minute',
  ],
  steps: [
    {
      id: 'staff.dashboard',
      title: 'Your Dashboard',
      description: 'See your upcoming shifts, active tasks, and quick stats at a glance.',
      target: '[data-tour="staff-dashboard"]',
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
      target: '[data-tour="staff-schedule"]',
      placement: 'bottom',
      route: '/staff-schedule',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/staff-schedule' },
    },
    {
      id: 'staff.check_tasks',
      title: 'Your Tasks',
      description: 'Prep lists, setup instructions, and task assignments for your upcoming events.',
      target: '[data-tour="staff-tasks"]',
      placement: 'bottom',
      route: '/staff-tasks',
      autoComplete: true,
      completionCheck: { type: 'route_visited', value: '/staff-tasks' },
    },
    {
      id: 'staff.browse_recipes',
      title: 'Recipe Library',
      description: 'Look up recipes, plating guides, and dietary notes for any dish on the menu.',
      target: '[data-tour="staff-recipes"]',
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
