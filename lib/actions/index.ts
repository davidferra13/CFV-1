import './action-definitions/payments'
import './action-definitions/inquiries'
import './action-definitions/quotes'
import './action-definitions/contracts'
import './action-definitions/events'

export {
  registerAction,
  getAction,
  getActionsForSurface,
  executeAction,
  getAllActions,
} from './action-registry'
export type {
  ActionDef,
  ActionResult,
  ActionContext,
  ActionDomain,
  ActionSurface,
  ActionVariant,
  ActionVisibility,
} from './types'
