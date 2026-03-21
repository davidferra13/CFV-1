'use client'

// Admin Real-Time Presence Panel
// Subscribes to site:presence Realtime channel and shows all active visitors live.

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { PresencePayload } from './presence-beacon'

const CHANNEL_NAME = 'site:presence'

interface SessionEntry extends PresencePayload {
  presenceRef: string
  durationSeconds: number
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

function RoleBadge({ role }: { role: 'authenticated' | 'anonymous' }) {
  if (role === 'anonymous') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-800 text-stone-400">
        Anonymous
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-brand-900 text-brand-700">
      Logged In
    </span>
  )
}

function parsePresenceState(state: Record<string, unknown[]>): SessionEntry[] {
  const now = Date.now()
  const entries: SessionEntry[] = []

  Object.entries(state).forEach(([presenceRef, presences]) => {
    presences.forEach((p) => {
      const payload = p as PresencePayload
      const joinedMs = payload.joinedAt ? new Date(payload.joinedAt).getTime() : now
      const durationSeconds = Math.floor((now - joinedMs) / 1000)
      entries.push({ ...payload, presenceRef, durationSeconds })
    })
  })

  // Sort by joinedAt descending (most recent first)
  return entries.sort((a, b) => {
    return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
  })
}

type FilterRole = 'all' | 'authenticated' | 'anonymous'

export function AdminPresencePanel() {
  const [sessions, setSessions] = useState<SessionEntry[]>([])
  const [filter, setFilter] = useState<FilterRole>('all')
  const [pageFilter, setPageFilter] = useState('')
  const [now, setNow] = useState(Date.now())

  // Tick every 5 seconds to update durations
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    let channel: RealtimeChannel

    channel = supabase
      .channel(CHANNEL_NAME)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, unknown[]>
        const parsed = parsePresenceState(state)
        setSessions(parsed)
      })
      .on('presence', { event: 'join' }, () => {
        const state = channel.presenceState() as Record<string, unknown[]>
        const parsed = parsePresenceState(state)
        setSessions(parsed)
      })
      .on('presence', { event: 'leave' }, () => {
        const state = channel.presenceState() as Record<string, unknown[]>
        const parsed = parsePresenceState(state)
        setSessions(parsed)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Update durations every tick
  const displaySessions = sessions
    .map((s) => ({
      ...s,
      durationSeconds: Math.floor((now - new Date(s.joinedAt).getTime()) / 1000),
    }))
    .filter((s) => (filter === 'all' ? true : s.role === filter))
    .filter((s) => (pageFilter ? s.page.toLowerCase().includes(pageFilter.toLowerCase()) : true))

  const total = sessions.length
  const authenticated = sessions.filter((s) => s.role === 'authenticated').length
  const anonymous = sessions.filter((s) => s.role === 'anonymous').length

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-stone-900 rounded-lg border border-slate-200 px-4 py-3">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-medium">Total Active</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{total}</p>
        </div>
        <div className="bg-stone-900 rounded-lg border border-slate-200 px-4 py-3">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-medium">Logged In</p>
          <p className="text-2xl font-bold text-brand-600 mt-1">{authenticated}</p>
        </div>
        <div className="bg-stone-900 rounded-lg border border-slate-200 px-4 py-3">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-medium">Anonymous</p>
          <p className="text-2xl font-bold text-stone-500 mt-1">{anonymous}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-stone-900 rounded-lg border border-slate-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1">
            {(['all', 'authenticated', 'anonymous'] as FilterRole[]).map((r) => (
              <button
                key={r}
                onClick={() => setFilter(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filter === r
                    ? 'bg-slate-900 text-white'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                }`}
              >
                {r === 'all' ? 'All' : r === 'authenticated' ? 'Logged In' : 'Anonymous'}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Filter by page..."
            value={pageFilter}
            onChange={(e) => setPageFilter(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 w-48"
          />
          <span className="text-xs text-slate-400 ml-auto">
            {displaySessions.length} session{displaySessions.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Session table */}
      <div className="bg-stone-900 rounded-lg border border-slate-200 overflow-hidden">
        {displaySessions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            {total === 0
              ? 'No active sessions. Presence updates in real-time - try opening the site in another tab.'
              : 'No sessions match your current filter.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Identity
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Current Page
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Time on Site
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Referrer
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displaySessions.map((session) => (
                  <tr key={session.presenceRef} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      {session.email ? (
                        <div>
                          <p className="font-medium text-slate-900 text-xs">{session.email}</p>
                          <p className="text-slate-400 text-xs font-mono">
                            {session.sessionId.slice(0, 8)}…
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-stone-500 text-xs">Visitor</p>
                          <p className="text-slate-400 text-xs font-mono">
                            {session.sessionId.slice(0, 8)}…
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={session.role} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-stone-300 bg-stone-800 px-1.5 py-0.5 rounded">
                        {session.page || '/'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-400">
                      {formatDuration(Math.max(0, session.durationSeconds))}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-[200px] truncate">
                      {session.referrer || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 text-center">
        Updates in real-time via Supabase Realtime presence. Sessions disappear automatically when a
        tab is closed.
      </p>
    </div>
  )
}
