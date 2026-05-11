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
import type { TaxPrepExpenseCategory } from '@/lib/reports/tax-prep'

export function ExpenseCategoryTable({
  categories,
  totalExpensesCents,
  totalIncomeCents,
}: {
  categories: TaxPrepExpenseCategory[]
  totalExpensesCents: number
  totalIncomeCents: number
}) {
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-4">
        Expenses by IRS Category
      </h2>
      {categories.length === 0 ? (
        <p className="text-sm text-stone-500">No expenses recorded for this year</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>IRS Category</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">% of Income</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat) => (
              <TableRow key={cat.irsCategory}>
                <TableCell>
                  <p className="text-sm font-medium text-stone-300">{cat.irsCategory}</p>
                  <p className="text-xs text-stone-500">
                    {cat.expenseCategories.map((c) => c.replace(/_/g, ' ')).join(', ')}
                  </p>
                </TableCell>
                <TableCell className="text-right text-sm text-stone-400">
                  {cat.count}
                </TableCell>
                <TableCell className="text-right text-sm font-semibold text-red-400">
                  {formatCurrency(cat.totalCents)}
                </TableCell>
                <TableCell className="text-right text-sm text-stone-500">
                  {totalIncomeCents > 0
                    ? `${((cat.totalCents / totalIncomeCents) * 100).toFixed(1)}%`
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell className="font-bold text-stone-100">Total</TableCell>
              <TableCell className="text-right text-sm text-stone-400">
                {categories.reduce((s, c) => s + c.count, 0)}
              </TableCell>
              <TableCell className="text-right font-bold text-red-500">
                {formatCurrency(totalExpensesCents)}
              </TableCell>
              <TableCell className="text-right text-sm text-stone-500">
                {totalIncomeCents > 0
                  ? `${((totalExpensesCents / totalIncomeCents) * 100).toFixed(1)}%`
                  : '-'}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    </Card>
  )
}
