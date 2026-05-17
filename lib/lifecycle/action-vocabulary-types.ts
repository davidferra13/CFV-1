export type ActionDomain =
  | 'inquiry'
  | 'quote'
  | 'contract'
  | 'event'
  | 'payment'
  | 'communication'
  | 'menu'
  | 'closeout'

export type ActionVerb =
  | 'create'
  | 'update'
  | 'send'
  | 'approve'
  | 'reject'
  | 'complete'
  | 'cancel'
  | 'archive'
  | 'schedule'
  | 'assign'
  | 'notify'

export interface ActionDefinition {
  id: string
  canonicalName: string
  verb: ActionVerb
  domain: ActionDomain
  label: string
  description: string
  targetEntity: string
  requiresConfirmation: boolean
  reversible: boolean
  clientVisible: boolean
  order: number
}

export interface ActionGroup {
  domain: ActionDomain
  label: string
  actions: ActionDefinition[]
}

export interface ActionUsage {
  actionName: string
  count: number
  lastUsed: string | null
}
