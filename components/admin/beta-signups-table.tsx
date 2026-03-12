'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  deleteBetaSignup,
  exportBetaSignupsCsv,
  updateBetaSignupStatus,
  type UpdateBetaSignupStatusResult,
} from '@/lib/beta/actions'
import { buildBetaInviteUrl } from '@/lib/beta/invite-utils'
import { Check, Copy, Download, Search, Trash2 } from '@/components/ui/icons'

type BetaSignupTracker = {
  id: string
  current_status: 'pending' | 'invited' | 'account_ready' | 'onboarding' | 'declined' | 'completed'
  current_stage:
    | 'application_review'
    | 'account_creation'
    | 'workspace_launch'
    | 'setup_hub'
    | 'review_closed'
    | 'activated'
  progress_percent: number
  next_action: string | null
  last_email_type:
    | 'pending_review'
    | 'invited'
    | 'account_ready'
    | 'onboarding_reminder'
    | 'declined'
    | 'onboarding_complete'
    | null
  last_email_sent_at: string | null
}

interface BetaSignup {
  id: string
  name: string
  email: string
  phone: string | null
  business_name: string | null
  cuisine_type: string | null
  years_in_business: string | null
  referral_source: string | null
  status: 'pending' | 'invited' | 'onboarded' | 'declined'
  notes: string | null
  created_at: string
  invited_at: string | null
  onboarded_at: string | null
  tracker: BetaSignupTracker | null
}

const STATUS_STYLES: Record<BetaSignup['status'], string> = {
  pending: 'bg-amber-900 text-amber-300',
  invited: 'bg-sky-900 text-sky-300',
  onboarded: 'bg-emerald-900 text-emerald-300',
  declined: 'bg-red-900 text-red-300',
}

const REFERRAL_LABELS: Record<string, string> = {
  social_media: 'Social Media',
  friend_referral: 'Friend / Colleague',
  google_search: 'Google Search',
  chef_community: 'Chef Community',
  event: 'Event / Conference',
  other: 'Other',
  beta_invite_link: 'Beta Invite Link',
}

const TRACKER_STAGE_LABELS: Record<BetaSignupTracker['current_stage'], string> = {
  application_review: 'Application Review',
  account_creation: 'Account Creation',
  workspace_launch: 'Workspace Launch',
  setup_hub: 'Setup Hub',
  review_closed: 'Review Closed',
  activated: 'Activated',
}

const EMAIL_LABELS: Record<NonNullable<BetaSignupTracker['last_email_type']>, string> = {
  pending_review: 'Pending Review',
  invited: 'Invited',
  account_ready: 'Account Ready',
  onboarding_reminder: 'Onboarding Reminder',
  declined: 'Declined',
  onboarding_complete: 'Onboarding Complete',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function CopyInviteLinkButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)
  const signupUrl = buildBetaInviteUrl(
    email,
    typeof window !== 'undefined' ? window.location.origin : undefined
  )

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(signupUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = signupUrl
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied' : 'Copy invite link'}
      className="rounded p-1 transition-colors hover:bg-slate-700"
    >
      {copied ? (
        <Check size={14} className="text-emerald-400" />
      ) : (
        <Copy size={14} className="text-slate-400 hover:text-slate-200" />
      )}
    </button>
  )
}

type SignupUpdate = {
  status?: BetaSignup['status']
  notes?: string | null
  invited_at?: string | null
  onboarded_at?: string | null
  tracker?: BetaSignupTracker | null
}

