'use client'

/**
 * AgreementTab placeholder.
 *
 * This stub will be replaced by the full cohosting agreement UI
 * (setup wizard, active agreement view, signature block) once the
 * agreement engine build agent completes its work.
 *
 * Props contract (from the plan):
 *   groupId: string          - the circle/group ID
 *   eventId?: string         - optional specific event
 *   hosts: { profileId: string; label: string }[]
 *   currentProfileId: string - the viewing user's profile ID
 *   isHost: boolean          - whether the viewer is a host
 */

interface AgreementTabProps {
  groupId: string
  eventId?: string
  hosts: { profileId: string; label: string }[]
  currentProfileId: string
  isHost: boolean
}

export function AgreementTab({ groupId }: AgreementTabProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🤝</span>
        <h2 className="text-base font-semibold text-stone-100">Cohosting Agreement</h2>
        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
          🔒 Chef Only
        </span>
      </div>

      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-stone-700/50 bg-[#313338] px-12 py-10 text-center shadow-lg">
          <span className="text-5xl">🤝</span>
          <h2 className="text-2xl font-bold text-stone-100">Agreement Engine</h2>
          <p className="max-w-xs text-sm text-stone-500">
            Structured responsibility checklists, compensation mapping, and e-signatures for
            co-hosted events. Being wired up now.
          </p>
          <p className="text-xs text-stone-600">Circle: {groupId}</p>
        </div>
      </div>
    </div>
  )
}
