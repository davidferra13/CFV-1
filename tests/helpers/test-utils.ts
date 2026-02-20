// Test Utilities
// Adapted from legacy BillyBob8 patterns for ChefFlow V1

/**
 * Generate a unique email for test user creation.
 * Timestamp + random ensures no collisions across test runs.
 */
export function generateUniqueEmail(): string {
  const ts = Date.now()
  const rnd = Math.floor(Math.random() * 10000)
  return `test+${ts}${rnd}@example.com`
}

/**
 * Generate a valid password meeting Supabase auth requirements.
 */
export function generateValidPassword(): string {
  return 'TestPassword123!'
}

/**
 * Application routes — single source of truth for test navigation.
 */
export const ROUTES = {
  // Public
  home: '/',
  pricing: '/pricing',
  contact: '/contact',
  privacy: '/privacy',
  terms: '/terms',
  // Auth
  signIn: '/auth/signin',
  signUp: '/auth/signup',
  // Chef portal
  chefDashboard: '/dashboard',
  events: '/events',
  eventsNew: '/events/new',
  inquiries: '/inquiries',
  clients: '/clients',
  menus: '/menus',
  recipes: '/recipes',
  quotes: '/quotes',
  financials: '/financials',
  expenses: '/expenses',
  inbox: '/inbox',
  network: '/network',
  aar: '/aar',
  settings: '/settings',
  settingsProfile: '/settings/profile',
  settingsPublicProfile: '/settings/public-profile',
  settingsAutomations: '/settings/automations',
  settingsNotifications: '/settings/notifications',
  settingsDashboard: '/settings/dashboard',
  settingsNavigation: '/settings/navigation',
  settingsIntegrations: '/settings/integrations',
  settingsEmergency: '/settings/emergency',
  settingsCompliance: '/settings/compliance',
  // Client portal
  clientEvents: '/my-events',
  myQuotes: '/my-quotes',
  myChat: '/my-chat',
  myProfile: '/my-profile',
  myRewards: '/my-rewards',
  myInquiries: '/my-inquiries',
} as const

/**
 * Format cents to dollar string for assertions.
 */
export function formatCentsForAssertion(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Wait helper — use sparingly, prefer Playwright's built-in waiting.
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
