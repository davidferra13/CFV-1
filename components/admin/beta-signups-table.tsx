'use client'

import { useState, useTransition, useMemo } from 'react'
import { updateBetaSignupStatus, exportBetaSignupsCsv, deleteBetaSignup } from '@/lib/beta/actions'
import { Download, Copy, Check, Search, Trash2 } from '@/components/ui/icons'

interface BetaSignup {
  id: string
  name: string
  email: string
  phone: string | null
  business_name: string | null
  cuisine_type: string | null
  years_in_business: string | null
  referral_source: string | null
  source_page: string | null
  source_cta: string | null
  status: string
  notes: string | null
  created_at: string
  invited_at: string | null
  onboarded_at: string | null
}

const STATUS_STYLES: Record<string, string> = {
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

function formatMarketingOrigin(signup: Pick<BetaSignup, 'source_page' | 'source_cta'>) {
  if (!signup.source_page && !signup.source_cta) return '-'
  if (!signup.source_cta) return signup.source_page
  return `${signup.source_page ?? 'unknown'} / ${signup.source_cta}`
}

// ── Invite Link Copy Button ──
function CopyInviteLinkButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)
  const signupUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/signup?ref=beta&email=${encodeURIComponent(email)}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(signupUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = signupUrl
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy invite link'}
      className="p-1 rounded hover:bg-slate-700 transition-colors"
    >
      {copied ? (
        <Check size={14} className="text-emerald-400" />
      ) : (
        <Copy size={14} className="text-slate-400 hover:text-slate-200" />
      )}
    </button>
  )
}

