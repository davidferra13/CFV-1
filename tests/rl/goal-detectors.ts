// Goal Detectors - Determine if an archetype's goal has been achieved.
// Each detector checks page state to confirm task completion.

import { Page } from '@playwright/test'

type GoalDetector = (page: Page) => Promise<boolean>

/**
 * Registry of goal completion detectors.
 * Each goal ID maps to a function that checks if the goal was achieved.
 */
export const goalDetectors: Record<string, GoalDetector> = {
  // ── Navigation Goals (verify the agent reached the target section) ─────

  navigate_to_inquiries: async (page) => {
    return page.url().includes('/inquiries')
  },

  navigate_to_events: async (page) => {
    return page.url().includes('/events') && !page.url().includes('/my-events')
  },

  navigate_to_clients: async (page) => {
    return page.url().includes('/clients')
  },

  navigate_to_quotes: async (page) => {
    return page.url().includes('/quotes')
  },

  navigate_to_financials: async (page) => {
    return page.url().includes('/financials')
  },

  navigate_to_calendar: async (page) => {
    return page.url().includes('/calendar')
  },

  navigate_to_settings: async (page) => {
    return page.url().includes('/settings')
  },

  navigate_to_recipes: async (page) => {
    return page.url().includes('/recipes') || page.url().includes('/culinary')
  },

  navigate_to_menus: async (page) => {
    return page.url().includes('/menus') || page.url().includes('/culinary')
  },

  navigate_to_staff: async (page) => {
    return page.url().includes('/staff')
  },

  navigate_to_analytics: async (page) => {
    return page.url().includes('/analytics')
  },

  navigate_to_expenses: async (page) => {
    return page.url().includes('/expenses')
  },

  navigate_to_dashboard: async (page) => {
    return page.url().includes('/dashboard')
  },

  navigate_to_profile: async (page) => {
    return page.url().includes('/my-profile') || page.url().includes('/settings/profile')
  },

  // ── Exploration Goals ──────────────────────────────────────────────────

  explore_dashboard_widgets: async (page) => {
    // Goal: visit dashboard and interact with at least one widget
    if (!page.url().includes('/dashboard')) return false
    const widgets = await page
      .locator('[data-widget], .dashboard-widget, .collapsible-widget')
      .count()
      .catch(() => 0)
    return widgets > 0
  },

  explore_all_nav_sections: async (page) => {
    // This is tracked across the episode by the controller, not single-page
    // Returns true if we've visited 5+ distinct route groups
    return false // Handled by the episode runner
  },

  // ── Task Goals ─────────────────────────────────────────────────────────

  create_new_event: async (page) => {
    return page.url().includes('/events/new') || page.url().includes('/events/create')
  },

  view_client_list: async (page) => {
    if (!page.url().includes('/clients')) return false
    // Check there's a list or table visible
    const hasContent =
      (await page
        .locator('table, [role="table"], .client-list, .client-card')
        .count()
        .catch(() => 0)) > 0
    return hasContent
  },

  view_event_list: async (page) => {
    if (!page.url().includes('/events')) return false
    const hasContent =
      (await page
        .locator('table, [role="table"], .event-list, .event-card')
        .count()
        .catch(() => 0)) > 0
    return hasContent
  },

  check_financial_summary: async (page) => {
    if (!page.url().includes('/financials')) return false
    // Check for financial data display
    const hasFinancials =
      (await page
        .locator('text=/\\$|revenue|income|expense/i')
        .count()
        .catch(() => 0)) > 0
    return hasFinancials
  },

  view_recipe_book: async (page) => {
    return page.url().includes('/recipes') || page.url().includes('/culinary')
  },

  check_client_dietary: async (page) => {
    if (!page.url().includes('/clients/')) return false
    // Check for dietary info on client detail page
    const hasDietary =
      (await page
        .locator('text=/dietary|allerg|restriction/i')
        .count()
        .catch(() => 0)) > 0
    return hasDietary
  },

  check_staff_schedule: async (page) => {
    return page.url().includes('/staff')
  },

  view_analytics_dashboard: async (page) => {
    if (!page.url().includes('/analytics')) return false
    // Check for charts or data visualization
    const hasCharts =
      (await page
        .locator('svg, canvas, .recharts-wrapper, [data-chart]')
        .count()
        .catch(() => 0)) > 0
    return hasCharts
  },

  // ── Client Portal Goals ────────────────────────────────────────────────

  view_my_events: async (page) => {
    return page.url().includes('/my-events')
  },

  view_event_detail: async (page) => {
    // Client viewing a specific event
    return /\/my-events\/[^/]+/.test(page.url()) || /\/events\/[^/]+/.test(page.url())
  },
}

/**
 * Check if a goal has been achieved.
 * Returns false for unknown goals.
 */
export async function checkGoal(goalId: string, page: Page): Promise<boolean> {
  const detector = goalDetectors[goalId]
  if (!detector) return false

  try {
    return await detector(page)
  } catch {
    return false
  }
}

/**
 * Get all known goal IDs.
 */
export function getKnownGoals(): string[] {
  return Object.keys(goalDetectors)
}
