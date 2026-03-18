// Commerce Engine V1 - Sale Status FSM
// Pure logic - no server actions, no database calls.
// Mirrors the DB-level guard_sale_status_transition() trigger.
//
// NOT a server action file - no 'use server'.

import type { SaleStatus } from './constants'

/**
 * Allowed transitions from each sale status.
 * Terminal states (fully_refunded, voided) have no outgoing transitions.
 */
const ALLOWED_TRANSITIONS: Record<SaleStatus, SaleStatus[]> = {
  draft: ['pending_payment', 'voided'],
  pending_payment: ['authorized', 'captured', 'voided'],
  authorized: ['captured', 'voided'],
  captured: ['settled', 'partially_refunded', 'fully_refunded', 'voided'],
  settled: ['partially_refunded', 'fully_refunded'],
  partially_refunded: ['fully_refunded'],
  fully_refunded: [],
  voided: [],
}

/**
 * Check if a status transition is allowed.
 */
export function canTransition(from: SaleStatus, to: SaleStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Get all statuses reachable from the current status.
 */
export function getNextStatuses(current: SaleStatus): SaleStatus[] {
  return ALLOWED_TRANSITIONS[current] ?? []
}

/**
 * Check if a sale status is terminal (no further transitions).
 */
export function isTerminal(status: SaleStatus): boolean {
  return ALLOWED_TRANSITIONS[status]?.length === 0
}

/**
 * Check if a sale status represents a "paid" state.
 */
export function isPaid(status: SaleStatus): boolean {
  return ['captured', 'settled', 'partially_refunded'].includes(status)
}

/**
 * Check if a sale can still accept payments.
 */
export function canAcceptPayment(status: SaleStatus): boolean {
  return ['draft', 'pending_payment', 'authorized'].includes(status)
}

/**
 * Check if a sale can be refunded.
 */
export function canRefund(status: SaleStatus): boolean {
  return ['captured', 'settled', 'partially_refunded'].includes(status)
}

/**
 * Check if a sale can be voided.
 */
export function canVoid(status: SaleStatus): boolean {
  return ['draft', 'pending_payment', 'authorized', 'captured'].includes(status)
}

/**
 * Determine the sale status based on financial state.
 * Used after payment/refund to auto-compute the correct status.
 */
export function computeSaleStatus(input: {
  currentStatus: SaleStatus
  totalCents: number
  totalPaidCents: number
  totalRefundedCents: number
}): SaleStatus {
  const { currentStatus, totalCents, totalPaidCents, totalRefundedCents } = input

  // Don't change terminal or voided states
  if (isTerminal(currentStatus)) return currentStatus

  // Full refund
  if (totalRefundedCents >= totalPaidCents && totalPaidCents > 0) {
    return 'fully_refunded'
  }

  // Partial refund
  if (totalRefundedCents > 0 && totalRefundedCents < totalPaidCents) {
    return 'partially_refunded'
  }

  // Fully paid
  if (totalPaidCents >= totalCents && totalCents > 0) {
    return 'captured'
  }

  // Some payment received but not full
  if (totalPaidCents > 0 && totalPaidCents < totalCents) {
    return 'pending_payment'
  }

  return currentStatus
}
