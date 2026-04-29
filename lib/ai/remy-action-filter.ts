// Remy Action Filter - Focus Mode scoping
// When Focus Mode is ON, Remy only offers actions related to core workflows.
// When OFF, all actions are available. Nothing is deleted - just filtered.
// Note: No 'use server' - this is imported by other server files, not called from client.

import { isFocusModeEnabled } from '@/lib/billing/focus-mode-actions'
import { isEffectivePrivileged } from '@/lib/auth/admin-preview'

/**
 * Actions available in Focus Mode (core workflows only).
 * These map to Remy's action registry - the exact action names
 * passed to Ollama's system prompt.
 */
const FOCUS_MODE_ACTIONS = new Set([
  // Event management (exact taskType strings from executeSingleTask switch)
  'event.list_upcoming',
  'event.list_by_status',
  'event.details',

  // Client management
  'client.list_recent',
  'client.details',
  'client.search',

  // Quotes & inquiries
  'inquiry.list_open',
  'inquiry.details',

  // Calendar
  'calendar.availability',

  // Finance
  'finance.summary',
  'finance.pnl',

  // Recipes & menus
  'recipe.search',
  'menu.list',

  // Briefing & safety
  'briefing.morning',
  'dietary.check',
  'radar.latest',
  'radar.safety',
  'radar.opportunities',
  'radar.explain_item',
  'nav.go',

  // Workflow actions
  'agent.complete_todo',
  'agent.start_timer',
  'agent.stop_timer',
  'agent.set_food_budget',
  'agent.create_goal',
  'agent.mark_followup',
  'agent.shopping_list',
  'agent.recipe_dietary_check',

  // Drafting (exact taskType strings)
  'draft.thank_you',
  'email.followup',
  'email.generic',
  'agent.draft_email',
])

/**
 * Filter Remy's available actions based on Focus Mode.
 * Privileged users (VIP, Admin, Owner) get all actions regardless of Focus Mode.
 *
 * @param allActions - Full list of action names from the action registry
 * @returns Filtered list of actions available to the current user
 */
export async function getAvailableActions(allActions: string[]): Promise<string[]> {
  // Parallel check: privileged status + focus mode
  const [privileged, focusMode] = await Promise.all([isEffectivePrivileged(), isFocusModeEnabled()])
  if (privileged) return allActions
  if (!focusMode) return allActions

  return allActions.filter((a) => FOCUS_MODE_ACTIONS.has(a))
}
