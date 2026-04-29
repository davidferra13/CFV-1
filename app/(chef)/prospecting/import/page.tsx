// Prospecting Import - CSV Upload
// Upload a CSV/spreadsheet of prospects to import them into the database.

import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/auth/admin'
import { CSVImportForm } from '@/components/prospecting/csv-import-form'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Import Prospects' }

export default async function ImportPage() {
  await requireAdmin()

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link
          href="/prospecting"
          className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-300 mb-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Prospects
        </Link>
        <h1 className="text-3xl font-bold text-stone-100">Import Prospects</h1>
        <p className="text-stone-400 mt-1">
          Upload a CSV file to bulk-import prospects into your database
        </p>
      </div>

      <CSVImportForm />
    </div>
  )
}
