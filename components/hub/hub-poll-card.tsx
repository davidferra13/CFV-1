'use client'

import { useEffect, useState, useTransition, memo } from 'react'
import { toast } from 'sonner'
import type { HubPoll, HubPollOption } from '@/lib/hub/types'
import { voteOnPoll, removeVote, closePoll } from '@/lib/hub/poll-actions'

interface HubPollCardProps {
  poll: HubPoll
  profileToken: string | null
  isOwnerOrAdmin?: boolean
  onVoted?: () => void | Promise<void>
}

export const HubPollCard = memo(function HubPollCard({
  poll,
  profileToken,
  isOwnerOrAdmin,
  onVoted,
}: HubPollCardProps) {
  const [isPending, startTransition] = useTransition()
  const [localPoll, setLocalPoll] = useState(poll)

  useEffect(() => {
    setLocalPoll(poll)
  }, [poll])

  const participantCount = localPoll.participant_count ?? localPoll.total_votes ?? 0
  const totalSelections = localPoll.total_selections ?? participantCount
  const distributionBase =
    localPoll.poll_type === 'single_choice'
      ? Math.max(participantCount, 1)
      : Math.max(totalSelections, 1)
  const hasVoted = (localPoll.options ?? []).some((option) => option.voted_by_me)

  const pollLabel = localPoll.poll_scope === 'menu_course' ? 'Menu Vote' : 'Poll'
  const interactionHint =
    localPoll.poll_type === 'ranked_choice'
      ? 'Tap options in order of preference.'
      : localPoll.poll_type === 'multi_choice'
        ? `Select up to ${localPoll.max_selections ?? 'multiple'} option${localPoll.max_selections === 1 ? '' : 's'}.`
        : 'Select one option.'

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

        await onVoted?.()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Vote failed. Please try again.')
      }
    })
  }

  const handleClose = () => {
    if (!profileToken) return

    startTransition(async () => {
      try {
        await closePoll({ pollId: localPoll.id, profileToken })
        setLocalPoll((previous) => ({ ...previous, is_closed: true }))
        await onVoted?.()
      } catch {
        toast.error('Failed to close poll.')
      }
    })
  }

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-800/60 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wider text-stone-500">
            <span>{pollLabel}</span>
            {localPoll.course_name && (
              <span className="rounded-full border border-stone-600 px-2 py-0.5 normal-case tracking-normal text-stone-400">
                {localPoll.course_name}
              </span>
            )}
            {localPoll.locked_option_id ? (
              <span className="rounded-full bg-emerald-950/60 px-2 py-0.5 normal-case tracking-normal text-emerald-300">
                Finalized
              </span>
            ) : localPoll.is_closed ? (
              <span className="rounded-full bg-stone-700 px-2 py-0.5 normal-case tracking-normal text-stone-300">
                Closed
              </span>
            ) : null}
          </div>
          <h4 className="mt-1 text-sm font-semibold text-stone-200">{localPoll.question}</h4>
          <p className="mt-1 text-xs text-stone-500">{interactionHint}</p>
        </div>
      </div>

      <div className="space-y-2">
        {(localPoll.options ?? []).map((option) => {
          const metadata = (option.metadata as Record<string, unknown> | null) ?? null
          const description =
            typeof metadata?.description === 'string' ? metadata.description : undefined
          const dietaryTags = Array.isArray(metadata?.dietary_tags)
            ? metadata.dietary_tags.filter((tag): tag is string => typeof tag === 'string')
            : []
          const componentNames = Array.isArray(metadata?.component_names)
            ? metadata.component_names.filter((name): name is string => typeof name === 'string')
            : []
          const pct =
            distributionBase > 0
              ? Math.round(((option.vote_count ?? 0) / distributionBase) * 100)
              : 0

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option)}
              disabled={localPoll.is_closed || !profileToken || isPending}
              className={`relative w-full overflow-hidden rounded-lg border p-3 text-left text-sm transition-colors ${
                option.voted_by_me
                  ? 'border-[var(--hub-primary,#e88f47)] bg-[var(--hub-primary,#e88f47)]/10 text-stone-100'
                  : option.id === localPoll.locked_option_id
                    ? 'border-emerald-700 bg-emerald-950/20 text-stone-100'
                    : 'border-stone-700 bg-stone-800 text-stone-300 hover:border-stone-600'
              } disabled:cursor-default`}
            >
              {(hasVoted || localPoll.is_closed) && (
                <div
                  className="absolute inset-y-0 left-0 bg-stone-700/30 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              )}

              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {option.voted_by_me ? 'Selected: ' : ''}
                      {option.label}
                    </span>
                    {option.option_type === 'opt_out' && (
                      <span className="rounded-full border border-stone-600 px-2 py-0.5 text-[11px] uppercase tracking-wide text-stone-400">
                        Opt out
                      </span>
                    )}
                    {localPoll.locked_option_id === option.id && (
                      <span className="rounded-full bg-emerald-950/60 px-2 py-0.5 text-[11px] uppercase tracking-wide text-emerald-300">
                        Locked
                      </span>
                    )}
                    {localPoll.winning_option_ids?.includes(option.id) &&
                      localPoll.locked_option_id !== option.id && (
                        <span className="rounded-full bg-amber-950/50 px-2 py-0.5 text-[11px] uppercase tracking-wide text-amber-300">
                          Leading
                        </span>
                      )}
                    {localPoll.poll_type === 'ranked_choice' && option.ranked_by_me && (
                      <span className="rounded-full bg-[var(--hub-primary,#e88f47)]/15 px-2 py-0.5 text-[11px] uppercase tracking-wide text-[var(--hub-primary,#e88f47)]">
                        Rank {option.ranked_by_me}
                      </span>
                    )}
                  </div>

                  {description && (
                    <p className="mt-1 line-clamp-2 text-xs text-stone-400">{description}</p>
                  )}

                  {(dietaryTags.length > 0 || componentNames.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-stone-500">
                      {dietaryTags.slice(0, 3).map((tag) => (
                        <span
                          key={`${option.id}-${tag}`}
                          className="rounded-full border border-stone-700 px-2 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                      {componentNames.length > 0 && (
                        <span className="rounded-full border border-stone-700 px-2 py-0.5">
                          {componentNames.slice(0, 2).join(', ')}
                          {componentNames.length > 2 ? ' +' : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {(hasVoted || localPoll.is_closed) && (
                  <div className="shrink-0 text-right text-xs text-stone-500">
                    <div>
                      {option.vote_count ?? 0}
                      {localPoll.poll_type === 'single_choice' ? ' vote' : ' picks'}
                    </div>
                    <div>{pct}%</div>
                    {localPoll.poll_type === 'ranked_choice' && (
                      <div className="mt-1 text-[11px] text-stone-400">
                        {option.score ?? 0} pts
                        {option.first_choice_count ? ` | ${option.first_choice_count} first` : ''}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-stone-500">
        <div className="space-y-0.5">
          <div>
            {participantCount} response{participantCount !== 1 ? 's' : ''}
            {localPoll.poll_type !== 'single_choice' &&
              ` | ${totalSelections} total selection${totalSelections !== 1 ? 's' : ''}`}
          </div>
          {localPoll.allow_opt_out && <div>Opt-out is available for this poll.</div>}
        </div>
        {!localPoll.is_closed && isOwnerOrAdmin && localPoll.poll_scope !== 'menu_course' && (
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
})
