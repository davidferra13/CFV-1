'use client'

import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBetaSurveyInvites, exportBetaSurveyResultsCsv } from '@/lib/beta-survey/actions'
import {
  getBetaSurveyResponseMeta,
  type BetaSurveyInvite,
  type BetaSurveyResponse,
  type SurveyQuestion,
  type SurveyType,
} from '@/lib/beta-survey/survey-utils'

interface SurveyResultsClientProps {
  surveyId: string
  surveySlug: string
  surveyType: SurveyType
  responses: BetaSurveyResponse[]
  invites: BetaSurveyInvite[]
  appUrl: string
  questions: SurveyQuestion[]
}

export function SurveyResultsClient({
  surveyId,
  surveySlug,
  surveyType,
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
  const [filterSource, setFilterSource] = useState<string>('all')
  const [filterWave, setFilterWave] = useState<string>('all')
  const [launchSource, setLaunchSource] = useState('warm_outreach')
  const [launchChannel, setLaunchChannel] = useState('email')
  const [launchCampaign, setLaunchCampaign] = useState('')
  const [launchWave, setLaunchWave] = useState('')
  const [launchLabel, setLaunchLabel] = useState('')
  const [launchRole, setLaunchRole] = useState('')

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

  const publicShareUrl = `${appUrl}/beta-survey/public/${surveySlug}`
  const trackedParams = new URLSearchParams()
  if (launchSource.trim()) trackedParams.set('source', launchSource.trim())
  if (launchChannel.trim()) trackedParams.set('channel', launchChannel.trim())
  if (launchCampaign.trim()) trackedParams.set('campaign', launchCampaign.trim())
  if (launchWave.trim()) trackedParams.set('wave', launchWave.trim())
  if (launchLabel.trim()) trackedParams.set('launch', launchLabel.trim())
  if (launchRole.trim()) trackedParams.set('respondent_role', launchRole.trim())

  const trackedQuery = trackedParams.toString()
  const configuredPublicShareUrl = trackedQuery
    ? `${publicShareUrl}?${trackedQuery}`
    : publicShareUrl

  const roleOptions = Array.from(
    new Set(responses.map((response) => response.respondent_role || 'unknown'))
  ).sort()
  const sourceOptions = Array.from(
    new Set(
      responses
        .map((response) => getBetaSurveyResponseMeta(response.answers).source)
        .filter((value): value is string => !!value)
    )
  ).sort()
  const waveOptions = Array.from(
    new Set(
      responses
        .map((response) => getBetaSurveyResponseMeta(response.answers).wave)
        .filter((value): value is string => !!value)
    )
  ).sort()
  const filteredResponses = responses.filter((response) => {
    if (filterRole !== 'all' && response.respondent_role !== filterRole) {
      return false
    }

    const meta = getBetaSurveyResponseMeta(response.answers)
    if (filterSource !== 'all' && meta.source !== filterSource) {
      return false
    }

    if (filterWave !== 'all' && meta.wave !== filterWave) {
      return false
    }

    return true
  })
  const isShareableResearchSurvey =
    surveyType === 'market_research_operator' || surveyType === 'market_research_client'

  const applyLaunchPreset = (preset: {
    source: string
    channel: string
    campaign?: string
    wave?: string
    launch?: string
  }) => {
    setLaunchSource(preset.source)
    setLaunchChannel(preset.channel)
    setLaunchCampaign(preset.campaign || '')
    setLaunchWave(preset.wave || '')
    setLaunchLabel(preset.launch || '')
  }

  return (
    <div className="space-y-6">
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

      {isShareableResearchSurvey && (
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-3">
          <div>
            <h3 className="text-sm font-medium text-slate-200">Launch Controls</h3>
            <p className="mt-1 text-xs text-slate-500">
              Configure a tracked public link once, then share it without manually rewriting the
              form or reconstructing attribution later.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-1 text-xs text-slate-400">
              <span>Source</span>
              <input
                type="text"
                value={launchSource}
                onChange={(e) => setLaunchSource(e.target.value)}
                placeholder="warm_outreach"
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-400">
              <span>Channel</span>
              <input
                type="text"
                value={launchChannel}
                onChange={(e) => setLaunchChannel(e.target.value)}
                placeholder="email"
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-400">
              <span>Campaign</span>
              <input
                type="text"
                value={launchCampaign}
                onChange={(e) => setLaunchCampaign(e.target.value)}
                placeholder="wave_1"
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-400">
              <span>Wave</span>
              <input
                type="text"
                value={launchWave}
                onChange={(e) => setLaunchWave(e.target.value)}
                placeholder="wave-1"
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-400">
              <span>Launch Label</span>
              <input
                type="text"
                value={launchLabel}
                onChange={(e) => setLaunchLabel(e.target.value)}
                placeholder="operator-soft-launch"
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
              />
            </label>
            <label className="space-y-1 text-xs text-slate-400">
              <span>Respondent Role Override</span>
              <input
                type="text"
                value={launchRole}
                onChange={(e) => setLaunchRole(e.target.value)}
                placeholder="food_operator"
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                applyLaunchPreset({
                  source: 'warm_outreach',
                  channel: 'email',
                  campaign: 'wave_1',
                  launch: 'soft_launch',
                })
              }
              className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
            >
              Warm Outreach
            </button>
            <button
              onClick={() =>
                applyLaunchPreset({
                  source: 'community_distribution',
                  channel: 'facebook_group',
                  campaign: 'wave_1',
                  launch: 'community_push',
                })
              }
              className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
            >
              Community Push
            </button>
            <button
              onClick={() =>
                applyLaunchPreset({
                  source: 'partner_distribution',
                  channel: 'newsletter',
                  campaign: 'wave_1',
                  launch: 'partner_send',
                })
              }
              className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
            >
              Partner Send
            </button>
          </div>

          <div className="rounded-md bg-slate-900 px-3 py-2 text-xs text-slate-300 break-all">
            {configuredPublicShareUrl}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(configuredPublicShareUrl)}
              className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              Copy Launch Link
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(publicShareUrl)}
              className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
            >
              Copy Base Link
            </button>
            <button
              onClick={() => {
                setLaunchCampaign('')
                setLaunchWave('')
                setLaunchLabel('')
                setLaunchRole('')
              }}
              className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
            >
              Clear Optional Params
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Public responses can carry `source`, `channel`, `campaign`, `wave`, `launch`,
            `respondent_role`, `utm_source`, `utm_medium`, and `utm_campaign` query params. The
            dashboard and CSV export preserve them with each response.
          </p>
        </div>
      )}

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
                <code className="text-slate-500 text-xxs truncate max-w-[200px]">
                  {appUrl}/beta-survey/{inv.token}
                </code>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xxs font-medium ${
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
                  className="text-slate-500 hover:text-slate-300 text-xxs shrink-0"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-lg border border-slate-700">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-200">
            Responses ({filteredResponses.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-300"
            >
              <option value="all">All roles</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-300"
            >
              <option value="all">All sources</option>
              {sourceOptions.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
            <select
              value={filterWave}
              onChange={(e) => setFilterWave(e.target.value)}
              className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-300"
            >
              <option value="all">All waves</option>
              {waveOptions.map((wave) => (
                <option key={wave} value={wave}>
                  {wave}
                </option>
              ))}
            </select>
          </div>
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
                  <th className="px-4 py-2 font-medium">Source</th>
                  <th className="px-4 py-2 font-medium">Channel</th>
                  <th className="px-4 py-2 font-medium">Wave</th>
                  <th className="px-4 py-2 font-medium">NPS</th>
                  <th className="px-4 py-2 font-medium">Satisfaction</th>
                  <th className="px-4 py-2 font-medium">Would Pay</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredResponses.map((response) => {
                  const isExpanded = expandedRow === response.id
                  const meta = getBetaSurveyResponseMeta(response.answers)
                  const source = meta.source || ''
                  const channel = meta.channel || ''
                  const wave = meta.wave || ''

                  return (
                    <Fragment key={response.id}>
                      <tr
                        onClick={() => setExpandedRow(isExpanded ? null : response.id)}
                        className="border-b border-slate-700/50 hover:bg-slate-700/30 cursor-pointer"
                      >
                        <td className="px-4 py-2.5 text-slate-300">
                          {response.submitted_at
                            ? new Date(response.submitted_at).toLocaleDateString()
                            : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-200">
                          {response.respondent_name || response.respondent_email || '-'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-400">
                          {response.respondent_role || '-'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-300">{source || '-'}</td>
                        <td className="px-4 py-2.5 text-slate-300">{channel || '-'}</td>
                        <td className="px-4 py-2.5 text-slate-300">{wave || '-'}</td>
                        <td className="px-4 py-2.5">
                          {response.nps_score !== null ? (
                            <span
                              className={`font-medium ${
                                response.nps_score >= 9
                                  ? 'text-green-400'
                                  : response.nps_score >= 7
                                    ? 'text-yellow-400'
                                    : 'text-red-400'
                              }`}
                            >
                              {response.nps_score}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-300">
                          {response.overall_satisfaction ?? '-'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-300">
                          {response.would_pay === null ? '-' : response.would_pay ? 'Yes' : 'No'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              response.submitted_at
                                ? 'bg-green-900 text-green-300'
                                : 'bg-amber-900 text-amber-300'
                            }`}
                          >
                            {response.submitted_at ? 'Submitted' : 'In Progress'}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-slate-700/50">
                          <td colSpan={10} className="px-4 py-4 bg-slate-900/50">
                            <div className="space-y-2">
                              {(source ||
                                channel ||
                                meta.campaign ||
                                meta.wave ||
                                meta.launch ||
                                meta.respondentRole) && (
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                  {source && (
                                    <div>
                                      <span className="text-xs text-slate-500">Source</span>
                                      <p className="text-sm text-slate-200 mt-0.5">{source}</p>
                                    </div>
                                  )}
                                  {channel && (
                                    <div>
                                      <span className="text-xs text-slate-500">Channel</span>
                                      <p className="text-sm text-slate-200 mt-0.5">{channel}</p>
                                    </div>
                                  )}
                                  {meta.campaign && (
                                    <div>
                                      <span className="text-xs text-slate-500">Campaign</span>
                                      <p className="text-sm text-slate-200 mt-0.5">
                                        {meta.campaign}
                                      </p>
                                    </div>
                                  )}
                                  {meta.wave && (
                                    <div>
                                      <span className="text-xs text-slate-500">Wave</span>
                                      <p className="text-sm text-slate-200 mt-0.5">{meta.wave}</p>
                                    </div>
                                  )}
                                  {meta.launch && (
                                    <div>
                                      <span className="text-xs text-slate-500">Launch</span>
                                      <p className="text-sm text-slate-200 mt-0.5">{meta.launch}</p>
                                    </div>
                                  )}
                                  {meta.respondentRole && (
                                    <div>
                                      <span className="text-xs text-slate-500">
                                        Link Role Override
                                      </span>
                                      <p className="text-sm text-slate-200 mt-0.5">
                                        {meta.respondentRole}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                              {questions.map((question) => {
                                const value = (response.answers as Record<string, unknown>)?.[
                                  question.id
                                ]
                                if (value === undefined || value === null || value === '') {
                                  return null
                                }

                                return (
                                  <div key={question.id}>
                                    <span className="text-xs text-slate-500">{question.label}</span>
                                    <p className="text-sm text-slate-200 mt-0.5">
                                      {Array.isArray(value) ? value.join(', ') : String(value)}
                                    </p>
                                  </div>
                                )
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
