import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'
import type { TaxPrepContractor } from '@/lib/reports/tax-prep'

export function ContractorList({
  contractors,
  contractorsRequiring1099,
}: {
  contractors: TaxPrepContractor[]
  contractorsRequiring1099: number
}) {
  if (contractors.length === 0) {
    return (
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-4">
          1099 Contractors
        </h2>
        <p className="text-sm text-stone-500">No contractor payments recorded for this year</p>
      </Card>
    )
  }

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide">
            1099 Contractors
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Contractors paid $600+ require 1099-NEC filing
          </p>
        </div>
        {contractorsRequiring1099 > 0 && (
          <span className="text-xs font-semibold bg-amber-900 text-amber-300 px-2 py-1 rounded">
            {contractorsRequiring1099} need{contractorsRequiring1099 === 1 ? 's' : ''} 1099
          </span>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Total Paid</TableHead>
            <TableHead className="text-right">Payments</TableHead>
            <TableHead className="text-center">1099 Required</TableHead>
            <TableHead className="text-center">W-9 on File</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contractors.map((c) => (
            <TableRow key={c.name}>
              <TableCell className="text-sm font-medium text-stone-300">{c.name}</TableCell>
              <TableCell className="text-right text-sm font-semibold text-stone-100">
                {formatCurrency(c.totalPaidCents)}
              </TableCell>
              <TableCell className="text-right text-sm text-stone-400">
                {c.paymentCount}
              </TableCell>
              <TableCell className="text-center">
                {c.requires1099 ? (
                  <span className="text-amber-400 text-sm font-semibold">Yes</span>
                ) : (
                  <span className="text-stone-500 text-sm">No</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                {c.w9OnFile ? (
                  <span className="text-green-400 text-sm">Yes</span>
                ) : (
                  <span className="text-red-400 text-sm">Missing</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
