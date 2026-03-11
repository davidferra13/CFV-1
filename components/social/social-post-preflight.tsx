import type { SocialPost } from '@/lib/social/types'
import { CheckCircle, AlertCircle, ChevronDown } from '@/components/ui/icons'

type Props = {
  post: SocialPost
}

export function SocialPostPreflight({ post }: Props) {
  if (post.preflight_ready) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-200">
        <CheckCircle className="w-4 h-4 flex-shrink-0" />
        <span className="font-medium">Preflight ready</span>
        <span className="text-emerald-500">— all checks passed</span>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm text-amber-200">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span className="font-medium">
          {post.preflight_missing_items.length} item
          {post.preflight_missing_items.length !== 1 ? 's' : ''} missing
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 ml-6">
        {post.preflight_missing_items.map((item) => (
          <span
            key={item}
            className="text-xs px-2 py-0.5 rounded-full bg-amber-950 text-amber-200 ring-1 ring-inset ring-amber-800"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
