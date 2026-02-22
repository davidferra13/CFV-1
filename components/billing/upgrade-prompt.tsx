'use client'

// Reusable upgrade prompt card shown when a Free user encounters a Pro feature.
// Consistent branding using the terracotta brand palette.
// Links to /settings/billing for checkout.

import Link from 'next/link'
import { Sparkles } from 'lucide-react'

type Props = {
  label?: string | null
  description?: string | null
}

export function UpgradePrompt({ label, description }: Props) {
  return (
    <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-8 text-center max-w-md mx-auto my-12">
      <Sparkles size={28} className="mx-auto mb-3 text-brand-500" />
      <h3 className="text-lg font-semibold text-stone-900">{label ?? 'Pro Feature'}</h3>
      <p className="mt-1.5 text-sm text-stone-500 leading-relaxed">
        {description ?? 'Upgrade to ChefFlow Pro to unlock this feature.'}
      </p>
      <Link
        href="/settings/billing"
        className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 transition-colors"
      >
        <Sparkles size={14} />
        Upgrade to Pro
      </Link>
    </div>
  )
}
