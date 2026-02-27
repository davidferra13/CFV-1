// Journey Test Helpers
// Shared utilities for the Remy Journey test suite.
// These tests verify every feature a chef would use in their first month.
// NO LLM invocation — tests verify UI mechanics and page functionality only.

import { type Page, expect } from '@playwright/test'

/**
 * Extended route map for journey tests.
 * Covers routes not in the base ROUTES constant.
 */
export const JOURNEY_ROUTES = {
  // Core
  dashboard: '/dashboard',
  events: '/events',
  eventsNew: '/events/new',
  eventsNewWizard: '/events/new/wizard',
  eventsNewFromText: '/events/new/from-text',
  eventsBoard: '/events/board',
  eventsUpcoming: '/events/upcoming',
  eventsConfirmed: '/events/confirmed',
  eventsCompleted: '/events/completed',
  eventsCancelled: '/events/cancelled',
  eventsAwaitingDeposit: '/events/awaiting-deposit',

  // Clients
  clients: '/clients',
  clientsNew: '/clients/new',
  clientsActive: '/clients/active',
  clientsInactive: '/clients/inactive',
  clientsVip: '/clients/vip',
  clientsCommunication: '/clients/communication',
  clientsHistory: '/clients/history',
  clientsPreferences: '/clients/preferences',
  clientsInsights: '/clients/insights',

  // Pipeline
  inquiries: '/inquiries',
  inquiriesNew: '/inquiries/new',
  inquiriesDeclined: '/inquiries/declined',
  quotes: '/quotes',
  quotesNew: '/quotes/new',
  quotesDraft: '/quotes/draft',
  quotesSent: '/quotes/sent',
  quotesAccepted: '/quotes/accepted',
  leads: '/leads',
  leadsNew: '/leads/new',
  calls: '/calls',
  proposals: '/proposals',
  testimonials: '/testimonials',
  prospecting: '/prospecting',

  // Culinary
  recipes: '/recipes',
  recipesNew: '/recipes/new',
  menus: '/menus',
  culinaryPrep: '/culinary/prep',
  culinaryCosting: '/culinary/costing',
  culinaryComponents: '/culinary/components',
  culinaryIngredients: '/culinary/ingredients',
  culinaryBoard: '/culinary-board',

  // Calendar
  calendar: '/calendar',
  calendarDay: '/calendar/day',
  calendarWeek: '/calendar/week',
  calendarYear: '/calendar/year',
  calendarShare: '/calendar/share',
  waitlist: '/waitlist',

  // Finance
  financials: '/financials',
  financeOverview: '/finance/overview',
  expenses: '/expenses',
  expensesNew: '/expenses/new',
  receipts: '/receipts',
  financeInvoices: '/finance/invoices',
  financePayments: '/finance/payments',
  financeLedger: '/finance/ledger',
  financeReporting: '/finance/reporting',
  financeTax: '/finance/tax',
  financeForecast: '/finance/forecast',
  financeCashFlow: '/finance/cash-flow',
  financeDisputes: '/finance/disputes',
  financePayouts: '/finance/payouts',

  // Operations
  daily: '/daily',
  tasks: '/tasks',
  tasksTemplates: '/tasks/templates',
  stations: '/stations',
  stationsDailyOps: '/stations/daily-ops',
  stationsOrders: '/stations/orders',
  stationsWaste: '/stations/waste',
  staff: '/staff',
  staffSchedule: '/staff/schedule',
  staffAvailability: '/staff/availability',
  staffPerformance: '/staff/performance',
  staffLabor: '/staff/labor',
  queue: '/queue',

  // Vendors & Inventory
  vendors: '/vendors',
  vendorsInvoices: '/vendors/invoices',
  vendorsPriceComparison: '/vendors/price-comparison',
  foodCost: '/food-cost',
  inventory: '/inventory',
  inventoryWaste: '/inventory/waste',
  inventoryExpiry: '/inventory/expiry',
  inventoryDemand: '/inventory/demand',

  // Analytics
  analytics: '/analytics',
  analyticsReports: '/analytics/reports',
  analyticsBenchmarks: '/analytics/benchmarks',
  analyticsPipeline: '/analytics/pipeline',
  analyticsDemand: '/analytics/demand',
  analyticsClientLtv: '/analytics/client-ltv',
  analyticsReferralSources: '/analytics/referral-sources',
  analyticsFunnel: '/analytics/funnel',
  insights: '/insights',
  insightsTimeAnalysis: '/insights/time-analysis',
  goals: '/goals',

  // Marketing
  marketing: '/marketing',
  marketingPushDinners: '/marketing/push-dinners',
  marketingSequences: '/marketing/sequences',
  marketingTemplates: '/marketing/templates',
  socialPlanner: '/social/planner',
  socialVault: '/social/vault',
  socialConnections: '/social/connections',

  // Network & Community
  network: '/network',
  communityTemplates: '/community/templates',

  // Safety & Compliance
  settingsCompliance: '/settings/compliance',
  settingsComplianceHaccp: '/settings/compliance/haccp',

  // Loyalty
  loyalty: '/loyalty',
  loyaltySettings: '/loyalty/settings',

  // Settings
  settings: '/settings',
  settingsModules: '/settings/modules',
  settingsNavigation: '/settings/navigation',
  settingsDashboard: '/settings/dashboard',
  settingsMyProfile: '/settings/my-profile',
  settingsPublicProfile: '/settings/public-profile',
  settingsIntegrations: '/settings/integrations',
  settingsTemplates: '/settings/templates',
  settingsAutomations: '/settings/automations',
  settingsContracts: '/settings/contracts',
  settingsEmbed: '/settings/embed',
  settingsAiPrivacy: '/settings/ai-privacy',
  settingsApiKeys: '/settings/api-keys',
  settingsBilling: '/settings/billing',
  settingsProtection: '/settings/protection',
  settingsProtectionInsurance: '/settings/protection/insurance',
  settingsProtectionCertifications: '/settings/protection/certifications',
  settingsChangePassword: '/settings/change-password',
  settingsAppearance: '/settings/appearance',
  settingsCustomFields: '/settings/custom-fields',
  settingsEventTypes: '/settings/event-types',
  settingsPortfolio: '/settings/portfolio',

  // Onboarding & Import
  onboarding: '/onboarding',
  onboardingClients: '/onboarding/clients',
  onboardingRecipes: '/onboarding/recipes',
  onboardingStaff: '/onboarding/staff',
  onboardingLoyalty: '/onboarding/loyalty',
  import: '/import',

  // Communication
  inbox: '/inbox',
  chat: '/chat',
  activity: '/activity',

  // Remy
  remy: '/remy',
  commands: '/commands',

  // AAR
  aar: '/aar',

  // Travel
  travel: '/travel',

  // Help
  help: '/help',

  // Cannabis
  cannabis: '/cannabis',

  // Guests & Partners
  guests: '/guests',
  partners: '/partners',
} as const

