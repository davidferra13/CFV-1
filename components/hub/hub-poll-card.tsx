'use client'

import { useState, useTransition } from 'react'
import type { HubPoll, HubPollOption } from '@/lib/hub/types'
import { voteOnPoll, removeVote, closePoll } from '@/lib/hub/poll-actions'

interface HubPollCardProps {
  poll: HubPoll
  profileToken: string | null
  isOwnerOrAdmin?: boolean
  onVoted?: () => void
}

export function HubPollCard({ poll, profileToken, isOwnerOrAdmin, onVoted }: HubPollCardProps) {
  const [isPending, startTransition] = useTransition()
  const [localPoll, setLocalPoll] = useState(poll)

  const totalVotes = localPoll.total_votes ?? 0
  const hasVoted = (localPoll.options ?? []).some((o) => o.voted_by_me)

  const handleVote = (option: HubPollOption) => {
    if (!profileToken || localPoll.is_closed) return

    startTransition(async () => {
      try {
        if (option.voted_by_me) {
          await removeVote({
            pollId: localPoll.id,
            optionId: option.id,
            profileToken,
          })
        } else {
          await voteOnPoll({
            pollId: localPoll.id,
            optionId: option.id,
            profileToken,
          })
        }
        // Optimistic update
        setLocalPoll((prev) => {
          const options = (prev.options ?? []).map((o) => {
            if (o.id === option.id) {
              return {
                ...o,
                voted_by_me: !o.voted_by_me,
                vote_count: (o.vote_count ?? 0) + (o.voted_by_me ? -1 : 1),
              }
            }
            // For single choice, unvote others
            if (prev.poll_type === 'single_choice' && !option.voted_by_me && o.voted_by_me) {
              return { ...o, voted_by_me: false, vote_count: (o.vote_count ?? 0) - 1 }
            }
            return o
          })
          return { ...prev, options }
        })
        onVoted?.()
      } catch {
        // Revert not needed - will refresh
      }
    })
  }

  const handleClose = () => {
    if (!profileToken) return
    startTransition(async () => {
      try {
        await closePoll({ pollId: localPoll.id, profileToken })
        setLocalPoll((prev) => ({ ...prev, is_closed: true }))
      } catch {
        // Ignore
      }
    })
  }

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-800/60 p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-stone-500">📊 Poll</div>
          <h4 className="mt-1 text-sm font-semibold text-stone-200">{localPoll.question}</h4>
        </div>
        {localPoll.is_closed && (
          <span className="rounded-full bg-stone-700 px-2 py-0.5 text-xs text-stone-400">
            Closed
          </span>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2">
        {(localPoll.options ?? []).map((option) => {
          const pct = totalVotes > 0 ? Math.round(((option.vote_count ?? 0) / totalVotes) * 100) : 0

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option)}
              disabled={localPoll.is_closed || !profileToken || isPending}
              className={`relative w-full overflow-hidden rounded-lg border p-3 text-left text-sm transition-colors ${
                option.voted_by_me
                  ? 'border-[var(--hub-primary,#e88f47)] bg-[var(--hub-primary,#e88f47)]/10 text-stone-100'
                  : 'border-stone-700 bg-stone-800 text-stone-300 hover:border-stone-600'
              } disabled:cursor-default`}
            >
              {/* Background progress bar */}
              {(hasVoted || localPoll.is_closed) && (
                <div
                  className="absolute inset-y-0 left-0 bg-stone-700/30 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              )}

              <div className="relative flex items-center justify-between">
                <span>
                  {option.voted_by_me && '✓ '}
                  {option.label}
                </span>
                {(hasVoted || localPoll.is_closed) && (
                  <span className="text-xs text-stone-500">
                    {option.vote_count ?? 0} ({pct}%)
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
        <span>
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        </span>
        {!localPoll.is_closed && isOwnerOrAdmin && (
          <button
            onClick={handleClose}
            disabled={isPending}
            className="text-stone-500 hover:text-stone-300"
          >
            Close poll
          </button>
        )}
      </div>
    </div>
  )
}
