type TicketPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled'

type ReconciliationTicket = {
  id: string
  event_id: string | null
  tenant_id: string | null
  total_cents: number | null
  payment_status: TicketPaymentStatus | string
  capacity_released_at: string | null
  stripe_payment_intent_id?: string | null
  stripe_checkout_session_id?: string | null
}

type ReconciliationLedgerEntry = {
  id: string
  tenant_id: string | null
  event_id: string | null
  amount_cents: number | null
  entry_type: string | null
  transaction_reference?: string | null
  is_refund?: boolean | null
  internal_notes?: string | null
  description?: string | null
}

export type TicketReconciliationMismatchCode =
  | 'paid_ticket_missing_positive_ledger'
  | 'refunded_ticket_missing_negative_refund_ledger'
  | 'ticket_ledger_missing_ticket'
  | 'pending_ticket_capacity_released'
  | 'failed_ticket_capacity_not_released'
  | 'cancelled_ticket_capacity_not_released'

export type TicketReconciliationMismatch = {
  code: TicketReconciliationMismatchCode
  ticketId?: string
  ledgerEntryId?: string
  eventId?: string | null
  tenantId?: string | null
  amountCents?: number | null
  message: string
}

export type ReconcileTicketFinancialTruthInput = {
  tickets: ReconciliationTicket[]
  ledgerEntries: ReconciliationLedgerEntry[]
}

export type ReconcileTicketFinancialTruthResult = {
  mismatches: TicketReconciliationMismatch[]
}

const REF_PREFIX = 'stripe_ticket_'
const REFUND_ENTRY_TYPES = new Set(['refund', 'credit'])
const POSITIVE_TICKET_ENTRY_TYPES = new Set([
  'payment',
  'deposit',
  'installment',
  'final_payment',
])

export function buildTicketPurchaseTransactionReferences(ticket: {
  stripe_payment_intent_id?: string | null
  stripe_checkout_session_id?: string | null
}): string[] {
  const ids = [ticket.stripe_payment_intent_id, ticket.stripe_checkout_session_id].filter(
    isPresentString
  )
  return ids.map((id) => `${REF_PREFIX}${id}`)
}

export function reconcileTicketFinancialTruth(
  input: ReconcileTicketFinancialTruthInput
): ReconcileTicketFinancialTruthResult {
  const tickets = input.tickets ?? []
  const ledgerEntries = input.ledgerEntries ?? []
  const mismatches: TicketReconciliationMismatch[] = []

  const ticketsById = new Map(tickets.map((ticket) => [ticket.id, ticket]))

  for (const ticket of tickets) {
    if (ticket.payment_status === 'paid' && Number(ticket.total_cents ?? 0) > 0) {
      const match = findPositivePurchaseLedgerEntry(ticket, ledgerEntries)
      if (!match) {
        mismatches.push({
          code: 'paid_ticket_missing_positive_ledger',
          ticketId: ticket.id,
          eventId: ticket.event_id,
          tenantId: ticket.tenant_id,
          amountCents: ticket.total_cents,
          message: `Paid ticket ${ticket.id} has no matching positive ticket ledger entry.`,
        })
      }
    }

    if (ticket.payment_status === 'refunded' && Number(ticket.total_cents ?? 0) > 0) {
      const match = findNegativeRefundLedgerEntry(ticket, ledgerEntries)
      if (!match) {
        mismatches.push({
          code: 'refunded_ticket_missing_negative_refund_ledger',
          ticketId: ticket.id,
          eventId: ticket.event_id,
          tenantId: ticket.tenant_id,
          amountCents: ticket.total_cents,
          message: `Refunded ticket ${ticket.id} has no matching negative refund ledger entry.`,
        })
      }
    }

    const capacityMismatch = reconcileCapacityState(ticket)
    if (capacityMismatch) mismatches.push(capacityMismatch)
  }

  for (const entry of ledgerEntries) {
    if (!isTicketLedgerEntry(entry)) continue

    const matchingTicket = findTicketForLedgerEntry(entry, tickets, ticketsById)
    if (!matchingTicket) {
      mismatches.push({
        code: 'ticket_ledger_missing_ticket',
        ledgerEntryId: entry.id,
        eventId: entry.event_id,
        tenantId: entry.tenant_id,
        amountCents: entry.amount_cents,
        message: `Ticket ledger entry ${entry.id} has no matching ticket.`,
      })
    }
  }

  return { mismatches }
}

function findPositivePurchaseLedgerEntry(
  ticket: ReconciliationTicket,
  ledgerEntries: ReconciliationLedgerEntry[]
): ReconciliationLedgerEntry | null {
  return findMatchingLedgerEntry(ticket, ledgerEntries, isPositivePurchaseLedgerEntry)
}

function findNegativeRefundLedgerEntry(
  ticket: ReconciliationTicket,
  ledgerEntries: ReconciliationLedgerEntry[]
): ReconciliationLedgerEntry | null {
  return findMatchingLedgerEntry(ticket, ledgerEntries, isNegativeRefundLedgerEntry)
}

