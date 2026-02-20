import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getWixSubmission, retryWixSubmission } from '@/lib/wix/submission-actions'

export const metadata: Metadata = { title: 'Wix Submission - ChefFlow' }

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  duplicate: 'bg-stone-100 text-stone-600',
}

export default async function WixSubmissionPage({ params }: { params: { id: string } }) {
  const submission = await getWixSubmission(params.id)

  if (!submission) notFound()

  const canRetry =
    (submission.status === 'pending' || submission.status === 'failed') &&
    submission.processing_attempts < 3

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-stone-500 mb-1">
          <Link href="/inbox" className="hover:text-stone-700">Inbox</Link>
          <span>/</span>
          <span>Wix Submission</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-stone-900">Wix Form Submission</h1>
          <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${STATUS_STYLES[submission.status] ?? 'bg-stone-100 text-stone-600'}`}>
            {submission.status}
          </span>
        </div>
        <p className="text-stone-500 text-sm mt-1">
          Received {new Date(submission.created_at).toLocaleString()}
          {submission.wix_form_id && ` · Form ${submission.wix_form_id}`}
        </p>
      </div>

      {/* Linked inquiry */}
      {submission.inquiry_id && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-800">Inquiry created from this submission</p>
            <p className="text-xs text-emerald-600 mt-0.5">This submission was processed and an inquiry was created.</p>
          </div>
          <Link
            href={`/inquiries/${submission.inquiry_id}`}
            className="text-sm font-medium text-green-700 hover:text-green-900 underline shrink-0 ml-4"
          >
            View Inquiry →
          </Link>
        </div>
      )}

      {/* Processing error */}
      {submission.status === 'failed' && submission.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800">Processing failed</p>
          <p className="text-xs text-red-600 mt-1 font-mono">{submission.error}</p>
          <p className="text-xs text-red-500 mt-1">
            Attempts: {submission.processing_attempts} / 3
          </p>
        </div>
      )}

      {/* Retry button */}
      {canRetry && (
        <form
          action={async () => {
            'use server'
            const result = await retryWixSubmission(submission.id)
            if (result.success && result.inquiryId) {
              redirect(`/inquiries/${result.inquiryId}`)
            }
          }}
        >
          <button
            type="submit"
            className="w-full bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            {submission.status === 'failed' ? 'Retry Processing' : 'Process Now'}
          </button>
          {submission.status === 'pending' && (
            <p className="text-xs text-stone-500 text-center mt-1.5">
              This submission is waiting to be processed. You can trigger it now or it will run automatically within 5 minutes.
            </p>
          )}
        </form>
      )}

      {/* Submitter info */}
      {(submission.submitter_name || submission.submitter_email || submission.submitter_phone) && (
        <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-2">
          <h2 className="text-sm font-semibold text-stone-700">Submitter</h2>
          {submission.submitter_name && (
            <div className="flex gap-2 text-sm">
              <span className="text-stone-500 w-14 shrink-0">Name</span>
              <span className="text-stone-900">{submission.submitter_name}</span>
            </div>
          )}
          {submission.submitter_email && (
            <div className="flex gap-2 text-sm">
              <span className="text-stone-500 w-14 shrink-0">Email</span>
              <a href={`mailto:${submission.submitter_email}`} className="text-brand-600 hover:underline">
                {submission.submitter_email}
              </a>
            </div>
          )}
          {submission.submitter_phone && (
            <div className="flex gap-2 text-sm">
              <span className="text-stone-500 w-14 shrink-0">Phone</span>
              <span className="text-stone-900">{submission.submitter_phone}</span>
            </div>
          )}
        </div>
      )}

      {/* Raw payload */}
      <div className="border border-stone-200 rounded-lg overflow-hidden">
        <div className="bg-stone-100 border-b border-stone-200 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-stone-700">Raw Form Data</h2>
        </div>
        <pre className="p-4 text-xs text-stone-700 overflow-x-auto bg-white leading-relaxed">
          {JSON.stringify(submission.raw_payload, null, 2)}
        </pre>
      </div>

      <div className="flex justify-start">
        <Link href="/inbox" className="text-sm text-stone-500 hover:text-stone-700">
          ← Back to inbox
        </Link>
      </div>
    </div>
  )
}
