'use client'

// PrivateResumeCard - Upload/manage UI for a private resume asset.
// The resume is NEVER made public; only an optional text note is shown.

import { useRef, useState, useTransition } from 'react'
import {
  savePrivateResume,
  deletePrivateResume,
  type PrivateResumeStatus,
} from '@/lib/credentials/actions'

type Props = {
  initialStatus: PrivateResumeStatus
  showResumeNote: boolean
  onNoteToggle: (enabled: boolean) => void
}

export function PrivateResumeCard({ initialStatus, showResumeNote, onNoteToggle }: Props) {
  const [status, setStatus] = useState<PrivateResumeStatus>(initialStatus)
  const [error, setError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const MAX = 10 * 1024 * 1024
    if (file.size > MAX) {
      setError('File must be under 10 MB')
      return
    }

    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowed.includes(file.type)) {
      setError('File must be a PDF, DOC, or DOCX')
      return
    }

    setError(null)
    setUploadSuccess(false)

    const formData = new FormData()
    formData.append('resume', file)

    startTransition(async () => {
      try {
        const res = await savePrivateResume(formData)
        if (!res.success) {
          setError(res.error ?? 'Upload failed')
        } else {
          setStatus({
            hasResume: true,
            filename: res.filename ?? file.name,
            updatedAt: new Date().toISOString(),
            documentId: status.documentId,
          })
          setUploadSuccess(true)
        }
      } catch {
        setError('Upload failed. Please try again.')
      }
      // Reset file input
      if (fileRef.current) fileRef.current.value = ''
    })
  }

  function handleDelete() {
    const prev = status
    setDeleteConfirm(false)
    startTransition(async () => {
      try {
        const res = await deletePrivateResume()
        if (!res.success) {
          setError(res.error ?? 'Delete failed')
          setStatus(prev)
        } else {
          setStatus({ hasResume: false, filename: null, updatedAt: null, documentId: null })
          // Turn off the note toggle since there's no resume anymore
          onNoteToggle(false)
        }
      } catch {
        setError('Delete failed. Please try again.')
        setStatus(prev)
      }
    })
  }

  const updatedLabel = status.updatedAt
    ? new Date(status.updatedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900/60 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-100">Private Resume</p>
          <p className="text-xs text-stone-500 mt-0.5">
            Stored privately. Never available as a public download.
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full border border-stone-700 text-stone-500">
          Private only
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/60 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {uploadSuccess && (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-xs text-emerald-300">
          Resume uploaded successfully.
        </div>
      )}

      {status.hasResume ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg border border-stone-700 bg-stone-800 px-4 py-3">
            <svg
              className="w-5 h-5 text-stone-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-stone-200 truncate">{status.filename ?? 'Resume'}</p>
              {updatedLabel && (
                <p className="text-xs text-stone-500 mt-0.5">Updated {updatedLabel}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={isPending}
              className="text-xs text-stone-400 hover:text-stone-200 underline disabled:opacity-40 transition-colors"
            >
              Replace
            </button>
            {deleteConfirm ? (
              <span className="text-xs flex items-center gap-2">
                <span className="text-stone-400">Remove this resume?</span>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="text-red-400 hover:text-red-300 font-medium disabled:opacity-40"
                >
                  Remove
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="text-stone-500 hover:text-stone-300"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                disabled={isPending}
                className="text-xs text-stone-600 hover:text-red-400 disabled:opacity-40 transition-colors"
              >
                Remove
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-stone-800">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showResumeNote}
                onChange={(e) => onNoteToggle(e.target.checked)}
                className="mt-0.5 rounded border-stone-600"
              />
              <div>
                <p className="text-sm text-stone-300">
                  Show &quot;Resume available upon request&quot; on public profile
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  Adds a single line of text. No download link is ever shown.
                </p>
              </div>
            </label>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-xs text-stone-500 mb-3">
            No resume on file. Upload a PDF, DOC, or DOCX (max 10 MB).
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isPending}
            className="px-4 py-2 rounded-lg border border-stone-700 text-sm text-stone-300 hover:bg-stone-800 disabled:opacity-40 transition-colors"
          >
            {isPending ? 'Uploading...' : 'Upload resume'}
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  )
}
