'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { exportBetaSurveyResultsCsv, createBetaSurveyInvites } from '@/lib/beta-survey/actions'
import type {
  BetaSurveyResponse,
  BetaSurveyInvite,
  SurveyQuestion,
} from '@/lib/beta-survey/survey-utils'

interface SurveyResultsClientProps {
  surveyId: string
  responses: BetaSurveyResponse[]
  invites: BetaSurveyInvite[]
  appUrl: string
  questions: SurveyQuestion[]
}

export function SurveyResultsClient({
  surveyId,
  responses,
  invites,
  appUrl,
  questions,
}: SurveyResultsClientProps) {
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<'chef' | 'client' | 'tester'>('tester')
  const [sendInviteEmail, setSendInviteEmail] = useState(true)
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [filterRole, setFilterRole] = useState<string>('all')

  const handleExport = async () => {
    setExporting(true)
    try {
      const result = await exportBetaSurveyResultsCsv(surveyId)
      if (result.success && result.csv) {
        const blob = new Blob([result.csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `beta-survey-results-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('[export]', err)
    } finally {
      setExporting(false)
    }
  }

  const handleCreateInvite = async () => {
    setCreatingInvite(true)
    try {
      const result = await createBetaSurveyInvites(
        surveyId,
        [
          {
            name: inviteName.trim() || undefined,
            email: inviteEmail.trim() || undefined,
            role: inviteRole,
          },
        ],
        sendInviteEmail && !!inviteEmail.trim()
      )
      if (result.success) {
        setInviteEmail('')
        setInviteName('')
        setShowInviteForm(false)
        router.refresh()
      }
    } catch (err) {
      console.error('[createInvite]', err)
    } finally {
      setCreatingInvite(false)
    }
  }

  const filteredResponses =
    filterRole === 'all' ? responses : responses.filter((r) => r.respondent_role === filterRole)

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          disabled={exporting || responses.length === 0}
          className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
        >
          Create Invite Link
        </button>
      </div>

      {/* Invite creation form */}
      {showInviteForm && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-3">
          <h3 className="text-sm font-medium text-slate-200">New Invite</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Name (optional)"
              className="rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email (optional)"
              className="rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'chef' | 'client' | 'tester')}
              className="rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-100"
            >
              <option value="tester">Tester</option>
              <option value="chef">Chef</option>
              <option value="client">Client</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input
              type="checkbox"
              checked={sendInviteEmail}
              onChange={(e) => setSendInviteEmail(e.target.checked)}
              className="rounded border-slate-600"
            />
            Send email invitation
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleCreateInvite}
              disabled={creatingInvite}
              className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
            >
              {creatingInvite ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => setShowInviteForm(false)}
              className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Invite links */}
      {invites.length > 0 && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
          <h3 className="text-sm font-medium text-slate-200 mb-3">
            Invite Links ({invites.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 text-xs bg-slate-900 rounded-md px-3 py-2"
              >
                <span className="text-slate-400 w-20 shrink-0">{inv.role}</span>
                <span className="text-slate-300 truncate flex-1">
                  {inv.name || inv.email || 'Anonymous'}
                </span>
                <code className="text-slate-500 text-[10px] truncate max-w-[200px]">
                  {appUrl}/beta-survey/{inv.token}
                </code>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    inv.response_id
                      ? 'bg-green-900 text-green-300'
                      : inv.claimed_at
                        ? 'bg-amber-900 text-amber-300'
                        : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {inv.response_id ? 'Submitted' : inv.claimed_at ? 'Opened' : 'Pending'}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${appUrl}/beta-survey/${inv.token}`)
                  }}
                  className="text-slate-500 hover:text-slate-300 text-[10px] shrink-0"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Responses table */}
      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-200">
            Responses ({filteredResponses.length})
          </h3>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-300"
          >
            <option value="all">All roles</option>
            <option value="chef">Chef</option>
            <option value="client">Client</option>
            <option value="tester">Tester</option>
          </select>
        </div>

        {filteredResponses.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">No responses yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-700">
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Name/Email</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">NPS</th>
                  <th className="px-4 py-2 font-medium">Satisfaction</th>
                  <th className="px-4 py-2 font-medium">Would Pay</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredResponses.map((r) => {
                  const isExpanded = expandedRow === r.id
                  return (
                    <>
                      <tr
                        key={r.id}
                        onClick={() => setExpandedRow(isExpanded ? null : r.id)}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer"
                      >
                        <td className="px-4 py-2.5 text-slate-300">
                          {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-200">
                          {r.respondent_name || r.respondent_email || '-'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400">{r.respondent_role || '-'}</td>
                        <td className="px-4 py-2.5">
                          {r.nps_score !== null ? (
                            <span
                              className={`font-medium ${
                                r.nps_score >= 9
                                  ? 'text-green-400'
                                  : r.nps_score >= 7
                                    ? 'text-yellow-400'
                                    : 'text-red-400'
                              }`}
                            >
                              {r.nps_score}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-300">
                          {r.overall_satisfaction ?? '-'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-300">
                          {r.would_pay === null ? '-' : r.would_pay ? 'Yes' : 'No'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              r.submitted_at
                                ? 'bg-green-900 text-green-300'
                                : 'bg-amber-900 text-amber-300'
                            }`}
                          >
                            {r.submitted_at ? 'Submitted' : 'In Progress'}
                          </span>
                        </td>
                      </tr>
                      {/* Expanded row showing full answers */}
                      {isExpanded && (
                        <tr key={`${r.id}-detail`} className="border-b border-slate-700/50">
                          <td colSpan={7} className="px-4 py-4 bg-slate-900/50">
                            <div className="space-y-2">
                              {questions.map((q) => {
                                const val = (r.answers as Record<string, unknown>)?.[q.id]
                                if (val === undefined || val === null || val === '') return null
                                return (
                                  <div key={q.id}>
                                    <span className="text-xs text-slate-500">{q.label}</span>
                                    <p className="text-sm text-slate-200 mt-0.5">
                                      {Array.isArray(val) ? val.join(', ') : String(val)}
                                    </p>
                                  </div>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
