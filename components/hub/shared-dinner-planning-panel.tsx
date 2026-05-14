import { CheckCircle, Eye, Lock, ShieldCheck, Target, Users } from '@/components/ui/icons'
import {
  buildSharedDinnerConsensusSnapshot,
  type SharedDinnerConsensusSnapshot,
} from '@/lib/hub/shared-dinner-planning'
import type { HubGroup, HubGroupMember, MealBoardEntry } from '@/lib/hub/types'

export function SharedDinnerPlanningPanel({
  group,
  members,
  mealBoardEntries,
  currentMember,
}: {
  group: HubGroup
  members: HubGroupMember[]
  mealBoardEntries: MealBoardEntry[]
  currentMember: HubGroupMember | null
}) {
  const snapshot = buildSharedDinnerConsensusSnapshot({
    group,
    members,
    mealBoardEntries,
    currentMember,
  })

  return (
    <section className="m-4 rounded-xl border border-stone-800 bg-stone-900/70 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-300">
              <Users className="h-3.5 w-3.5" />
              Dinner consensus
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-800 px-2.5 py-1 text-xs text-stone-300">
              {snapshot.access.canFinalizeDecision ? (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
              ) : snapshot.access.canContribute ? (
                <Eye className="h-3.5 w-3.5 text-sky-300" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-stone-500" />
              )}
              {snapshot.permissionCopy}
            </span>
          </div>
          <h2 className="mt-3 text-lg font-semibold text-stone-100">{snapshot.readiness.label}</h2>
          <p className="mt-1 text-sm text-stone-400">
            {snapshot.consensus.topCandidate
              ? `${snapshot.consensus.topCandidate.label} is leading right now.`
              : 'The circle needs a meal candidate before readiness can be scored.'}
          </p>
        </div>
        <div className="min-w-[8rem] rounded-lg border border-stone-800 bg-stone-950/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-stone-500">Readiness</span>
            <span className="text-sm font-semibold text-stone-100">
              {snapshot.readiness.score}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-800">
            <div
              className="h-full rounded-full bg-brand-400"
              style={{ width: `${Math.max(4, Math.min(100, snapshot.readiness.score))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <ConsensusStat
          label="Members"
          value={`${snapshot.votedMemberCount}/${snapshot.memberCount}`}
          detail="weighed in"
        />
        <ConsensusStat
          label="Candidates"
          value={String(snapshot.candidateCount)}
          detail="in the shared decision"
        />
        <ConsensusStat
          label="Status"
          value={snapshot.readiness.readyToFinalize ? 'Ready' : 'Open'}
          detail={statusDetail(snapshot)}
        />
      </div>

      <div className="mt-4 rounded-lg border border-stone-800 bg-stone-950/50 p-3">
        <div className="mb-2 flex items-center gap-2">
          <Target className="h-4 w-4 text-brand-300" />
          <h3 className="text-sm font-semibold text-stone-200">Consensus ranking</h3>
        </div>
        {snapshot.topCandidates.length > 0 ? (
          <div className="space-y-2">
            {snapshot.topCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="flex items-start justify-between gap-3 rounded-md bg-stone-900/80 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-100">{candidate.label}</p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {candidate.blockers.length > 0
                      ? `Blocked by ${candidate.blockers.slice(0, 2).join(', ')}`
                      : candidate.reasons.slice(0, 2).join(', ') || `${candidate.fit} fit`}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-300">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {candidate.score}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-500">No dinner candidates are shared yet.</p>
        )}
      </div>
    </section>
  )
}

function ConsensusStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-stone-100">{value}</p>
      <p className="mt-0.5 text-xs text-stone-500">{detail}</p>
    </div>
  )
}

function statusDetail(snapshot: SharedDinnerConsensusSnapshot): string {
  if (snapshot.readiness.blockerLabels.length > 0) {
    return snapshot.readiness.blockerLabels.slice(0, 2).join(', ')
  }
  if (snapshot.readiness.missingVoteCount > 0) {
    return `${snapshot.readiness.missingVoteCount} vote${
      snapshot.readiness.missingVoteCount === 1 ? '' : 's'
    } needed`
  }
  return snapshot.readiness.readyToFinalize ? 'enough signal' : 'still gathering signal'
}
