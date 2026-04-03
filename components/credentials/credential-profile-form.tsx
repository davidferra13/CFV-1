'use client'

// CredentialProfileForm - manages optional public charity visibility and private resume controls.
// Lives on the credentials settings page.

import { useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  updatePublicCredentialProfile,
  savePrivateResume,
  deletePrivateResume,
  type PrivateResumeStatus,
} from '@/lib/credentials/actions'
import { Switch } from '@/components/ui/switch'

type Props = {
  initialValues: {
    publicCharityPercent: number | null
    publicCharityNote: string | null
    showPublicCharity: boolean
    showResumeAvailableNote: boolean
  }
  resumeStatus: PrivateResumeStatus
  totalCharityHours: number
  trackedOrganizations: number
}

export function CredentialProfileForm({
  initialValues,
  resumeStatus: initialResumeStatus,
  totalCharityHours,
  trackedOrganizations,
}: Props) {
  const [charityPercent, setCharityPercent] = useState(
    initialValues.publicCharityPercent !== null ? String(initialValues.publicCharityPercent) : ''
  )
  const [charityNote, setCharityNote] = useState(initialValues.publicCharityNote ?? '')
  const [showPublicCharity, setShowPublicCharity] = useState(initialValues.showPublicCharity)
  const [showResumeNote, setShowResumeNote] = useState(initialValues.showResumeAvailableNote)
  const [resumeStatus, setResumeStatus] = useState<PrivateResumeStatus>(initialResumeStatus)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isCharityEditorOpen, setIsCharityEditorOpen] = useState(
    initialValues.showPublicCharity ||
      initialValues.publicCharityPercent !== null ||
      Boolean(initialValues.publicCharityNote)
  )
  const fileRef = useRef<HTMLInputElement>(null)

  function handleSave() {
    setError(null)
    setSaved(false)
    const percentVal = charityPercent.trim() !== '' ? parseFloat(charityPercent) : null

    if (percentVal !== null && (isNaN(percentVal) || percentVal < 0 || percentVal > 100)) {
      setError('Charity percent must be a number between 0 and 100')
      return
    }

    startTransition(async () => {
      try {
        const res = await updatePublicCredentialProfile({
          publicCharityPercent: percentVal,
          publicCharityNote: charityNote.trim() || null,
          showPublicCharity,
          showResumeAvailableNote: showResumeNote,
        })
        if (!res.success) {
          setError(res.error ?? 'Save failed')
        } else {
          setSaved(true)
        }
      } catch {
        setError('Save failed. Please try again.')
      }
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const MAX = 10 * 1024 * 1024
    if (file.size > MAX) {
      setUploadError('File must be under 10 MB')
      return
    }
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowed.includes(file.type)) {
      setUploadError('File must be a PDF, DOC, or DOCX')
      return
    }

    setUploadError(null)
    setUploadSuccess(false)

    const formData = new FormData()
    formData.append('resume', file)

    startTransition(async () => {
      try {
        const res = await savePrivateResume(formData)
        if (!res.success) {
          setUploadError(res.error ?? 'Upload failed')
        } else {
          setResumeStatus({
            hasResume: true,
            filename: res.filename ?? file.name,
            updatedAt: new Date().toISOString(),
            documentId: resumeStatus.documentId,
          })
          setUploadSuccess(true)
        }
      } catch {
        setUploadError('Upload failed. Please try again.')
      }
      if (fileRef.current) fileRef.current.value = ''
    })
  }

  function handleDeleteResume() {
    const prev = resumeStatus
    setDeleteConfirm(false)
    startTransition(async () => {
      try {
        const res = await deletePrivateResume()
        if (!res.success) {
          setUploadError(res.error ?? 'Delete failed')
          setResumeStatus(prev)
        } else {
          setResumeStatus({ hasResume: false, filename: null, updatedAt: null, documentId: null })
          setShowResumeNote(false)
        }
      } catch {
        setUploadError('Delete failed. Please try again.')
        setResumeStatus(prev)
      }
    })
  }

  const updatedLabel = resumeStatus.updatedAt
    ? new Date(resumeStatus.updatedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null
  const hasCharityDetails = charityPercent.trim() !== '' || charityNote.trim() !== ''
  const charitySummary: string[] = []

  if (totalCharityHours > 0) {
    charitySummary.push(
      `${totalCharityHours.toLocaleString(undefined, { maximumFractionDigits: 2 })} volunteer hours logged`
    )
  }
  if (trackedOrganizations > 0) {
    charitySummary.push(
      `${trackedOrganizations} organization${trackedOrganizations === 1 ? '' : 's'} linked`
    )
  }
  if (charityPercent.trim() !== '') {
    charitySummary.push(`${charityPercent.trim()}% donation pledge saved`)
  }
  if (charityNote.trim() !== '') {
    charitySummary.push('community statement saved')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-stone-700 bg-stone-900/60 p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-stone-100">Community impact</p>
              <span className="rounded-full border border-stone-700 px-2 py-0.5 text-[11px] uppercase tracking-wide text-stone-500">
                Optional
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-500">
              Keep charity support fully in the system without making it the first thing people see.
              Save the details here and only show them publicly when you want to.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCharityEditorOpen((current) => !current)}
            className="text-xs text-stone-400 underline transition-colors hover:text-stone-200"
          >
            {isCharityEditorOpen
              ? 'Hide charity details'
              : hasCharityDetails || totalCharityHours > 0
                ? 'Edit charity details'
                : 'Add charity details'}
          </button>
        </div>

        <div className="rounded-xl border border-stone-800 bg-stone-950/70 p-4 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-stone-200">Show on public profile</p>
              <p className="mt-1 text-xs text-stone-500">
                Turn this on only when you want your profile and inquiry view to include your
                community work.
              </p>
            </div>
            <Switch
              checked={showPublicCharity}
              onCheckedChange={setShowPublicCharity}
              disabled={isPending}
              aria-label="Show community impact on public profile"
            />
          </div>

          {charitySummary.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {charitySummary.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-stone-700 bg-stone-900 px-2.5 py-1 text-[11px] text-stone-300"
                >
                  {item}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-600">
              Nothing is shown publicly until you add a note, a donation percent, or volunteer
              hours.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
            <span>
              {showPublicCharity
                ? 'Currently visible on public surfaces.'
                : 'Currently hidden from public surfaces.'}
            </span>
            <Link
              href="/charity/hours"
              className="underline transition-colors hover:text-stone-300"
            >
              Open volunteer log
            </Link>
            <Link href="/charity" className="underline transition-colors hover:text-stone-300">
              Open impact workspace
            </Link>
          </div>
        </div>

        {isCharityEditorOpen && (
          <div className="grid gap-4 rounded-xl border border-stone-800 bg-stone-950/40 p-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">
                Donation percent
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={charityPercent}
                  onChange={(e) => setCharityPercent(e.target.value)}
                  className="w-24 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:border-stone-500 focus:outline-none"
                  placeholder="e.g. 5"
                />
                <span className="text-sm text-stone-400">%</span>
              </div>
              <p className="mt-1 text-xs text-stone-600">
                Saved even if hidden. Example: &quot;5% of revenue donated to local food
                access.&quot;
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-stone-400">
                Community impact statement
              </label>
              <textarea
                value={charityNote}
                onChange={(e) => setCharityNote(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:border-stone-500 focus:outline-none resize-none"
                placeholder="I volunteer at local food banks and support youth cooking programs..."
              />
              <p className="mt-1 text-xs text-stone-600">
                Keep this short. It appears as supporting context when displayed publicly.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-stone-700 bg-stone-900/60 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-stone-100">Private Resume</p>
            <p className="text-xs text-stone-500 mt-0.5">
              Stored privately. Never available as a public download.
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full border border-stone-700 text-stone-500 flex-shrink-0">
            Private only
          </span>
        </div>

        {uploadError && (
          <div className="rounded-lg border border-red-800 bg-red-950/60 px-3 py-2 text-xs text-red-300">
            {uploadError}
          </div>
        )}
        {uploadSuccess && (
          <div className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-3 py-2 text-xs text-emerald-300">
            Resume uploaded successfully.
          </div>
        )}

        {resumeStatus.hasResume ? (
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
                <p className="text-sm text-stone-200 truncate">
                  {resumeStatus.filename ?? 'Resume'}
                </p>
                {updatedLabel && (
                  <p className="text-xs text-stone-500 mt-0.5">Updated {updatedLabel}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
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
                    type="button"
                    onClick={handleDeleteResume}
                    disabled={isPending}
                    className="text-red-400 hover:text-red-300 font-medium disabled:opacity-40"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(false)}
                    className="text-stone-500 hover:text-stone-300"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
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
                  onChange={(e) => setShowResumeNote(e.target.checked)}
                  className="mt-0.5 rounded border-stone-600"
                />
                <div>
                  <p className="text-sm text-stone-300">
                    Show &quot;Resume available upon request&quot; on public profile
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Adds a single sentence. No download link is ever shown.
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
              type="button"
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
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/60 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/60 px-4 py-3 text-sm text-emerald-300">
          Credential settings saved.
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="px-5 py-2.5 bg-stone-100 text-stone-900 text-sm font-medium rounded-lg hover:bg-white disabled:opacity-40 transition-colors"
      >
        {isPending ? 'Saving...' : 'Save settings'}
      </button>
    </div>
  )
}
