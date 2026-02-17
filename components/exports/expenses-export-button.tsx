// Expenses Export Button
// Client component that binds current filters to the export action

'use client'

import { CSVDownloadButton } from './csv-download-button'
import { exportExpensesCSV } from '@/lib/exports/actions'
import type { ExpenseFilters } from '@/lib/expenses/actions'

type Props = {
  filters: ExpenseFilters
}

export function ExpensesExportButton({ filters }: Props) {
  return (
    <CSVDownloadButton
      action={() => exportExpensesCSV(filters)}
      label="Export CSV"
      loadingLabel="Exporting..."
    />
  )
}
