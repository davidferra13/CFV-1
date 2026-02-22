// Remy Agent — Action Registration
// Barrel file that imports all domain actions and registers them.
// Import this file once to populate the agent registry.

import { registerAgentActions } from '@/lib/ai/agent-registry'
import { clientAgentActions } from './client-actions'
import { eventAgentActions } from './event-actions'
import { inquiryAgentActions } from './inquiry-actions'
import { recipeAgentActions } from './recipe-actions'
import { menuAgentActions } from './menu-actions'
import { quoteAgentActions } from './quote-actions'
import { operationsAgentActions } from './operations-actions'
import { restrictedAgentActions } from './restricted-actions'

let registered = false

export function ensureAgentActionsRegistered(): void {
  if (registered) return
  registered = true

  registerAgentActions(clientAgentActions)
  registerAgentActions(eventAgentActions)
  registerAgentActions(inquiryAgentActions)
  registerAgentActions(recipeAgentActions)
  registerAgentActions(menuAgentActions)
  registerAgentActions(quoteAgentActions)
  registerAgentActions(operationsAgentActions)
  registerAgentActions(restrictedAgentActions)
}
