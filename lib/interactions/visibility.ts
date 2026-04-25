import type {
  ExecuteInteractionInput,
  InteractionActorContext,
  InteractionDefinition,
  InteractionVisibility,
} from './types'

const PUBLIC_ACTIONS = new Set(['like', 'react', 'comment', 'reply', 'share', 'view'])
const PRIVATE_ACTIONS = new Set([
  'send_message',
  'react_message',
  'edit_message',
  'delete_message',
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
])

export function resolveInteractionVisibility(
  input: ExecuteInteractionInput,
  definition: InteractionDefinition,
  actor: InteractionActorContext
): InteractionVisibility {
  if (input.visibility) return input.visibility
  if (actor.role === 'system' || definition.layer === 'automation') return 'system'
  if (input.context_type === 'event' || input.target_type === 'event') return 'event'
  if (PUBLIC_ACTIONS.has(input.action_type)) return 'public'
  if (PRIVATE_ACTIONS.has(input.action_type)) return 'private'
  return definition.defaultVisibility
}
