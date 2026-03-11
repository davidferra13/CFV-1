// Admin Documents — All contracts/documents across every chef

import { requireAdmin } from '@/lib/auth/admin'
import { getAdminDocuments } from '@/lib/admin/platform-data'
import { redirect } from 'next/navigation'
import { FileText } from '@/components/ui/icons'
import { ViewAsChefButton } from '@/components/admin/view-as-chef-button'
import { CsvExportButton } from '@/components/admin/csv-export-button'

export default async function AdminDocumentsPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/unauthorized')
  }

  const docs = await getAdminDocuments().catch(() => [])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-cyan-950 rounded-lg">
          <FileText size={18} className="text-cyan-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">All Documents</h1>
          <p className="text-sm text-stone-500">
            {docs.length} document{docs.length !== 1 ? 's' : ''} across all chefs
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <CsvExportButton
          data={docs}
          filename="admin-documents"
          columns={[
            { header: 'Title', accessor: (d) => d.title },
            { header: 'Chef', accessor: (d) => d.chefBusinessName },
            { header: 'Type', accessor: (d) => d.document_type },
            { header: 'Created', accessor: (d) => d.created_at },
          ]}
        />
      </div>

      <div className="bg-stone-900 rounded-xl border border-slate-200 overflow-hidden">
        {docs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No documents found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Title
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Chef
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Created
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {doc.title ?? 'Untitled'}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {doc.chefBusinessName ?? 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-stone-400 text-xs capitalize">
                      {doc.document_type ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {new Date(doc.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <ViewAsChefButton chefId={doc.tenant_id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
