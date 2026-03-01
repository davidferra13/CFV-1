// Remy Action Filter — Focus Mode scoping
// When Focus Mode is ON, Remy only offers actions related to core workflows.
// When OFF, all actions are available. Nothing is deleted — just filtered.

'use server'

import { isFocusModeEnabled } from '@/lib/billing/focus-mode'
import { isAdmin } from '@/lib/auth/admin'

/**
 * Actions available in Focus Mode (core workflows only).
 * These map to Remy's action registry — the exact action names
 * passed to Ollama's system prompt.
 */
const FOCUS_MODE_ACTIONS = new Set([
  // Event management
  'event.list',
  'event.detail',
  'event.search',
  'event.upcoming',

  // Client management
  'client.list',
  'client.detail',
  'client.search',

  // Quotes & inquiries
  'quote.list',
  'quote.detail',
  'inquiry.list',
  'inquiry.detail',

  // Calendar
  'calendar.upcoming',
  'calendar.availability',

  // Finance
  'finance.summary',
  'finance.event_summary',

  // Recipes & menus
  'recipe.search',
  'menu.list',

  // Drafting
  'draft.message',
  'draft.email',
  'draft.followup',
  'draft.thank_you',
])

/**
 * Filter Remy's available actions based on Focus Mode.
 * Admin always gets all actions regardless of Focus Mode.
 *
 * @param allActions - Full list of action names from the action registry
 * @returns Filtered list of actions available to the current user
 */
export async function getAvailableActions(allActions: string[]): Promise<string[]> {
  // Admin always gets everything
  const adminCheck = await isAdmin().catch(() => false)
  if (adminCheck) return allActions

  const focusMode = await isFocusModeEnabled()
  if (!focusMode) return allActions

  return allActions.filter((a) => FOCUS_MODE_ACTIONS.has(a))
}
