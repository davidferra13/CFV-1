/**
 * Client Relationship Closure: pure policy helpers.
 * No database, no Next.js, no server actions. Just logic.
 */

import type { ClientRelationshipClosure } from './relationship-closure-types'

/**
 * A closure is "active" (enforced) when it has not been reopened.
 */
export function isClosureActive(closure: ClientRelationshipClosure): boolean {
  return closure.reopened_at === null
}

/**
 * Whether this closure blocks creating new events for the client.
 * Only enforced if the closure is active.
 */
export function blocksNewEvents(closure: ClientRelationshipClosure): boolean {
  return isClosureActive(closure) && closure.block_new_events
}

/**
 * Whether this closure blocks automated outreach (campaigns, follow-ups, re-engagement).
 * Only enforced if the closure is active.
 */
export function blocksAutomatedOutreach(closure: ClientRelationshipClosure): boolean {
  return isClosureActive(closure) && closure.block_automated_outreach
}

/**
 * Whether this closure blocks public booking from this client.
 * Only enforced if the closure is active.
 */
export function blocksPublicBooking(closure: ClientRelationshipClosure): boolean {
  return isClosureActive(closure) && closure.block_public_booking
}

/**
 * Whether this closure revokes the client's portal access.
 * Only enforced if the closure is active.
 */
export function blocksPortalAccess(closure: ClientRelationshipClosure): boolean {
  return isClosureActive(closure) && closure.revoke_portal_access
}

/**
 * Whether active event messaging is still allowed under this closure.
 * Allowed when: closure is active, and the messaging window has not expired.
 * If no window is set, messaging is blocked (conservative default).
 */
export function allowsActiveEventMessaging(
  closure: ClientRelationshipClosure,
  now: Date = new Date()
): boolean {
  if (!isClosureActive(closure)) return true
  if (!closure.allow_active_event_messages_until) return false
  return now < new Date(closure.allow_active_event_messages_until)
}

/**
 * Get the active event policy for a closure.
 * Returns null if the closure is not active (reopened).
 */
export function getActiveEventPolicy(
  closure: ClientRelationshipClosure
): ClientRelationshipClosure['active_event_policy'] | null {
  if (!isClosureActive(closure)) return null
  return closure.active_event_policy
}