/**
 * Open the Remy drawer via the mascot button click.
 * Ctrl+K conflicts with the global search palette, so we click the mascot instead.
 * Waits for the drawer to become visible.
 */
export async function openRemyDrawer(page: Page): Promise<void> {
  // Click the Remy mascot button (bottom-right corner)
  const mascot = page.getByRole('button', { name: /toggle remy/i })
  await expect(mascot).toBeVisible({ timeout: 10_000 })
  await mascot.click()
  // Wait for the drawer to appear
  const drawer = page
    .locator('[role="dialog"]')
    .first()
    .or(page.locator('[data-remy-input]').first())
  await expect(drawer).toBeVisible({ timeout: 5_000 })
}

/**
 * Close the Remy drawer via Escape key.
 * Waits for the drawer to disappear.
 */
export async function closeRemyDrawer(page: Page): Promise<void> {
  await page.keyboard.press('Escape')
  // Wait for the input to disappear (drawer closed)
  const input = page.locator('[data-remy-input]')
  await expect(input).toBeHidden({ timeout: 5_000 })
}

/**
 * Assert a page loads successfully:
 * - Navigates to the URL
 * - Waits for DOM content loaded (networkidle is too fragile on dev servers)
 * - Confirms not redirected to sign-in
 * - Optionally checks for a heading pattern
 */
export async function assertPageLoads(
  page: Page,
  url: string,
  opts?: { titlePattern?: RegExp; timeout?: number }
): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  // Brief settle time for client-side hydration
  await page.waitForTimeout(2_000)
  expect(page.url()).not.toMatch(/auth\/signin/)

  if (opts?.titlePattern) {
    const heading = page
      .getByRole('heading', { name: opts.titlePattern })
      .first()
      .or(page.getByText(opts.titlePattern).first())
    await expect(heading).toBeVisible({ timeout: opts?.timeout ?? 10_000 })
  }
}

/**
 * Assert a page loads with no JS errors.
 */
export async function assertNoPageErrors(page: Page, url: string): Promise<void> {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  // Brief settle time for any hydration-triggered errors
  await page.waitForTimeout(3_000)

  expect(errors).toHaveLength(0)
}

/**
 * Assert page has meaningful content (not a blank white page).
 */
export async function assertPageHasContent(page: Page): Promise<void> {
  const bodyText = await page.locator('body').innerText()
  expect(bodyText.trim().length).toBeGreaterThan(50)
}

/**
 * Check if an element matching the selector exists on the page.
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  return page
    .locator(selector)
    .first()
    .isVisible()
    .catch(() => false)
}

/**
 * Navigate to a page and verify a specific UI element is present.
 * Returns the page for chaining.
 */
export async function navigateAndVerify(
  page: Page,
  url: string,
  verify: { text?: RegExp; role?: string; label?: RegExp }
): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(2_000)
  expect(page.url()).not.toMatch(/auth\/signin/)

  if (verify.text) {
    await expect(page.getByText(verify.text).first()).toBeVisible({ timeout: 10_000 })
  }
  if (verify.role && verify.label) {
    await expect(page.getByRole(verify.role as any, { name: verify.label }).first()).toBeVisible({
      timeout: 10_000,
    })
  }
}
