import Link from 'next/link'
import { ArrowRight, MapPin, Star } from 'lucide-react'
import type { PlanningBrief } from '@/lib/hub/types'
import type { ConsumerResultCard as CardData } from '@/lib/public-consumer/discovery-actions'
import { ShortlistButton } from './shortlist-button'

export function ConsumerResultCard({
  card,
  visualMode = false,
  planningBrief,
}: {
  card: CardData
  visualMode?: boolean
  planningBrief: PlanningBrief
}) {
  const aspectClass = visualMode ? 'aspect-[3/4]' : 'aspect-[4/3]'
  const placeholder = card.type === 'chef' ? card.title.charAt(0).toUpperCase() : 'CF'

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-700 bg-stone-900 ring-1 ring-stone-800/50 transition-all duration-200 hover:-translate-y-1 hover:border-stone-600 hover:shadow-xl hover:shadow-black/30">
      <Link href={card.ctaHref} className="block">
        <div className={`relative ${aspectClass} w-full overflow-hidden bg-stone-800`}>
          {card.imageUrl ? (
            <img
              src={card.imageUrl}
              alt={card.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-stone-800">
              <span className="text-3xl font-semibold text-stone-500">{placeholder}</span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />

          <span className="absolute left-3 top-3 rounded-full bg-stone-950/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-300 backdrop-blur-sm">
            {card.eyebrow}
          </span>

          {card.type === 'chef' && (
            <span className="absolute right-3 top-3 rounded-full bg-stone-950/85 px-2.5 py-1 text-[10px] font-medium text-stone-200 backdrop-blur-sm">
              {card.isAvailable ? 'Accepting inquiries' : 'Limited availability'}
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <Link
            href={card.ctaHref}
            className="text-base font-semibold text-stone-100 transition-colors line-clamp-1 hover:text-brand-200"
          >
            {card.title}
          </Link>
          {card.subtitle && (
            <p className="mt-1 text-sm leading-relaxed text-stone-400 line-clamp-2">
              {card.subtitle}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
          {card.locationLabel && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {card.locationLabel}
            </span>
          )}
          {card.priceLabel && <span>{card.priceLabel}</span>}
          {card.rating != null && card.reviewCount != null && card.reviewCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {card.rating.toFixed(1)} ({card.reviewCount})
            </span>
          )}
        </div>

        {card.dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.dietaryTags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-stone-700 bg-stone-950 px-2 py-0.5 text-[10px] text-stone-400"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto space-y-2">
          <Link
            href={card.ctaHref}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
          >
            {card.ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <ShortlistButton card={card} planningBrief={planningBrief} />
        </div>
      </div>
    </article>
  )
}
