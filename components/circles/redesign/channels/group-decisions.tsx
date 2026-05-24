'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { CircleDetail } from '@/lib/hub/circle-detail-actions'

interface Props {
  circle: CircleDetail
}

type PollStatus = 'open' | 'chef-review' | 'closed'

interface PollOption {
  label: string
  votes: number
}

interface Poll {
  id: string
  question: string
  options: PollOption[]
  status: PollStatus
  totalEligible: number
  timeLabel: string
}

const PLACEHOLDER_POLLS: Poll[] = [
  {
    id: 'poll-1',
    question: 'What cuisine for next dinner?',
    options: [
      { label: 'Italian', votes: 9 },
      { label: 'Thai', votes: 6 },
      { label: 'Mexican', votes: 5 },
    ],
    status: 'open',
    totalEligible: 20,
    timeLabel: '2 days remaining',
  },
  {
    id: 'poll-2',
    question: 'Should we do a potluck style?',
    options: [
      { label: 'Yes', votes: 7 },
      { label: 'No', votes: 5 },
    ],
    status: 'chef-review',
    totalEligible: 12,
    timeLabel: 'Voting ended',
  },
  {
    id: 'poll-3',
    question: 'Indoor or outdoor seating?',
    options: [
      { label: 'Indoor', votes: 6 },
      { label: 'Outdoor', votes: 10 },
    ],
    status: 'closed',
    totalEligible: 16,
    timeLabel: 'Closed 3 days ago',
  },
]

const STATUS_STYLES: Record<PollStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-emerald-500/20 text-emerald-300' },
  'chef-review': { label: 'Chef Review', className: 'bg-amber-500/20 text-amber-300' },
  closed: { label: 'Closed', className: 'bg-stone-600/30 text-stone-400' },
}

function PollCard({ poll }: { poll: Poll }) {
  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0)
  const maxVotes = Math.max(...poll.options.map((o) => o.votes))
  const status = STATUS_STYLES[poll.status]

  return (
    <div className="rounded-xl border border-stone-700/30 bg-stone-800/50 p-5">
      {/* Question + Status */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-stone-100">{poll.question}</h3>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
            status.className
          )}
        >
          {status.label}
        </span>
      </div>

      {/* Options */}
      <div className="mt-4 flex flex-col gap-2">
        {poll.options.map((option) => {
          const pct = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0
          const isLeading = option.votes === maxVotes && totalVotes > 0

          return (
            <button
              key={option.label}
              type="button"
              disabled={poll.status !== 'open'}
              className={cn(
                'relative overflow-hidden rounded-lg border px-4 py-2.5 text-left transition-all',
                poll.status === 'open'
                  ? 'border-stone-600/40 hover:border-stone-500/60 cursor-pointer'
                  : 'border-stone-700/20 cursor-default'
              )}
            >
              {/* Fill bar */}
              <div
                className={cn(
                  'absolute inset-y-0 left-0 rounded-lg transition-all',
                  isLeading
                    ? 'bg-gradient-to-r from-brand-500/30 to-brand-400/10'
                    : 'bg-stone-700/20'
                )}
                style={{ width: `${pct}%` }}
              />
              {/* Content */}
              <div className="relative flex items-center justify-between">
                <span
                  className={cn(
                    'text-sm',
                    isLeading ? 'font-medium text-stone-100' : 'text-stone-300'
                  )}
                >
                  {option.label}
                </span>
                <span className="ml-3 text-xs text-stone-500">
                  {option.votes} vote{option.votes !== 1 ? 's' : ''} ({pct}%)
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
        <span>
          {totalVotes} of {poll.totalEligible} voted
        </span>
        <span>{poll.timeLabel}</span>
      </div>

      {/* Chef Review Gate */}
      {poll.status === 'chef-review' && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-sm text-amber-200">
            This poll needs your approval before results are shared with the group.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded-full bg-emerald-500/20 px-4 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/30"
            >
              Approve
            </button>
            <button
              type="button"
              className="rounded-full bg-amber-500/20 px-4 py-1.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/30"
            >
              Override
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function GroupDecisionsChannel({ circle }: Props) {
  const [showPast, setShowPast] = useState(false)

  const activePolls = PLACEHOLDER_POLLS.filter((p) => p.status !== 'closed')
  const pastPolls = PLACEHOLDER_POLLS.filter((p) => p.status === 'closed')

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-stone-100">
          <span>🤝</span>
          Group Decisions
        </h2>
        <button
          type="button"
          className="rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          New Poll
        </button>
      </div>

      {/* Active Polls */}
      <div className="flex flex-col gap-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Active Polls
        </h3>
        {activePolls.length > 0 ? (
          activePolls.map((poll) => <PollCard key={poll.id} poll={poll} />)
        ) : (
          <div className="rounded-xl border border-stone-700/30 bg-stone-800/50 p-6 text-center text-sm text-stone-500">
            No active polls. Create one to get group input.
          </div>
        )}
      </div>

      {/* Past Decisions */}
      {pastPolls.length > 0 && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setShowPast((p) => !p)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500 transition-colors hover:text-stone-300"
          >
            <span>{showPast ? '▲' : '▼'}</span>
            Past Decisions ({pastPolls.length})
          </button>
          {showPast && (
            <div className="flex flex-col gap-3">
              {pastPolls.map((poll) => {
                const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0)
                const winner = poll.options.reduce((best, o) => (o.votes > best.votes ? o : best))
                const pct = totalVotes > 0 ? Math.round((winner.votes / totalVotes) * 100) : 0

                return (
                  <div
                    key={poll.id}
                    className="rounded-xl border border-stone-700/20 bg-stone-800/30 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-stone-300">{poll.question}</span>
                      <span className="text-xs text-stone-500">{poll.timeLabel}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm font-medium text-emerald-400">{winner.label}</span>
                      <span className="text-xs text-stone-500">won with {pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
