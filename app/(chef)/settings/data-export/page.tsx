import { requireChef } from '@/lib/auth/get-user'
import { getCategoryCounts } from '@/lib/exports/data-takeout-actions'
import { DataExportClient } from './data-export-client'

export default async function DataExportPage() {
  await requireChef()
  const counts = await getCategoryCounts()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Data Export</h1>
        <p className="text-stone-400 mt-1">
          Download a copy of your ChefFlow data. Nothing is deleted.
        </p>
      </div>
      <DataExportClient initialCounts={counts} />
    </div>
  )
}
