'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { castVote, updateVote, closePoll, setFinalDecision } from '@/lib/dinner-circles/polls'

interface PollOption {
  label: string
  description?: string
}

interface PollVote {
  voter_id: string
  option_index: number
}

interface Poll {
  id: string
  circle_id: string
  question: string
  options: PollOption[]
  poll_type: string
  is_closed: boolean
  close_at: string | null
  result_visibility: 'public' | 'after_close' | 'host_only'
  allow_vote_change: boolean
  final_choice: number | null
  final_choice_note: string | null
  requires_chef_review: boolean
  caller_vote: PollVote | null
  votes: PollVote[]
}

interface PollCardProps {
  poll: Poll
  circleId: string
  callerProfileId: string
  isHost: boolean
  onRefresh?: () => void
}

export function PollCard({ poll, circleId, callerProfileId, isHost, onRefresh }: PollCardProps) {
  const [selected, setSelected] = useState<number | null>(poll.caller_vote?.option_index ?? null)
  const [isPending, startTransition] = useTransition()
  const [showDecide, setShowDecide] = useState(false)
  const [decisionNote, setDecisionNote] = useState('')

  const canSeeResults =
    poll.result_visibility === 'public' ||
    (poll.result_visibility === 'after_close' && poll.is_closed) ||
    isHost

  const isExpired = poll.close_at ? new Date(poll.close_at) < new Date() : false
  const canVote = !poll.is_closed && !isExpired && poll.final_choice === null

  function handleVote(idx: number) {
    if (!canVote) return
    if (selected === idx) return

    startTransition(async () => {
      try {
        if (poll.caller_vote) {
          if (!poll.allow_vote_change) {
            toast.error('This poll does not allow vote changes')
            return
          }
          await updateVote({ circleId, pollId: poll.id, optionIndex: idx })
        } else {
          await castVote({ circleId, pollId: poll.id, optionIndex: idx })
        }
        setSelected(idx)
        toast.success('Vote recorded')
        onRefresh?.()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to vote')
      }
    })
  }

  function handleClose() {
    startTransition(async () => {
      try {
        await closePoll({ circleId, pollId: poll.id })
        toast.success('Poll closed')
        onRefresh?.()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to close poll')
      }
    })
  }

  function handleDecide(idx: number) {
    startTransition(async () => {
      try {
        const result = await setFinalDecision({
          circleId,
          pollId: poll.id,
          finalChoice: idx,
          finalChoiceNote: decisionNote || undefined,
          requiresChefReview: poll.requires_chef_review,
        })
        if (result.status === 'pending_chef_review') {
          toast.success('Decision sent to chef for review')
        } else {
          toast.success('Final decision set')
        }
        setShowDecide(false)
        onRefresh?.()
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to set decision')
      }
    })
  }

  // Tally votes per option
  const tallies = poll.options.map(
    (_, idx) => poll.votes.filter((v) => v.option_index === idx).length
  )
  const totalVotes = poll.votes.length
  const maxVotes = Math.max(...tallies, 0)

  const statusLabel = poll.is_closed
    ? poll.final_choice !== null
      ? poll.requires_chef_review && (poll.final_choice_note ?? '').includes('PENDING')
        ? 'Pending chef review'
        : 'Decided'
      : 'Closed'
    : isExpired
      ? 'Expired'
      : 'Open'

  const statusColor: Record<string, string> = {
    Open: 'bg-green-100 text-green-800',
    Closed: 'bg-muted text-muted-foreground',
    Expired: 'bg-muted text-muted-foreground',
    Decided: 'bg-brand-100 text-brand-800',
    'Pending chef review': 'bg-yellow-100 text-yellow-800',
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-semibold leading-snug">{poll.question}</p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[statusLabel] ?? 'bg-muted'}`}
            >
              {statusLabel}
            </span>
            <span className="text-xs text-muted-foreground capitalize">
              {poll.poll_type.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
        {isHost && !poll.is_closed && !isExpired && (
          <button
            onClick={handleClose}
            disabled={isPending}
            className="shrink-0 rounded-md border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
          >
            Close poll
          </button>
        )}
      </div>

      {/* Options */}
      <ul className="space-y-2">
        {poll.options.map((opt, idx) => {
          const isSelected = selected === idx
          const isFinalChoice = poll.final_choice === idx
          const pct = totalVotes > 0 ? Math.round((tallies[idx] / totalVotes) * 100) : 0
          const isLeader = canSeeResults && tallies[idx] === maxVotes && maxVotes > 0

          return (
            <li key={idx}>
              <button
                onClick={() => handleVote(idx)}
                disabled={!canVote || isPending}
                className={`w-full text-left rounded-lg border px-4 py-3 transition-all text-sm relative overflow-hidden
                  ${isSelected ? 'border-brand-600 bg-brand-50' : 'hover:bg-muted/50'}
                  ${isFinalChoice ? 'ring-2 ring-brand-600' : ''}
                  disabled:cursor-default`}
              >
                {/* Background bar for results */}
                {canSeeResults && totalVotes > 0 && (
                  <span
                    className={`absolute inset-y-0 left-0 transition-all ${isLeader ? 'bg-brand-100' : 'bg-muted/40'}`}
                    data-pct={pct}
                    ref={(el) => {
                      if (el) el.style.width = `${pct}%`
                    }}
                  />
                )}
                <span className="relative flex items-center justify-between gap-2">
                  <span className={`font-medium ${isFinalChoice ? 'text-brand-700' : ''}`}>
                    {opt.label}
                    {isFinalChoice && <span className="ml-2 text-xs">(chosen)</span>}
                  </span>
                  {canSeeResults && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {tallies[idx]} vote{tallies[idx] !== 1 ? 's' : ''}
                      {totalVotes > 0 ? ` (${pct}%)` : ''}
                    </span>
                  )}
                </span>
                {opt.description && (
                  <span className="relative mt-0.5 block text-xs text-muted-foreground">
                    {opt.description}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {totalVotes} total vote{totalVotes !== 1 ? 's' : ''}
        </span>
        {poll.close_at && !poll.is_closed && (
          <span>Closes {new Date(poll.close_at).toLocaleDateString()}</span>
        )}
      </div>

      {/* Final decision panel for hosts */}
      {isHost && poll.is_closed && poll.final_choice === null && (
        <div className="border-t pt-3 space-y-2">
          {showDecide ? (
            <div className="space-y-2">
              <p className="text-xs font-medium">Pick the final choice:</p>
              <ul className="space-y-1">
                {poll.options.map((opt, idx) => (
                  <li key={idx}>
                    <button
                      onClick={() => handleDecide(idx)}
                      disabled={isPending}
                      className="w-full text-left rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                    >
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
              <textarea
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
                placeholder="Add a note for the group (optional)"
                className="w-full rounded-md border px-3 py-2 text-sm"
                rows={2}
                maxLength={1000}
              />
              <button
                onClick={() => setShowDecide(false)}
                className="text-xs text-muted-foreground hover:underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDecide(true)}
              className="rounded-md bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700"
            >
              Set final decision
            </button>
          )}
        </div>
      )}

      {poll.final_choice_note && !(poll.final_choice_note ?? '').includes('PENDING') && (
        <p className="text-xs text-muted-foreground border-t pt-2 italic">
          {poll.final_choice_note}
        </p>
      )}
    </div>
  )
}

interface PollListProps {
  polls: Poll[]
  circleId: string
  callerProfileId: string
  isHost: boolean
  onRefresh?: () => void
}

export function PollList({ polls, circleId, callerProfileId, isHost, onRefresh }: PollListProps) {
  if (polls.length === 0) {
    return <p className="text-sm text-muted-foreground">No polls yet.</p>
  }
  return (
    <div className="space-y-4">
      {polls.map((poll) => (
        <PollCard
          key={poll.id}
          poll={poll}
          circleId={circleId}
          callerProfileId={callerProfileId}
          isHost={isHost}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  )
}
