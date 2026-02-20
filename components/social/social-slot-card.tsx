import Link from 'next/link'
import { format } from 'date-fns'
import { Pencil, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import type { SocialPost, SocialPostStatus } from '@/lib/social/types'
import { SOCIAL_STATUS_LABELS } from '@/lib/social/types'
import { SocialPillarBadge } from '@/components/social/social-pillar-badge'
import { Badge } from '@/components/ui/badge'

const STATUS_BADGE: Record<SocialPostStatus, { variant: 'default' | 'success' | 'warning' | 'error' | 'info'; label: string }> = {
  idea: { variant: 'default', label: 'Idea' },
  draft: { variant: 'warning', label: 'Draft' },
  approved: { variant: 'info', label: 'Approved' },
  queued: { variant: 'info', label: 'Queued' },
  published: { variant: 'success', label: 'Published' },
  archived: { variant: 'default', label: 'Archived' },
}

type Props = {
  post: SocialPost
}

export function SocialSlotCard({ post }: Props) {
  const scheduled = new Date(post.schedule_at)
  const statusInfo = STATUS_BADGE[post.status]

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-3 flex flex-col gap-2 hover:border-stone-300 hover:shadow-sm transition-all min-h-[120px]">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <SocialPillarBadge pillar={post.pillar} />
          <span className="text-[10px] text-stone-400">
            {format(scheduled, 'EEE')}{' · '}{format(scheduled, 'h:mm a')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Preflight dot */}
          {post.status !== 'published' && post.status !== 'archived' && (
            post.preflight_ready
              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              : <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Title */}
      <div className="flex-1">
        <p className="text-sm font-medium text-stone-800 line-clamp-2 leading-snug">
          {post.title || <span className="text-stone-400 italic font-normal">Untitled post</span>}
        </p>
        {post.platforms.length > 0 && (
          <p className="text-[10px] text-stone-400 mt-1">
            {post.platforms.join(', ')}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        <Link
          href={`/social/posts/${post.id}`}
          className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </Link>
      </div>
    </div>
  )
}

export function SocialEmptySlotCard() {
  return (
    <div className="bg-stone-50 rounded-lg border border-dashed border-stone-200 p-3 flex items-center justify-center min-h-[120px] text-stone-400 text-sm">
      <div className="text-center">
        <Clock className="w-4 h-4 mx-auto mb-1 opacity-40" />
        <span className="text-xs">Reserved slot</span>
      </div>
    </div>
  )
}
