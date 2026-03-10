// Product Tour Configuration
// Every step must point at a real, intentional onboarding hook in the live UI.

export type TourStepId = string
export type TourPlacement = 'top' | 'bottom' | 'left' | 'right'
export type TourInteractionMode = 'observe' | 'click'
export type TourViewport = 'any' | 'desktop' | 'mobile'

export type TourPrepareAction = {
  type: 'click'
  target: string | string[]
  delayMs?: number
}

export type TourStep = {
  id: TourStepId
  title: string
  description: string
  // CSS selector(s) for the element to highlight. The first verified match wins.
  target: string | string[]
  placement: TourPlacement
  // Route that must be loaded before showing the step.
  route: string
  // Most steps should require an exact page match. Prefix is only for nested flows.
  routeMatch?: 'exact' | 'prefix'
  // Whether the highlighted target is informational or should be clicked.
  interactionMode?: TourInteractionMode
  // Optional actions to run before verifying the target. Used for mobile menus,
  // accordions, tabs, and other conditional UI that must be opened first.
  prepare?: TourPrepareAction[]
  // Limit a step to a viewport family when the UI differs across breakpoints.
  viewport?: TourViewport
  // Verification timeout before the step is blocked and skipped.
  timeoutMs?: number
}

export type TourConfig = {
  role: 'chef' | 'client' | 'staff'
  welcomeTitle: string
  welcomeSubtitle: string
  welcomePoints: string[]
  steps: TourStep[]
}

export const CHEF_TOUR: TourConfig = {
  role: 'chef',
  welcomeTitle: 'Welcome to ChefFlow',
  welcomeSubtitle:
    'This walkthrough only points to real interface elements that are currently on screen.',
  welcomePoints: [
    'Each step verifies the page before it shows',
    'Only visible, grounded interface targets are highlighted',
    'The tour skips anything that is not available in your current UI state',
    'You can replay it later from Settings',
  ],
  steps: [
    {
      id: 'chef.dashboard',
      title: 'Your Dashboard',
      description:
        'Start here for your daily view of priorities, quick actions, and the rest of the portal.',
      target: '[data-tour="dashboard-header"]',
      placement: 'bottom',
      route: '/dashboard',
      routeMatch: 'exact',
      interactionMode: 'observe',
    },
    {
      id: 'chef.shortcuts',
      title: 'Quick Actions',
      description:
        'This shortcut strip gives you direct access to the core working areas you will use most.',
      target: '[data-tour="shortcut-strip"]',
      placement: 'bottom',
      route: '/dashboard',
      routeMatch: 'exact',
      interactionMode: 'observe',
    },
    {
      id: 'chef.sidebar',
      title: 'Navigation',
      description:
        'Your main navigation is where ChefFlow groups the rest of the product by workflow area.',
      target: ['[data-tour="sidebar-nav"]', '[data-tour="chef-mobile-menu-panel"]'],
      placement: 'right',
      route: '/dashboard',
      routeMatch: 'exact',
      interactionMode: 'observe',
      prepare: [
        {
          type: 'click',
          target: '[data-tour="chef-mobile-menu-toggle"]',
          delayMs: 150,
        },
      ],
      timeoutMs: 3000,
    },
    {
      id: 'chef.create_event',
      title: 'Create an Event',
      description:
        'Use this action to start a new event workflow with date, location, menu, and pricing.',
      target: '[data-tour="create-event"]',
      placement: 'bottom',
      route: '/events',
      routeMatch: 'exact',
      interactionMode: 'observe',
    },
    {
      id: 'chef.add_client',
      title: 'Add a Client',
      description:
        'This action takes you into client management so you can add or import the people you serve.',
      target: '[data-tour="add-client"]',
      placement: 'bottom',
      route: '/clients',
      routeMatch: 'exact',
      interactionMode: 'observe',
    },
    {
      id: 'chef.add_recipe',
      title: 'Build Your Recipe Library',
      description:
        'Create recipes here so ChefFlow can support production, menus, and cost tracking.',
      target: '[data-tour="add-recipe"]',
      placement: 'bottom',
      route: '/recipes',
      routeMatch: 'exact',
      interactionMode: 'observe',
    },
    {
      id: 'chef.explore_calendar',
      title: 'Calendar',
      description:
        'The calendar gives you a schedule view of events and availability across your business.',
      target: '[data-tour="calendar-view"]',
      placement: 'left',
      route: '/calendar',
      routeMatch: 'exact',
      interactionMode: 'observe',
    },
  ],
}

