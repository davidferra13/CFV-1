import type {
  InteractionActorRole,
  InteractionContextType,
  InteractionDefinition,
  InteractionLayer,
  InteractionTargetType,
  InteractionVisibility,
} from './types'

const ALL_ROLES: InteractionActorRole[] = [
  'anonymous',
  'chef',
  'client',
  'staff',
  'partner',
  'system',
]

const AUTHENTICATED_ROLES: InteractionActorRole[] = ['chef', 'client', 'staff', 'partner', 'system']
const OPERATOR_ROLES: InteractionActorRole[] = ['chef', 'staff', 'system']
const CLIENT_OPERATOR_ROLES: InteractionActorRole[] = ['chef', 'client', 'staff', 'system']

const TARGETS: InteractionTargetType[] = ['content', 'user', 'event', 'menu', 'system']
const CONTEXTS: InteractionContextType[] = ['event', 'menu', 'client', 'message', null]

type LayerConfig = {
  layer: InteractionLayer
  actions: string[]
  targetTypes?: InteractionTargetType[]
  contextTypes?: InteractionContextType[]
  visibility?: InteractionVisibility
  roles?: InteractionActorRole[]
  sideEffects?: InteractionDefinition['sideEffects']
  duplicateWindowMs?: number
}

export const INTERACTION_LAYERS: LayerConfig[] = [
  {
    layer: 'content',
    actions: ['like', 'react', 'comment', 'reply', 'share', 'save', 'report'],
    targetTypes: ['content', 'menu', 'event'],
    visibility: 'public',
    roles: AUTHENTICATED_ROLES,
    sideEffects: ['notification', 'activity'],
    duplicateWindowMs: 15_000,
  },
  {
    layer: 'social',
    actions: ['follow', 'favorite', 'block', 'mute', 'tag'],
    targetTypes: ['user', 'content', 'menu'],
    visibility: 'role',
    roles: AUTHENTICATED_ROLES,
    sideEffects: ['notification', 'activity'],
    duplicateWindowMs: 30_000,
  },
  {
    layer: 'communication',
    actions: ['send_message', 'react_message', 'edit_message', 'delete_message'],
    targetTypes: ['user', 'system', 'content'],
    contextTypes: ['event', 'client', 'message', null],
    visibility: 'private',
    roles: CLIENT_OPERATOR_ROLES,
    sideEffects: ['notification', 'activity'],
    duplicateWindowMs: 10_000,
  },
  {
    layer: 'discovery',
    actions: ['search', 'filter', 'view'],
    visibility: 'public',
    roles: ALL_ROLES,
    sideEffects: ['activity'],
    duplicateWindowMs: 5_000,
  },
  {
    layer: 'creation',
    actions: ['create_menu', 'edit_menu', 'publish_menu'],
    targetTypes: ['menu', 'event'],
    contextTypes: ['event', 'menu', null],
    visibility: 'role',
    roles: OPERATOR_ROLES,
    sideEffects: ['notification', 'activity', 'automation'],
  },
  {
    layer: 'moderation',
    actions: ['disable_comments', 'restrict_user'],
    targetTypes: ['content', 'user', 'event', 'menu'],
    visibility: 'system',
    roles: OPERATOR_ROLES,
    sideEffects: ['notification', 'activity'],
  },
  {
    layer: 'engagement',
    actions: ['pin', 'highlight'],
    targetTypes: ['content', 'event', 'menu'],
    visibility: 'public',
    roles: OPERATOR_ROLES,
    sideEffects: ['notification', 'activity'],
  },
  {
    layer: 'presence',
    actions: ['set_online', 'set_typing', 'read_receipt'],
    targetTypes: ['user', 'system'],
    contextTypes: ['event', 'client', 'message', null],
    visibility: 'private',
    roles: AUTHENTICATED_ROLES,
    sideEffects: ['activity'],
    duplicateWindowMs: 2_000,
  },
  {
    layer: 'personalization',
    actions: ['update_preferences'],
    targetTypes: ['user', 'system'],
    visibility: 'private',
    roles: AUTHENTICATED_ROLES,
    sideEffects: ['activity', 'automation'],
  },
  {
    layer: 'structure',
    actions: ['create_event', 'update_event'],
    targetTypes: ['event', 'system'],
    contextTypes: ['event', 'client', null],
    visibility: 'role',
    roles: OPERATOR_ROLES,
    sideEffects: ['notification', 'activity', 'automation'],
  },
  {
    layer: 'transactional',
    actions: [
      'send_inquiry',
      'respond_inquiry',
      'convert_booking',
      'accept_event',
      'decline_event',
      'send_quote',
      'approve_quote',
      'request_deposit',
      'pay_deposit',
      'send_invoice',
      'mark_paid',
    ],
    targetTypes: ['event', 'user', 'system'],
    contextTypes: ['event', 'client', 'message', null],
    visibility: 'private',
    roles: CLIENT_OPERATOR_ROLES,
    sideEffects: ['notification', 'activity', 'automation'],
    duplicateWindowMs: 60_000,
  },
  {
    layer: 'chef_native',
    actions: ['i_would_eat_this', 'save_for_event', 'request_this_menu', 'make_this_again'],
    targetTypes: ['content', 'menu', 'event'],
    contextTypes: ['event', 'menu', 'client', null],
    visibility: 'role',
    roles: CLIENT_OPERATOR_ROLES,
    sideEffects: ['notification', 'activity', 'automation'],
    duplicateWindowMs: 30_000,
  },
  {
    layer: 'automation',
    actions: ['auto_followup', 'auto_reminder', 'auto_suggest'],
    targetTypes: TARGETS,
    contextTypes: CONTEXTS,
    visibility: 'system',
    roles: ['system', 'chef', 'staff'],
    sideEffects: ['notification', 'activity', 'automation'],
    duplicateWindowMs: 60_000,
  },
]

function buildDefinition(config: LayerConfig, actionType: string): InteractionDefinition {
  return {
    actionType,
    layer: config.layer,
    targetTypes: config.targetTypes ?? TARGETS,
    contextTypes: config.contextTypes ?? CONTEXTS,
    defaultState: 'completed',
    defaultVisibility: config.visibility ?? 'private',
    allowedRoles: config.roles ?? AUTHENTICATED_ROLES,
    sideEffects: config.sideEffects ?? ['activity'],
    duplicateWindowMs: config.duplicateWindowMs ?? 10_000,
  }
}

export const INTERACTION_REGISTRY: Record<string, InteractionDefinition> = Object.fromEntries(
  INTERACTION_LAYERS.flatMap((layer) =>
    layer.actions.map((action) => [action, buildDefinition(layer, action)])
  )
)

export const INTERACTION_ACTION_TYPES = Object.keys(INTERACTION_REGISTRY)

export function getInteractionDefinition(actionType: string): InteractionDefinition | null {
  return INTERACTION_REGISTRY[actionType] ?? null
}

export function isInteractionActionType(actionType: string): boolean {
  return actionType in INTERACTION_REGISTRY
}
