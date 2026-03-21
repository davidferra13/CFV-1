'use client'

import { useState, useTransition, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  getConnections,
  respondToRequest,
  endConnection,
  getMentorshipStats,
  type MentorshipConnection,
  type MentorshipStats,
} from '@/lib/community/mentorship-actions'

export function MentorshipDashboard({ chefId }: { chefId: string }) {
  const [isPending, startTransition] = useTransition()
  const [connections, setConnections] = useState<MentorshipConnection[]>([])
  const [stats, setStats] = useState<MentorshipStats | null>(null)
  const [filter, setFilter] = useState<'all' | 'mentor' | 'mentee'>('all')
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  function loadData() {
    startTransition(async () => {
      try {
        const [conns, s] = await Promise.all([
          getConnections(filter === 'all' ? undefined : filter),
          getMentorshipStats(),
        ])
        setConnections(conns)
        setStats(s)
      } catch {
        setFeedback({ type: 'error', message: 'Failed to load connections' })
      }
    })
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  function handleRespond(connectionId: string, accept: boolean) {
    setFeedback(null)
    startTransition(async () => {
      try {
        const result = await respondToRequest(connectionId, accept)
        if (result.success) {
          setFeedback({
            type: 'success',
            message: accept ? 'Request accepted!' : 'Request declined.',
          })
          loadData()
        } else {
          setFeedback({
            type: 'error',
            message: result.error || 'Failed to respond',
          })
        }
      } catch {
        setFeedback({
          type: 'error',
          message: 'Something went wrong. Please try again.',
        })
      }
    })
  }

  function handleEnd(connectionId: string) {
    setFeedback(null)
    startTransition(async () => {
      try {
        const result = await endConnection(connectionId)
        if (result.success) {
          setFeedback({
            type: 'success',
            message: 'Connection completed.',
          })
          loadData()
        } else {
          setFeedback({
            type: 'error',
            message: result.error || 'Failed to end connection',
          })
        }
      } catch {
        setFeedback({
          type: 'error',
          message: 'Something went wrong. Please try again.',
        })
      }
    })
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-brand-100 text-brand-800',
    declined: 'bg-gray-100 text-gray-600',
  }

  const pendingIncoming = connections.filter(
    (c) => c.status === 'pending' && c.mentor_id === chefId
  )
  const pendingOutgoing = connections.filter(
    (c) => c.status === 'pending' && c.mentee_id === chefId
  )
  const activeConns = connections.filter((c) => c.status === 'active')
  const historyConns = connections.filter(
    (c) => c.status === 'completed' || c.status === 'declined'
  )

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {stats.active_as_mentor + stats.active_as_mentee}
            </p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending_incoming}</p>
            <p className="text-xs text-gray-500">Incoming</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-2xl font-bold text-brand-600">{stats.pending_outgoing}</p>
            <p className="text-xs text-gray-500">Outgoing</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
            <p className="text-2xl font-bold text-gray-600">{stats.total_completed}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {(['all', 'mentor', 'mentee'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${
              filter === f ? 'bg-orange-100 text-orange-800' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f === 'all' ? 'All Connections' : `As ${f}`}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {feedback && (
        <p
          className={`text-sm rounded-lg px-3 py-2 ${
            feedback.type === 'success' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'
          }`}
        >
          {feedback.message}
        </p>
      )}

      {/* Pending Incoming Requests */}
      {pendingIncoming.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Pending Requests (for you to review)
          </h3>
          <div className="space-y-3">
            {pendingIncoming.map((conn) => (
              <div key={conn.id} className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {conn.mentee_name || 'A chef'} wants your mentorship
                    </p>
                    {conn.message && (
                      <p className="mt-1 text-sm text-gray-600">&ldquo;{conn.message}&rdquo;</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(conn.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      onClick={() => handleRespond(conn.id, true)}
                      disabled={isPending}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => handleRespond(conn.id, false)}
                      disabled={isPending}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending Outgoing */}
      {pendingOutgoing.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Your Pending Requests</h3>
          <div className="space-y-3">
            {pendingOutgoing.map((conn) => (
              <div key={conn.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      Request to {conn.mentor_name || 'a mentor'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Sent {new Date(conn.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                    Pending
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Connections */}
      {activeConns.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Active Connections</h3>
          <div className="space-y-3">
            {activeConns.map((conn) => {
              const isMentor = conn.mentor_id === chefId
              return (
                <div key={conn.id} className="rounded-xl border border-green-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {isMentor
                          ? `Mentoring ${conn.mentee_name || 'a chef'}`
                          : `Learning from ${conn.mentor_name || 'a mentor'}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        Started{' '}
                        {conn.started_at
                          ? new Date(conn.started_at).toLocaleDateString()
                          : 'recently'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${statusColors[conn.status]}`}
                      >
                        {conn.status}
                      </span>
                      <Button
                        variant="ghost"
                        onClick={() => handleEnd(conn.id)}
                        disabled={isPending}
                      >
                        Complete
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* History */}
      {historyConns.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">History</h3>
          <div className="space-y-2">
            {historyConns.map((conn) => {
              const isMentor = conn.mentor_id === chefId
              return (
                <div key={conn.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        {isMentor
                          ? `Mentored ${conn.mentee_name || 'a chef'}`
                          : `Learned from ${conn.mentor_name || 'a mentor'}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {conn.ended_at
                          ? new Date(conn.ended_at).toLocaleDateString()
                          : new Date(conn.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[conn.status]}`}>
                      {conn.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!isPending && connections.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No mentorship connections yet.</p>
          <p className="text-xs mt-1">
            Search for mentors to get started, or set up your profile to be found.
          </p>
        </div>
      )}
    </div>
  )
}