function findMatchingLedgerEntry(
  ticket: ReconciliationTicket,
  ledgerEntries: ReconciliationLedgerEntry[],
  predicate: (entry: ReconciliationLedgerEntry) => boolean
): ReconciliationLedgerEntry | null {
  const refs = new Set(buildTicketPurchaseTransactionReferences(ticket))
  const scopedEntries = ledgerEntries.filter(
    (entry) =>
      predicate(entry) &&
      entry.tenant_id === ticket.tenant_id &&
      entry.event_id === ticket.event_id
  )

  const refMatch = scopedEntries.find(
    (entry) => isPresentString(entry.transaction_reference) && refs.has(entry.transaction_reference)
  )
  if (refMatch) return refMatch

  const ticketIdMatch = scopedEntries.find((entry) => ledgerText(entry).includes(ticket.id))
  if (ticketIdMatch) return ticketIdMatch

  const amountMatches = scopedEntries.filter(
    (entry) => Math.abs(Number(entry.amount_cents ?? 0)) === Number(ticket.total_cents ?? 0)
  )
  return amountMatches.length === 1 ? amountMatches[0] : null
}

function findTicketForLedgerEntry(
  entry: ReconciliationLedgerEntry,
  tickets: ReconciliationTicket[],
  ticketsById: Map<string, ReconciliationTicket>
): ReconciliationTicket | null {
  const refValue = stripTicketReference(entry.transaction_reference)
  if (refValue) {
    const match = tickets.find(
      (ticket) =>
        ticket.tenant_id === entry.tenant_id &&
        ticket.event_id === entry.event_id &&
        (ticket.stripe_payment_intent_id === refValue ||
          ticket.stripe_checkout_session_id === refValue)
    )
    if (match) return match
  }

  for (const ticketId of extractTicketIds(entry)) {
    const ticket = ticketsById.get(ticketId)
    if (ticket && ticket.tenant_id === entry.tenant_id && ticket.event_id === entry.event_id) {
      return ticket
    }
  }

  return null
}

function reconcileCapacityState(
  ticket: ReconciliationTicket
): TicketReconciliationMismatch | null {
  if (ticket.payment_status === 'pending' && ticket.capacity_released_at) {
    return {
      code: 'pending_ticket_capacity_released',
      ticketId: ticket.id,
      eventId: ticket.event_id,
      tenantId: ticket.tenant_id,
      amountCents: ticket.total_cents,
      message: `Pending ticket ${ticket.id} is marked as capacity released.`,
    }
  }

  if (ticket.payment_status === 'failed' && !ticket.capacity_released_at) {
    return {
      code: 'failed_ticket_capacity_not_released',
      ticketId: ticket.id,
      eventId: ticket.event_id,
      tenantId: ticket.tenant_id,
      amountCents: ticket.total_cents,
      message: `Failed ticket ${ticket.id} is still holding capacity.`,
    }
  }

  if (ticket.payment_status === 'cancelled' && !ticket.capacity_released_at) {
    return {
      code: 'cancelled_ticket_capacity_not_released',
      ticketId: ticket.id,
      eventId: ticket.event_id,
      tenantId: ticket.tenant_id,
      amountCents: ticket.total_cents,
      message: `Cancelled ticket ${ticket.id} is still holding capacity.`,
    }
  }

  return null
}

function isPositivePurchaseLedgerEntry(entry: ReconciliationLedgerEntry): boolean {
  const amount = Number(entry.amount_cents ?? 0)
  return (
    amount > 0 &&
    entry.is_refund !== true &&
    Boolean(entry.entry_type && POSITIVE_TICKET_ENTRY_TYPES.has(entry.entry_type))
  )
}

function isNegativeRefundLedgerEntry(entry: ReconciliationLedgerEntry): boolean {
  const amount = Number(entry.amount_cents ?? 0)
  return (
    amount < 0 &&
    (entry.is_refund === true || Boolean(entry.entry_type && REFUND_ENTRY_TYPES.has(entry.entry_type)))
  )
}

function isTicketLedgerEntry(entry: ReconciliationLedgerEntry): boolean {
  return (
    Boolean(stripTicketReference(entry.transaction_reference)) ||
    extractTicketIds(entry).length > 0
  )
}

function stripTicketReference(reference: string | null | undefined): string | null {
  if (!isPresentString(reference)) return null
  return reference.startsWith(REF_PREFIX) ? reference.slice(REF_PREFIX.length) : null
}

function extractTicketIds(entry: ReconciliationLedgerEntry): string[] {
  const text = ledgerText(entry)
  const explicitTicketIds = Array.from(text.matchAll(/\bticket\s+([a-zA-Z0-9_-]+)/g)).map(
    (match) => match[1]
  )
  return explicitTicketIds.length > 0 ? explicitTicketIds : []
}

function ledgerText(entry: ReconciliationLedgerEntry): string {
  return `${entry.description ?? ''} ${entry.internal_notes ?? ''}`
}

function isPresentString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