// ── Individual Row ──
function SignupRow({ signup, onDelete }: { signup: BetaSignup; onDelete: (id: string) => void }) {
  const [status, setStatus] = useState(signup.status)
  const [notes, setNotes] = useState(signup.notes || '')
  const [editingNotes, setEditingNotes] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleDelete() {
    if (!confirm(`Remove ${signup.name} (${signup.email}) from the beta list?`)) return
    setError('')
    startTransition(async () => {
      try {
        const result = await deleteBetaSignup(signup.id)
        if (result.success) {
          onDelete(signup.id)
        } else {
          setError(result.error || 'Failed to delete')
        }
      } catch {
        setError('Failed to delete')
      }
    })
  }

  function handleStatusChange(newStatus: string) {
    const previousStatus = status
    setStatus(newStatus)
    setError('')

    startTransition(async () => {
      try {
        const result = await updateBetaSignupStatus(
          signup.id,
          newStatus as 'pending' | 'invited' | 'onboarded' | 'declined'
        )
        if (!result.success) {
          setStatus(previousStatus)
          setError(result.error || 'Failed to update')
        }
      } catch {
        setStatus(previousStatus)
        setError('Failed to update status')
      }
    })
  }

  function handleNotesSave() {
    setEditingNotes(false)
    setError('')

    startTransition(async () => {
      try {
        const result = await updateBetaSignupStatus(
          signup.id,
          status as 'pending' | 'invited' | 'onboarded' | 'declined',
          notes
        )
        if (!result.success) {
          setError(result.error || 'Failed to save notes')
        }
      } catch {
        setError('Failed to save notes')
      }
    })
  }

  return (
    <tr className="border-b border-slate-700/60 bg-slate-800/50 hover:bg-slate-700/40 transition-colors">
      <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
        {formatDate(signup.created_at)}
      </td>
      <td className="px-4 py-3 text-slate-200 font-medium text-sm">{signup.name}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <a href={`mailto:${signup.email}`} className="text-sm text-brand-400 hover:underline">
            {signup.email}
          </a>
          <CopyInviteLinkButton email={signup.email} />
        </div>
      </td>
      <td className="px-4 py-3 text-slate-400 text-xs">{signup.phone || '-'}</td>
      <td className="px-4 py-3 text-slate-300 text-xs">{signup.business_name || '-'}</td>
      <td className="px-4 py-3 text-slate-400 text-xs">{signup.cuisine_type || '-'}</td>
      <td className="px-4 py-3 text-slate-400 text-xs">{signup.years_in_business || '-'}</td>
      <td className="px-4 py-3 text-slate-400 text-xs">
        {signup.referral_source
          ? REFERRAL_LABELS[signup.referral_source] || signup.referral_source
          : '-'}
      </td>
      <td className="px-4 py-3 text-slate-400 text-xs">{formatMarketingOrigin(signup)}</td>
      <td className="px-4 py-3">
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={isPending}
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium border-0 cursor-pointer ${STATUS_STYLES[status] || 'bg-slate-700 text-slate-200'} disabled:opacity-50`}
        >
          <option value="pending">Pending</option>
          <option value="invited">Invited</option>
          <option value="onboarded">Onboarded</option>
          <option value="declined">Declined</option>
        </select>
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </td>
      <td className="px-4 py-3">
        {editingNotes ? (
          <div className="flex gap-1">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNotesSave()
                if (e.key === 'Escape') setEditingNotes(false)
              }}
              className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              autoFocus
            />
            <button
              type="button"
              onClick={handleNotesSave}
              disabled={isPending}
              className="text-xs text-brand-400 hover:text-brand-300 whitespace-nowrap disabled:opacity-50"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingNotes(true)}
            className="text-xs text-slate-500 hover:text-slate-300 truncate max-w-[120px] block text-left"
            title={notes || 'Add notes'}
          >
            {notes || 'Add notes...'}
          </button>
        )}
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          title="Remove signup"
          className="p-1 rounded hover:bg-red-900/50 transition-colors disabled:opacity-50"
        >
          <Trash2 size={14} className="text-slate-500 hover:text-red-400" />
        </button>
      </td>
    </tr>
  )
}

// ── Main Table with Search, Filter, CSV Export ──
export function BetaSignupsTable({ signups }: { signups: BetaSignup[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [exporting, setExporting] = useState(false)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

  function handleDelete(id: string) {
    setDeletedIds((prev) => new Set(prev).add(id))
  }

  const filtered = useMemo(() => {
    let list = signups.filter((s) => !deletedIds.has(s.id))

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((s) => s.status === statusFilter)
    }

    // Search (name, email, business name, cuisine)
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.business_name && s.business_name.toLowerCase().includes(q)) ||
          (s.cuisine_type && s.cuisine_type.toLowerCase().includes(q)) ||
          (s.phone && s.phone.includes(q))
      )
    }

    return list
  }, [signups, search, statusFilter, deletedIds])

  async function handleExportCsv() {
    setExporting(true)
    try {
      const csv = await exportBetaSignupsCsv()
      if (!csv) return

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chefflow-beta-signups-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[beta-csv] Export failed:', err)
    } finally {
      setExporting(false)
    }
  }

  if (signups.length === 0) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-8 text-center text-slate-400 text-sm">
        No beta signups yet. Share your /beta link to start collecting interest.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: Search + Filter + Export */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email, business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          title="Filter by status"
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="invited">Invited</option>
          <option value="onboarded">Onboarded</option>
          <option value="declined">Declined</option>
        </select>

        {/* CSV Export */}
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <Download size={14} />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Results count */}
      {(search || statusFilter !== 'all') && (
        <p className="text-xs text-slate-500">
          Showing {filtered.length} of {signups.length} signups
        </p>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 text-center text-slate-400 text-sm">
          No signups match your search.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800 text-left">
                <th className="px-4 py-3 font-medium text-slate-300 whitespace-nowrap">Date</th>
                <th className="px-4 py-3 font-medium text-slate-300">Name</th>
                <th className="px-4 py-3 font-medium text-slate-300">Email</th>
                <th className="px-4 py-3 font-medium text-slate-300">Phone</th>
                <th className="px-4 py-3 font-medium text-slate-300">Business</th>
                <th className="px-4 py-3 font-medium text-slate-300">Cuisine</th>
                <th className="px-4 py-3 font-medium text-slate-300">Years</th>
                <th className="px-4 py-3 font-medium text-slate-300">Source</th>
                <th className="px-4 py-3 font-medium text-slate-300">Origin</th>
                <th className="px-4 py-3 font-medium text-slate-300">Status</th>
                <th className="px-4 py-3 font-medium text-slate-300">Notes</th>
                <th className="px-4 py-3 font-medium text-slate-300 w-12">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((signup) => (
                <SignupRow key={signup.id} signup={signup} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
