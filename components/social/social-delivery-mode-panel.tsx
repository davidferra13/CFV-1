'use client'

import type { PlatformDeliveryAssessment, SocialDeliveryMode } from '@/lib/social/types'
import { SOCIAL_PLATFORM_LABELS } from '@/lib/social/types'

const MODE_LABELS: Record<SocialDeliveryMode, string> = {
  direct_publish: 'Auto-publish',
  upload_as_draft: 'Upload as draft',
  manual_handoff: 'Manual post required',
  blocked: 'Blocked',
}

const MODE_COLORS: Record<SocialDeliveryMode, string> = {
  direct_publish: 'text-green-400 bg-green-950 border-green-800',
  upload_as_draft: 'text-blue-400 bg-blue-950 border-blue-800',
  manual_handoff: 'text-yellow-400 bg-yellow-950 border-yellow-800',
  blocked: 'text-red-400 bg-red-950 border-red-800',
}

const MODE_DESCRIPTIONS: Record<SocialDeliveryMode, string> = {
  direct_publish: 'ChefFlow will post directly to the live feed at the scheduled time.',
  upload_as_draft:
    'ChefFlow uploads the content as a draft. Review and publish it in the platform app.',
  manual_handoff: 'ChefFlow cannot publish here. Copy the content and post it manually.',
  blocked: 'This platform cannot receive this post. See blockers below.',
}

type Props = {
  assessments: PlatformDeliveryAssessment[]
  /** Compact mode for inline display (e.g. inside an editor sidebar). */
  compact?: boolean
}

export function SocialDeliveryModePanel({ assessments, compact = false }: Props) {
  if (assessments.length === 0) return null

  return (
    <div className={`space-y-${compact ? '2' : '3'}`}>
      {!compact && (
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
          Delivery by Platform
        </p>
      )}
      {assessments.map((a) => (
        <div
          key={a.platform}
          className={`rounded-lg border px-3 py-2.5 space-y-1.5 ${a.mode === 'blocked' ? 'border-red-800 bg-red-950/30' : 'border-stone-700 bg-stone-900'}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-stone-200">
              {SOCIAL_PLATFORM_LABELS[a.platform]}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${MODE_COLORS[a.mode]}`}
            >
              {MODE_LABELS[a.mode]}
            </span>
          </div>

          {!compact && <p className="text-xs text-stone-500">{MODE_DESCRIPTIONS[a.mode]}</p>}

          {a.blockers.length > 0 && (
            <ul className="space-y-0.5 mt-1">
              {a.blockers.map((b, i) => (
                <li key={i} className="text-xs text-red-400 flex gap-1.5">
                  <span className="shrink-0 mt-0.5">!</span>
                  {b}
                </li>
              ))}
            </ul>
          )}

          {!compact && a.warnings.length > 0 && (
            <ul className="space-y-0.5 mt-1">
              {a.warnings.map((w, i) => (
                <li key={i} className="text-xs text-stone-500 flex gap-1.5">
                  <span className="shrink-0 mt-0.5 text-stone-600">-</span>
                  {w}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
