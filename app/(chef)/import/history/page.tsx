// Import History
// Shows a log of all previous import operations.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Import History | ChefFlow' }

export default async function ImportHistoryPage() {
  const chef = await requireChef()
  const supabase: any = createServerClient()

  const { data: imports } = await supabase
    .from('import_logs')
    .select('id, import_type, status, record_count, error_count, created_at, summary')
    .eq('tenant_id', chef.tenantId!)
    .order('created_at', { ascending: false })
    .limit(50)

  const importList = imports ?? []

  const statusColor: Record<string, string> = {
    completed: 'text-green-400',
    partial: 'text-amber-400',
    failed: 'text-red-400',
    pending: 'text-blue-400',
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Import History</h1>
          <p className="mt-1 text-sm text-stone-500">
            A log of all previous import operations - clients, recipes, events, and files.
          </p>
        </div>
        <Link href="/import">
          <Button variant="primary" size="sm">
            New Import
          </Button>
        </Link>
      </div>

      {importList.length === 0 ? (
        <div className="text-center py-20 bg-stone-800 rounded-xl border border-dashed border-stone-600">
          <h3 className="text-lg font-semibold text-stone-200 mb-1">No imports yet</h3>
          <p className="text-sm text-stone-500 mb-4 max-w-sm mx-auto">
            Your import history will appear here after you run your first import.
          </p>
          <Link href="/import">
            <Button variant="primary">Start Import</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {importList.map((log: any) => (
            <div key={log.id} className="bg-stone-800 rounded-xl p-4 border border-stone-700">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-stone-100 capitalize">
                      {log.import_type?.replace(/-/g, ' ') ?? 'Import'}
                    </p>
                    {log.status && (
                      <span
                        className={`text-xs font-medium capitalize ${statusColor[log.status] ?? 'text-stone-400'}`}
                      >
                        {log.status}
                      </span>
                    )}
                  </div>
                  {log.summary && <p className="text-sm text-stone-400 mt-1">{log.summary}</p>}
                  <div className="flex items-center gap-3 mt-1">
                    {log.record_count != null && (
                      <p className="text-xs text-stone-500">{log.record_count} records</p>
                    )}
                    {log.error_count != null && log.error_count > 0 && (
                      <p className="text-xs text-red-400">{log.error_count} errors</p>
                    )}
                  </div>
                </div>
                <p className="shrink-0 text-xs text-stone-500">
                  {new Date(log.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