function SignupRow({
  signup,
  onDelete,
  onUpdate,
}: {
  signup: BetaSignup
  onDelete: (id: string) => void
  onUpdate: (id: string, update: SignupUpdate) => void
}) {
  const [status, setStatus] = useState<BetaSignup['status']>(signup.status)
  const [notes, setNotes] = useState(signup.notes || '')
  const [editingNotes, setEditingNotes] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    setStatus(signup.status)
  }, [signup.status])

  useEffect(() => {
    setNotes(signup.notes || '')
  }, [signup.notes])

  function applyUpdate(result: UpdateBetaSignupStatusResult) {
    if (!result.updated) return

    onUpdate(signup.id, {
      status: result.updated.status,
      notes: result.updated.notes,
      invited_at: result.updated.invitedAt,
      onboarded_at: result.updated.onboardedAt,
      tracker: result.updated.tracker,
    })
    setStatus(result.updated.status)
    setNotes(result.updated.notes || '')
  }

  function flashSuccess(message: string) {
    setSuccessMessage(message)
    window.setTimeout(() => setSuccessMessage(''), 3000)
  }

  function handleDelete() {
    if (!confirm(`Remove ${signup.name} (${signup.email}) from the beta list?`)) return

    setError('')
    setSuccessMessage('')

    startTransition(async () => {
      try {
        const result = await deleteBetaSignup(signup.id)
        if (!result.success) {
          setError(result.error || 'Failed to delete')
          return
        }

        onDelete(signup.id)
      } catch {
        setError('Failed to delete')
      }
    })
  }

  function handleStatusChange(newStatus: BetaSignup['status']) {
    const previousStatus = status
    setStatus(newStatus)
    setError('')
    setSuccessMessage('')

    startTransition(async () => {
      try {
        const result = await updateBetaSignupStatus(signup.id, newStatus, undefined, {
          sendStatusEmail:
            newStatus === 'pending' || newStatus === 'invited' || newStatus === 'declined',
        })

        if (!result.success) {
          setStatus(previousStatus)
          setError(result.error || 'Failed to update')
          return
        }

        applyUpdate(result)
        if (result.message) flashSuccess(result.message)
      } catch {
        setStatus(previousStatus)
        setError('Failed to update status')
      }
    })
  }

  function handleResendInvite() {
    if (status !== 'invited') return

    setError('')
    setSuccessMessage('')

    startTransition(async () => {
      try {
        const result = await updateBetaSignupStatus(signup.id, 'invited', undefined, {
          sendStatusEmail: true,
          refreshStatusTimestamp: true,
        })

        if (!result.success) {
          setError(result.error || 'Failed to resend invite')
          return
        }

        applyUpdate(result)
        if (result.message) flashSuccess(result.message)
      } catch {
        setError('Failed to resend invite')
      }
    })
  }

  function handleNotesSave() {
    setEditingNotes(false)
    setError('')
    setSuccessMessage('')

    startTransition(async () => {
      try {
        const result = await updateBetaSignupStatus(signup.id, status, notes)
        if (!result.success) {
          setError(result.error || 'Failed to save notes')
          return
        }

        applyUpdate(result)
      } catch {
        setError('Failed to save notes')
      }
    })
  }

  return (
    <tr className="border-b border-slate-700/60 bg-slate-800/50 transition-colors hover:bg-slate-700/40">
      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
        {formatDate(signup.created_at)}
      </td>
      <td className="px-4 py-3 text-sm font-medium text-slate-200">{signup.name}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <a href={`mailto:${signup.email}`} className="text-sm text-brand-400 hover:underline">
            {signup.email}
          </a>
          <CopyInviteLinkButton email={signup.email} />
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-slate-400">{signup.phone || '-'}</td>
      <td className="px-4 py-3 text-xs text-slate-300">{signup.business_name || '-'}</td>
      <td className="px-4 py-3 text-xs text-slate-400">{signup.cuisine_type || '-'}</td>
      <td className="px-4 py-3 text-xs text-slate-400">{signup.years_in_business || '-'}</td>
      <td className="px-4 py-3 text-xs text-slate-400">
        {signup.referral_source
          ? REFERRAL_LABELS[signup.referral_source] || signup.referral_source
          : '-'}
      </td>
      <td className="px-4 py-3 align-top">
        <select
          value={status}
          onChange={(event) => handleStatusChange(event.target.value as BetaSignup['status'])}
          disabled={isPending}
          className={`cursor-pointer rounded-full border-0 px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]} disabled:opacity-50`}
        >
          <option value="pending">Pending</option>
          <option value="invited">Invited</option>
          <option value="onboarded">Onboarded</option>
          <option value="declined">Declined</option>
        </select>

        {status === 'invited' ? (
          <button
            type="button"
            onClick={handleResendInvite}
            disabled={isPending}
            className="mt-1 block text-xs text-brand-400 transition-colors hover:text-brand-300 disabled:opacity-50"
          >
            Resend invite
          </button>
        ) : null}

        {signup.tracker ? (
          <div className="mt-2 space-y-1 text-[11px] leading-4 text-slate-400">
            <p className="text-slate-300">
              {TRACKER_STAGE_LABELS[signup.tracker.current_stage]} ·{' '}
              {signup.tracker.progress_percent}%
            </p>
            {signup.tracker.last_email_type ? (
              <p>
                Last email: {EMAIL_LABELS[signup.tracker.last_email_type]}
                {signup.tracker.last_email_sent_at
                  ? ` · ${formatDate(signup.tracker.last_email_sent_at)}`
                  : ''}
              </p>
            ) : null}
            {signup.tracker.next_action ? (
              <p className="max-w-[220px] text-slate-500">{signup.tracker.next_action}</p>
            ) : null}
          </div>
        ) : null}

        {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
        {!error && successMessage ? (
          <p className="mt-1 text-xs text-emerald-400">{successMessage}</p>
        ) : null}
      </td>
      <td className="px-4 py-3 align-top">
        {editingNotes ? (
          <div className="flex gap-1">
            <input
              type="text"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleNotesSave()
                if (event.key === 'Escape') setEditingNotes(false)
              }}
              className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200 focus:border-brand-500 focus:outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={handleNotesSave}
              disabled={isPending}
              className="whitespace-nowrap text-xs text-brand-400 transition-colors hover:text-brand-300 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingNotes(true)}
            className="block max-w-[160px] truncate text-left text-xs text-slate-500 transition-colors hover:text-slate-300"
            title={notes || 'Add notes'}
          >
            {notes || 'Add notes...'}
          </button>
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          title="Remove signup"
          className="rounded p-1 transition-colors hover:bg-red-900/50 disabled:opacity-50"
        >
          <Trash2 size={14} className="text-slate-500 hover:text-red-400" />
        </button>
      </td>
    </tr>
  )
}

