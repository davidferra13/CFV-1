'use client'

import { useState, useEffect } from 'react'
import type { CircleDetail } from '@/lib/hub/circle-detail-actions'

interface Props {
  circle: CircleDetail
}

/**
 * Agreement channel wrapper for the circle redesign layout.
 * Delegates to AgreementTab (components/hub/agreement-tab.tsx) once that
 * component is built. Until then, renders a coming-soon placeholder.
 *
 * The AgreementTab component handles its own data fetching via
 * getAgreement(), so we only pass the groupId and host info.
 */
export function AgreementChannel({ circle }: Props) {
  const [AgreementTab, setAgreementTab] = useState<React.ComponentType<any> | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    import('@/components/hub/agreement-tab')
      .then((mod) => setAgreementTab(() => mod.AgreementTab))
      .catch(() => setLoadFailed(true))
  }, [])

  // Build host list from circle members for AgreementTab props
  const hosts = circle.members
    .filter((m) => ['owner', 'chef', 'co-host'].includes(m.role))
    .map((m) => ({
      profileId: m.profile_id,
      label: m.display_name,
    }))

  // Current user is the chef/owner
  const chefMember = circle.members.find((m) => ['owner', 'chef'].includes(m.role))
  const currentProfileId = chefMember?.profile_id ?? ''

  if (loadFailed || (!AgreementTab && typeof window !== 'undefined')) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤝</span>
          <h2 className="text-base font-semibold text-stone-100">Agreement</h2>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
            🔒 Chef Only
          </span>
        </div>

        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-stone-700/50 bg-[#313338] px-12 py-10 text-center shadow-lg">
            <span className="text-5xl">🤝</span>
            <h2 className="text-2xl font-bold text-stone-100">Cohosting Agreement</h2>
            <p className="text-sm text-stone-500">
              {loadFailed
                ? 'Agreement engine is being set up. Check back soon.'
                : 'Loading agreement...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!AgreementTab) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-600 border-t-stone-300" />
      </div>
    )
  }

  return (
    <AgreementTab groupId={circle.id} hosts={hosts} currentProfileId={currentProfileId} isHost />
  )
}
