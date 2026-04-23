import Link from 'next/link'
import type { NearbyFallbackAction } from '@/lib/discover/nearby-fallbacks'

type Props = {
  title: string
  description: string
  actions: NearbyFallbackAction[]
  eyebrow?: string
  className?: string
}

function actionClasses(variant: NearbyFallbackAction['variant']) {
  if (variant === 'primary') {
    return 'border-brand-700/50 bg-brand-950/35 text-brand-100 hover:border-brand-600 hover:bg-brand-950/55'
  }

  if (variant === 'secondary') {
    return 'border-stone-700/80 bg-stone-950/75 text-stone-100 hover:border-stone-600 hover:bg-stone-900'
  }

  return 'border-stone-800/80 bg-stone-950/55 text-stone-200 hover:border-stone-700 hover:bg-stone-900/80'
}

export function NearbyFallbackActions({
  title,
  description,
  actions,
  eyebrow = 'Next Best Moves',
  className = '',
}: Props) {
  if (actions.length === 0) return null

  return (
    <div className={`rounded-2xl border border-stone-800/80 bg-stone-950/60 p-5 ${className}`.trim()}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{eyebrow}</p>
      <h3 className="mt-2 text-xl font-semibold text-stone-100">{title}</h3>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-stone-400">{description}</p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`rounded-2xl border p-4 transition-colors ${actionClasses(action.variant)}`}
          >
            <p className="text-sm font-semibold">{action.label}</p>
            <p className="mt-2 text-xs leading-relaxed text-stone-400">{action.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
