// Remy Agent — Action Registration
// Barrel file that imports all domain actions and registers them.
// Import this file once to populate the agent registry.

import { registerAgentActions } from '@/lib/ai/agent-registry'
import { clientAgentActions } from './client-actions'
import { eventAgentActions } from './event-actions'
import { inquiryAgentActions } from './inquiry-actions'
// recipe-actions: REMOVED — AI must never generate recipes. Recipe write actions
// are now permanently restricted in restricted-actions.ts. See CLAUDE.md § pattern #0.
import { menuAgentActions } from './menu-actions'
import { quoteAgentActions } from './quote-actions'
import { operationsAgentActions } from './operations-actions'
import { restrictedAgentActions } from './restricted-actions'
// ─── New action modules (2026-02-22) ──────────────────────────────────────
import { menuEditAgentActions } from './menu-edit-actions'
import { draftEmailAgentActions } from './draft-email-actions'
import { eventOpsAgentActions } from './event-ops-actions'
import { staffAgentActions } from './staff-actions'
import { notesTagsAgentActions } from './notes-tags-actions'
import { calendarAgentActions } from './calendar-actions'
import { financialCallAgentActions } from './financial-call-actions'
import { groceryAgentActions } from './grocery-actions'
import { proactiveAgentActions } from './proactive-actions'
// ─── Intake actions (2026-02-23) ──────────────────────────────────────────
import { intakeAgentActions } from './intake-actions'

let registered = false

export function ensureAgentActionsRegistered(): void {
  if (registered) return
  registered = true

  // ─── Original actions ──────────────────────────────────────────────────
  registerAgentActions(clientAgentActions)
  registerAgentActions(eventAgentActions)
  registerAgentActions(inquiryAgentActions)
  // recipeAgentActions removed — recipe write actions are in restrictedAgentActions
  registerAgentActions(menuAgentActions)
  registerAgentActions(quoteAgentActions)
  registerAgentActions(operationsAgentActions)
  registerAgentActions(restrictedAgentActions)

  // ─── New actions (2026-02-22) ──────────────────────────────────────────
  registerAgentActions(menuEditAgentActions)
  registerAgentActions(draftEmailAgentActions)
  registerAgentActions(eventOpsAgentActions)
  registerAgentActions(staffAgentActions)
  registerAgentActions(notesTagsAgentActions)
  registerAgentActions(calendarAgentActions)
  registerAgentActions(financialCallAgentActions)
  registerAgentActions(groceryAgentActions)
  registerAgentActions(proactiveAgentActions)

  // ─── Intake actions (2026-02-23) ──────────────────────────────────────────
  registerAgentActions(intakeAgentActions)
}
