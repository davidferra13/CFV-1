import type { Metadata } from 'next'
import Link from 'next/link'
import { getWixSubmissions } from '@/lib/wix/actions'

export const metadata: Metadata = { title: 'Wix Submissions - ChefFlow' }

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-900 text-amber-300',
  processing: 'bg-blue-900 text-blue-300',
  completed: 'bg-emerald-900 text-emerald-300',
  failed: 'bg-red-900 text-red-300',
  duplicate: 'bg-stone-800 text-stone-300',
}

const STATUS_ORDER = ['pending', 'processing', 'failed', 'completed', 'duplicate']

export default async function WixSubmissionsPage() {
  const submissions = await getWixSubmissions({ limit: 200 })

  const statusCounts = submissions.reduce(
    (acc, submission) => {
      const key = String(submission.status ?? 'pending')
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-stone-100">Wix Submissions</h1>
        <p className="text-sm text-stone-400">
          Incoming Wix form submissions and processing outcomes.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {STATUS_ORDER.map((status) => (
          <div key={status} className="rounded-lg border border-stone-800 bg-stone-900/60 p-3">
            <p className="text-xs uppercase tracking-wide text-stone-500">{status}</p>
            <p className="mt-1 text-xl font-semibold text-stone-100">{statusCounts[status] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-800">
        <table className="w-full divide-y divide-stone-800 text-sm">
          <thead className="bg-stone-900/80">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-stone-400">Received</th>
              <th className="px-4 py-3 text-left font-medium text-stone-400">Submitter</th>
              <th className="px-4 py-3 text-left font-medium text-stone-400">Status</th>
              <th className="px-4 py-3 text-left font-medium text-stone-400">Inquiry</th>
              <th className="px-4 py-3 text-right font-medium text-stone-400">Open</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800 bg-stone-950/40">
            {submissions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                  No submissions yet.
                </td>
              </tr>
            )}
            {submissions.map((submission) => (
              <tr key={submission.id}>
                <td className="px-4 py-3 text-stone-300">
                  {new Date(submission.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-stone-200">
                  {submission.submitter_name || submission.submitter_email || 'Unknown'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${
                      STATUS_STYLES[submission.status] ?? 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {submission.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-300">
                  {submission.inquiry_id ? (
                    <Link
                      href={`/inquiries/${submission.inquiry_id}`}
                      className="text-brand-500 hover:text-brand-400"
                    >
                      View inquiry
                    </Link>
                  ) : (
                    'Not created'
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/wix-submissions/${submission.id}`}
                    className="text-brand-500 hover:text-brand-400"
                  >
                    Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
