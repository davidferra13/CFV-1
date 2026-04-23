import Link from 'next/link'
import type { NearbyCollectionViewModel } from '@/lib/discover/nearby-collections'

type Props = {
  collection: NearbyCollectionViewModel
  index?: number
}

const COLLECTION_CARD_THEMES = [
  {
    border: 'border-amber-700/30',
    background: 'bg-gradient-to-br from-amber-500/15 via-stone-900 to-stone-950',
    eyebrow: 'text-amber-300',
    accent: 'text-amber-200',
  },
  {
    border: 'border-sky-700/30',
    background: 'bg-gradient-to-br from-sky-500/15 via-stone-900 to-stone-950',
    eyebrow: 'text-sky-300',
    accent: 'text-sky-200',
  },
  {
    border: 'border-emerald-700/30',
    background: 'bg-gradient-to-br from-emerald-500/15 via-stone-900 to-stone-950',
    eyebrow: 'text-emerald-300',
    accent: 'text-emerald-200',
  },
  {
    border: 'border-rose-700/30',
    background: 'bg-gradient-to-br from-rose-500/15 via-stone-900 to-stone-950',
    eyebrow: 'text-rose-300',
    accent: 'text-rose-200',
  },
] as const

export function NearbyCollectionCard({ collection, index = 0 }: Props) {
  const theme = COLLECTION_CARD_THEMES[index % COLLECTION_CARD_THEMES.length]

  return (
    <Link
      href={collection.href}
      className={`group flex h-full flex-col rounded-3xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:border-stone-600 hover:shadow-[0_18px_60px_rgb(0,0,0,0.25)] ${theme.border} ${theme.background}`}
    >
      <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${theme.eyebrow}`}>
        {collection.eyebrow}
      </p>
      <h3 className="mt-3 text-xl font-semibold text-stone-100">{collection.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-stone-400">{collection.description}</p>

      {collection.filterChips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {collection.filterChips.map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-stone-700/70 bg-stone-950/70 px-3 py-1 text-[11px] font-medium text-stone-300"
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-6 text-sm">
        <span className={`font-medium ${theme.accent}`}>Open collection</span>
        <span className="text-stone-500 transition-transform duration-300 group-hover:translate-x-1">
          &rarr;
        </span>
      </div>
    </Link>
  )
}
