/**
 * Deterministic transaction_reference for manual ledger entries.
 *
 * A double-click or a network retry submits the same deposit or balance payment
 * twice. transaction_reference is the ledger's idempotency key (a partial unique
 * index), so it must be derived from the entry itself, never from Date.now() (a
 * fresh millisecond suffix defeats the index and lets a $500 deposit post as
 * $1000). appendLedgerEntryInternal turns the resulting unique violation into
 * { duplicate: true } instead of a second row. Mirrors the key createAdjustment
 * already derives.
 */
export function ledgerReference(prefix: string, eventId: string, amountCents: number): string {
  return `${prefix}_${eventId}_${amountCents}`
}