export function BetaSignupsTable({ signups }: { signups: BetaSignup[] }) {
  const [rows, setRows] = useState(signups)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    setRows(signups)
  }, [signups])

  function handleDelete(id: string) {
    setRows((prev) => prev.filter((signup) => signup.id !== id))
  }

  function handleUpdate(id: string, update: SignupUpdate) {
    setRows((prev) =>
      prev.map((signup) =>
        signup.id === id
          ? {
              ...signup,
              status: update.status ?? signup.status,
              notes: update.notes !== undefined ? update.notes : signup.notes,
              invited_at: update.invited_at !== undefined ? update.invited_at : signup.invited_at,
              onboarded_at:
                update.onboarded_at !== undefined ? update.onboarded_at : signup.onboarded_at,
              tracker: update.tracker !== undefined ? update.tracker : signup.tracker,
            }
          : signup
      )
    )
  }

  const filtered = useMemo(() => {
    let list = rows

    if (statusFilter !== 'all') {
      list = list.filter((signup) => signup.status === statusFilter)
    }

    if (search.trim()) {
      const query = search.toLowerCase().trim()
      list = list.filter(
        (signup) =>
          signup.name.toLowerCase().includes(query) ||
          signup.email.toLowerCase().includes(query) ||
          signup.phone?.toLowerCase().includes(query) ||
          signup.business_name?.toLowerCase().includes(query) ||
          signup.cuisine_type?.toLowerCase().includes(query) ||
          signup.tracker?.current_stage.toLowerCase().includes(query) ||
          signup.tracker?.last_email_type?.toLowerCase().includes(query)
      )
    }

    return list
  }, [rows, search, statusFilter])

  async function handleExportCsv() {
    setExporting(true)
    try {
      const csv = await exportBetaSignupsCsv()
      if (!csv) return

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `chefflow-beta-signups-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('[beta-csv] Export failed:', error)
    } finally {
      setExporting(false)
    }
  }

  if (signups.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-8 text-center text-sm text-slate-400">
        No beta signups yet. Share your /beta link to start collecting interest.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email, business, stage..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          title="Filter by status"
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-brand-500 focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="invited">Invited</option>
          <option value="onboarded">Onboarded</option>
          <option value="declined">Declined</option>
        </select>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          <Download size={14} />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {search || statusFilter !== 'all' ? (
        <p className="text-xs text-slate-500">
          Showing {filtered.length} of {rows.length} signups
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 text-center text-sm text-slate-400">
          No signups match your search.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800 text-left">
                <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-300">Date</th>
                <th className="px-4 py-3 font-medium text-slate-300">Name</th>
                <th className="px-4 py-3 font-medium text-slate-300">Email</th>
                <th className="px-4 py-3 font-medium text-slate-300">Phone</th>
                <th className="px-4 py-3 font-medium text-slate-300">Business</th>
                <th className="px-4 py-3 font-medium text-slate-300">Cuisine</th>
                <th className="px-4 py-3 font-medium text-slate-300">Years</th>
                <th className="px-4 py-3 font-medium text-slate-300">Source</th>
                <th className="px-4 py-3 font-medium text-slate-300">Status</th>
                <th className="px-4 py-3 font-medium text-slate-300">Notes</th>
                <th className="w-12 px-4 py-3 font-medium text-slate-300">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((signup) => (
                <SignupRow
                  key={signup.id}
                  signup={signup}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
