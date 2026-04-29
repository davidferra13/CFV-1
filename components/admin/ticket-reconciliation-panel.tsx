import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import type {
  TicketReconciliationMismatch,
  TicketReconciliationMismatchCode,
} from '@/lib/tickets/reconciliation'

type TicketReconciliationAudit = {
  mismatches?: TicketReconciliationMismatch[]
  mismatchCount?: number
  summaryByCode?: Partial<Record<TicketReconciliationMismatchCode, number>>
  ticketCount?: number
  ledgerEntryCount?: number
  checkedAt?: string
  truncated?: boolean
}

type TicketReconciliationPanelProps = {
  audit: TicketReconciliationAudit
}

const MISMATCH_LABELS: Record<TicketReconciliationMismatchCode, string> = {
  paid_ticket_missing_positive_ledger: 'Paid ticket missing ledger',
  refunded_ticket_missing_negative_refund_ledger: 'Refund missing ledger',
  ticket_ledger_missing_ticket: 'Ledger missing ticket',
  pending_ticket_capacity_released: 'Pending capacity released',
  failed_ticket_capacity_not_released: 'Failed capacity held',
  cancelled_ticket_capacity_not_released: 'Cancelled capacity held',
}

const MISMATCH_CODES = Object.keys(MISMATCH_LABELS) as TicketReconciliationMismatchCode[]

export function TicketReconciliationPanel({ audit }: TicketReconciliationPanelProps) {
  const mismatches = audit.mismatches ?? []
  const countsByCode = normalizeCounts(audit.summaryByCode, mismatches)
  const mismatchCount = audit.mismatchCount ?? mismatches.length
  const hasMismatches = mismatchCount > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={hasMismatches ? 'error' : 'success'}>
            {hasMismatches ? `${mismatchCount} mismatches` : 'No mismatches'}
          </Badge>
          {audit.checkedAt ? (
            <span className="text-sm text-stone-500">
              Checked {formatDateTime(audit.checkedAt)}
            </span>
          ) : null}
          {audit.truncated ? <Badge variant="warning">Limited sample</Badge> : null}
        </div>
        <Button href="/admin/reconciliation/tickets" variant="secondary" size="sm">
          Refresh audit
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{mismatchCount}</p>
          <p className="mt-1 text-sm text-stone-500">Total mismatches</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">
            {formatOptionalCount(audit.ticketCount)}
          </p>
          <p className="mt-1 text-sm text-stone-500">Tickets audited</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">
            {formatOptionalCount(audit.ledgerEntryCount)}
          </p>
          <p className="mt-1 text-sm text-stone-500">Ledger entries audited</p>
        </Card>
      </div>

      <Card>
        <div className="border-b border-stone-800 p-4">
          <h2 className="text-lg font-semibold text-stone-100">Mismatch counts</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mismatch</TableHead>
              <TableHead>Count</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MISMATCH_CODES.map((code) => {
              const count = countsByCode[code] ?? 0
              return (
                <TableRow key={code}>
                  <TableCell className="font-medium text-stone-100">
                    {MISMATCH_LABELS[code]}
                  </TableCell>
                  <TableCell className="text-stone-300">{count}</TableCell>
                  <TableCell>
                    <Badge variant={count > 0 ? 'error' : 'success'}>
                      {count > 0 ? 'Needs review' : 'Clear'}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <div className="border-b border-stone-800 p-4">
          <h2 className="text-lg font-semibold text-stone-100">Mismatch details</h2>
        </div>

        {mismatches.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-stone-300">No ticket reconciliation mismatches found</p>
            <p className="mt-1 text-sm text-stone-500">
              The audit returned no ticket, ledger, or capacity state conflicts.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Ticket</TableHead>
                <TableHead>Ledger</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mismatches.map((mismatch, index) => (
                <TableRow key={mismatchKey(mismatch, index)}>
                  <TableCell>
                    <Badge variant="warning">{MISMATCH_LABELS[mismatch.code]}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-stone-300">
                    {mismatch.ticketId ?? '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-stone-300">
                    {mismatch.ledgerEntryId ?? '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-stone-300">
                    {mismatch.eventId ?? '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-stone-300">
                    {mismatch.tenantId ?? '-'}
                  </TableCell>
                  <TableCell className="text-sm text-stone-300">
                    {formatOptionalCurrency(mismatch.amountCents)}
                  </TableCell>
                  <TableCell className="max-w-md text-sm text-stone-300">
                    {mismatch.message}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}

function normalizeCounts(
  providedCounts: TicketReconciliationAudit['summaryByCode'],
  mismatches: TicketReconciliationMismatch[]
): Partial<Record<TicketReconciliationMismatchCode, number>> {
  if (providedCounts) return providedCounts

  return mismatches.reduce<Partial<Record<TicketReconciliationMismatchCode, number>>>(
    (counts, mismatch) => {
      counts[mismatch.code] = (counts[mismatch.code] ?? 0) + 1
      return counts
    },
    {}
  )
}

function formatOptionalCount(value: number | undefined): string {
  return typeof value === 'number' ? value.toLocaleString() : 'Unknown'
}

function formatOptionalCurrency(value: number | null | undefined): string {
  return typeof value === 'number' ? formatCurrency(value) : '-'
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function mismatchKey(mismatch: TicketReconciliationMismatch, index: number): string {
  return [
    mismatch.code,
    mismatch.ticketId ?? 'no-ticket',
    mismatch.ledgerEntryId ?? 'no-ledger',
    mismatch.eventId ?? 'no-event',
    index,
  ].join(':')
}
