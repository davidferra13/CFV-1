import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { EventSettlement } from '@/lib/collaboration/settlement-actions'
import { formatCurrency } from '@/lib/utils/currency'

type SettlementPreviewPanelProps = {
  settlement: EventSettlement | null
}

const STATUS_BADGE_VARIANTS: Record<
  EventSettlement['collaborators'][number]['status'],
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  pending: 'warning',
  confirmed: 'info',
  paid: 'success',
}

function formatRole(role: string) {
  return role
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatPercent(percent: number) {
  return `${Number.isInteger(percent) ? percent : percent.toFixed(1)}%`
}

export function SettlementPreviewPanel({ settlement }: SettlementPreviewPanelProps) {
  if (!settlement) return null

  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Revenue Split</h2>
          <p className="mt-1 text-sm text-stone-400">
            Total revenue: {formatCurrency(settlement.totalRevenueCents)}
          </p>
        </div>
      </div>

      {settlement.totalRevenueCents === 0 && (
        <p className="mb-4 rounded-md border border-stone-700 bg-stone-800/50 px-3 py-2 text-sm text-stone-400">
          Revenue splits will appear once pricing is set.
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Split %</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {settlement.collaborators.map((collaborator) => (
            <TableRow key={collaborator.collaboratorId}>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-stone-100">{collaborator.chefName}</span>
                  <Badge variant={STATUS_BADGE_VARIANTS[collaborator.status]}>
                    {formatRole(collaborator.status)}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>{formatRole(collaborator.role)}</TableCell>
              <TableCell className="text-right">
                {formatPercent(collaborator.splitPercent)}
              </TableCell>
              <TableCell className="text-right font-medium text-stone-100">
                {formatCurrency(collaborator.splitAmountCents)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-stone-800/40 hover:bg-stone-800/60">
            <TableCell className="font-medium text-stone-100">Host Chef</TableCell>
            <TableCell>Host</TableCell>
            <TableCell className="text-right">
              {formatPercent(settlement.hostChefSplitPercent)}
            </TableCell>
            <TableCell className="text-right font-semibold text-stone-100">
              {formatCurrency(settlement.hostChefSplitCents)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Card>
  )
}
