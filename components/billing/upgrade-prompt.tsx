'use client'

// Support prompt card - previously showed Pro upgrade CTA.
// Now shows a gentle "support ChefFlow" message. Retained for
// any remaining call sites. All features are free.

import Link from 'next/link'
import { Heart } from '@/components/ui/icons'

type Props = {
  label?: string | null
  description?: string | null
}

export function UpgradePrompt({ label, description }: Props) {
  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900 p-8 text-center max-w-md mx-auto my-12">
      <Heart size={28} className="mx-auto mb-3 text-brand-400" />
      <h3 className="text-lg font-semibold text-stone-100">{label ?? 'ChefFlow'}</h3>
      <p className="mt-1.5 text-sm text-stone-400 leading-relaxed">
        {description ?? 'This feature is free for all chefs.'}
      </p>
      <Link
        href="/settings/billing"
        className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
      >
        <Heart size={14} />
        Support ChefFlow
      </Link>
    </div>
  )
}
