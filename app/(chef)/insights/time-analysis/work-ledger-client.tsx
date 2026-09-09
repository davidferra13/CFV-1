'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  clockIn,
  clockOut,
  correctSession,
  mergeSessions,
  reviewSession,
  splitSession,
} from '@/lib/work-ledger/actions'
import { WORK_ACTIVITIES } from '@/lib/work-ledger/validators'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const ACTORS = [
  ['david_active', 'David active'],
  ['david_supervisory', 'David supervisory'],
  ['ai_agent_runtime', 'AI / agent runtime'],
  ['staff', 'Staff'],
] as const

function formatMinutes(value: number | null) {
  if (value === null) return 'Unknown duration'
  const hours = Math.floor(value / 60)
  const minutes = value % 60
  return hours ? `${hours}h ${minutes ? `${minutes}m` : ''}`.trim() : `${minutes}m`
}

function label(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function WorkLedgerClient({ ledger }: { ledger: any }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [activity, setActivity] = useState('other_business')
  const [summary, setSummary] = useState('DF Private Chef work')
  const [selected, setSelected] = useState<string[]>([])
  const openClock = ledger.openClock
  const reviewQueue = ledger.sessions.filter(
    (session: any) => session.status === 'proposed' || session.status === 'review_required'
  )

  function run(action: () => Promise<unknown>) {
    setError(null)
    startTransition(async () => {
      try {
        await action()
        router.refresh()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'The ledger action failed')
      }
    })
  }

  function correct(session: any) {
    const rawMinutes = window.prompt(
      'Correct duration in minutes',
      String(session.duration_minutes ?? '')
    )
    if (rawMinutes === null) return
    const duration = rawMinutes.trim() === '' ? null : Number(rawMinutes)
    if (duration !== null && (!Number.isInteger(duration) || duration < 0)) {
      setError('Duration must be a whole number of minutes')
      return
    }
    const reason = window.prompt('Why is this correction needed?', 'Corrected by David')
    if (!reason) return
    run(() =>
      correctSession({
        session_id: session.id,
        activity_type: session.activity_type,
        started_at: session.started_at,
        ended_at: session.ended_at,
        duration_minutes: duration,
        reason,
      })
    )
  }

  function split(session: any) {
    if (!session.started_at || !session.ended_at) return
    const midpoint = new Date(
      (Date.parse(session.started_at) + Date.parse(session.ended_at)) / 2
    ).toISOString()
    const splitAt = window.prompt('Split at this ISO timestamp', midpoint)
    if (!splitAt) return
    const reason = window.prompt('Why should this session be split?', 'Separated activities')
    if (reason) run(() => splitSession({ session_id: session.id, split_at: splitAt, reason }))
  }

  function toggleSelected(sessionId: string) {
    setSelected((current) =>
      current.includes(sessionId)
        ? current.filter((id) => id !== sessionId)
        : current.length < 2
          ? [...current, sessionId]
          : current
    )
  }

  function mergeSelected() {
    if (selected.length !== 2) return
    const reason = window.prompt('Why should these sessions be merged?', 'Same continuous work')
    if (!reason) return
    run(() => mergeSessions({ session_ids: selected, reason }))
    setSelected([])
  }

  return (
    <div className="space-y-6">
      <Card className="border-amber-500/30">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>{openClock ? 'Clocked in' : 'Manual fallback clock'}</span>
            {openClock && <span className="text-xs font-normal text-emerald-400">Live</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {openClock ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-stone-100">{label(openClock.activity_type)}</p>
                <p className="text-xs text-stone-500">
                  Started {new Date(openClock.started_at).toLocaleString()}
                </p>
              </div>
              <Button disabled={isPending} onClick={() => run(() => clockOut())}>
                Clock out
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-[1fr_1.4fr_auto]">
              <select
                value={activity}
                onChange={(event) => setActivity(event.target.value)}
                className="h-10 rounded-md border border-stone-700 bg-stone-900 px-3 text-sm"
                aria-label="Work activity"
              >
                {WORK_ACTIVITIES.map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </select>
              <Input
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                aria-label="Clock note"
              />
              <Button
                disabled={isPending || !summary.trim()}
                onClick={() =>
                  run(() =>
                    clockIn({
                      actor_type: 'david_active',
                      activity_type: activity,
                      summary,
                    })
                  )
                }
              >
                Clock in
              </Button>
            </div>
          )}
          <p className="text-xs text-stone-500">
            Automation remains primary. This clock is the recovery control when evidence capture
            misses work.
          </p>
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ACTORS.map(([actor, title]) => (
          <Card key={actor}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm text-stone-400">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatMinutes(ledger.approvedTotals[actor])}</p>
              <p className="mt-1 text-xs text-stone-500">Approved only</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source coverage</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.devices.length === 0 ? (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              No capture device has checked in yet. The manual clock works, but automatic coverage
              has not started.
            </div>
          ) : (
            <div className="space-y-2">
              {ledger.devices.map((device: any) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between border-b border-stone-800 py-2 text-sm last:border-0"
                >
                  <span>
                    {device.label} · {label(device.device_type)}
                  </span>
                  <span className={device.paused ? 'text-amber-400' : 'text-emerald-400'}>
                    {device.paused ? 'Paused / coverage gap' : 'Capturing'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>
              Review queue{' '}
              <span className="text-sm font-normal text-stone-500">({reviewQueue.length})</span>
            </CardTitle>
            <Button
              size="sm"
              variant="secondary"
              disabled={isPending || selected.length !== 2}
              onClick={mergeSelected}
            >
              Merge selected ({selected.length}/2)
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {reviewQueue.length === 0 ? (
            <p className="text-sm text-stone-500">No proposed sessions need review.</p>
          ) : (
            reviewQueue.map((session: any) => (
              <div key={session.id} className="rounded-lg border border-stone-800 p-3">
                <label className="mb-2 flex items-center gap-2 text-xs text-stone-500">
                  <input
                    type="checkbox"
                    checked={selected.includes(session.id)}
                    onChange={() => toggleSelected(session.id)}
                  />{' '}
                  Select for merge
                </label>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-stone-100">{label(session.activity_type)}</p>
                    <p className="text-xs text-stone-500">
                      {label(session.actor_type)} · {formatMinutes(session.duration_minutes)} ·{' '}
                      {session.evidence_count} evidence signal(s)
                    </p>
                    <p className="mt-2 text-sm text-stone-300">{session.summary}</p>
                    {session.boundary_gap && (
                      <p className="mt-1 text-xs text-amber-300">Limit: {session.boundary_gap}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-stone-800 px-2 py-1 text-xs text-stone-300">
                    {label(session.confidence_tier)}
                  </span>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    disabled={isPending || session.duration_minutes === null}
                    onClick={() =>
                      run(() =>
                        reviewSession({
                          session_id: session.id,
                          decision: 'approved',
                          reason: 'Confirmed by David',
                        })
                      )
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() =>
                      run(() =>
                        reviewSession({
                          session_id: session.id,
                          decision: 'rejected',
                          reason: 'Rejected by David',
                        })
                      )
                    }
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => correct(session)}
                  >
                    Correct
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isPending || !session.started_at || !session.ended_at}
                    onClick={() => split(session)}
                  >
                    Split
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Actor timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ACTORS.map(([actor, title]) => {
            const sessions = ledger.sessions
              .filter((session: any) => session.actor_type === actor)
              .slice(0, 8)
            return (
              <div key={actor} className="grid gap-2 md:grid-cols-[150px_1fr]">
                <div className="text-sm font-medium text-stone-400">{title}</div>
                <div className="min-h-10 rounded-md bg-stone-950 p-2">
                  {sessions.length === 0 ? (
                    <span className="text-xs text-stone-600">No captured sessions</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {sessions.map((session: any) => (
                        <span
                          key={session.id}
                          className={`rounded px-2 py-1 text-xs ${
                            session.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-200'
                              : 'bg-amber-500/20 text-amber-200'
                          }`}
                          title={session.summary}
                        >
                          {label(session.activity_type)} · {formatMinutes(session.duration_minutes)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          <p className="text-xs text-stone-500">
            Calendar plans are not counted as work. Proposed and approved time remain visually
            distinct.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
