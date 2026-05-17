export type ActionDomain =
  | 'events'
  | 'inquiries'
  | 'quotes'
  | 'contracts'
  | 'menus'
  | 'payments'
  | 'communication'

export type ActionVisibility = 'chef-only' | 'client-visible' | 'guest-visible' | 'internal'

export type ActionSurface = 'rail' | 'circle' | 'page' | 'notification' | 'mobile'

export type ActionVariant = 'default' | 'destructive' | 'success'

export type ActionResult = {
  success: boolean
  message?: string
  nextAction?: string
  dismiss?: boolean
  circleNotification?: { type: string; data: Record<string, unknown> }
}

export type ActionContext = Record<string, unknown>

export interface ActionDef {
  id: string
  label: string
  icon: string
  domain: ActionDomain
  execute: (entityId: string, context: ActionContext) => Promise<ActionResult>
  requiresConfirm?: boolean
  confirmMessage?: string
  visibility: ActionVisibility
  availableOn: ActionSurface[]
  variant?: ActionVariant
}