export const CLIENT_TOUR: TourConfig = {
  role: 'client',
  welcomeTitle: 'Welcome to Your Client Portal',
  welcomeSubtitle:
    'This walkthrough follows the real pages in your portal, one verified step at a time.',
  welcomePoints: [
    'Each step is tied to a live page section',
    'Only current, visible interface sections are highlighted',
    'Nothing is shown from assumptions or hidden states',
    'You can replay this tour later if you want a refresher',
  ],
  steps: [
    {
      id: 'client.my_events',
      title: 'My Events',
      description:
        'This page is your main hub for upcoming bookings, event activity, and dashboard widgets.',
      target: '[data-tour="client-events"]',
      placement: 'bottom',
      route: '/my-events',
      routeMatch: 'exact',
      interactionMode: 'observe',
    },
    {
      id: 'client.view_quote',
      title: 'My Quotes',
      description:
        'Use this page to review quotes from your chef and respond when a proposal is ready.',
      target: '[data-tour="client-quotes"]',
      placement: 'bottom',
      route: '/my-quotes',
      routeMatch: 'exact',
      interactionMode: 'observe',
    },
    {
      id: 'client.check_rewards',
      title: 'Rewards',
      description:
        'This page shows your loyalty progress, available rewards, and recent rewards activity.',
      target: '[data-tour="client-rewards"]',
      placement: 'bottom',
      route: '/my-rewards',
      routeMatch: 'exact',
      interactionMode: 'observe',
    },
    {
      id: 'client.update_profile',
      title: 'Profile',
      description: 'Keep your personal details and dining preferences up to date on this page.',
      target: '[data-tour="client-profile"]',
      placement: 'bottom',
      route: '/my-profile',
      routeMatch: 'exact',
      interactionMode: 'observe',
    },
  ],
}

export const STAFF_TOUR: TourConfig = {
  role: 'staff',
  welcomeTitle: 'Welcome to the Staff Portal',
  welcomeSubtitle: 'This walkthrough stays grounded in the live staff tools you can actually use.',
  welcomePoints: [
    'Every step checks the real page before it appears',
    'Only visible staff portal sections are highlighted',
    'Conditional or missing UI is skipped instead of guessed',
    'Replay is available if you need the walkthrough again',
  ],
  steps: [
    {
      id: 'staff.dashboard',
      title: 'Dashboard',
      description:
        'This page gives you the top-level view of today, your assignments, and your stations.',
      target: '[data-tour="staff-dashboard"]',
      placement: 'bottom',
      route: '/staff-dashboard',
      routeMatch: 'exact',
      interactionMode: 'observe',
    },
    {
      id: 'staff.view_schedule',
      title: 'Schedule',
      description: 'Use this page to see your upcoming event assignments and their current status.',
      target: '[data-tour="staff-schedule"]',
      placement: 'bottom',
      route: '/staff-schedule',
      routeMatch: 'exact',
      interactionMode: 'observe',
    },
    {
      id: 'staff.check_tasks',
      title: 'Tasks',
      description:
        'This page groups your assigned work by day so you can track what still needs attention.',
      target: '[data-tour="staff-tasks"]',
      placement: 'bottom',
      route: '/staff-tasks',
      routeMatch: 'exact',
      interactionMode: 'observe',
    },
    {
      id: 'staff.browse_recipes',
      title: 'Recipes',
      description:
        'This page gives staff access to the working recipe library and station-filtered views.',
      target: '[data-tour="staff-recipes"]',
      placement: 'bottom',
      route: '/staff-recipes',
      routeMatch: 'exact',
      interactionMode: 'observe',
    },
  ],
}

export const TOUR_CONFIGS: Record<string, TourConfig> = {
  chef: CHEF_TOUR,
  client: CLIENT_TOUR,
  staff: STAFF_TOUR,
}

export function getTourConfig(role: string): TourConfig | null {
  return TOUR_CONFIGS[role] ?? null
}
