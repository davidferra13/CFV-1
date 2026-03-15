'use client'

import { Badge } from '@/components/ui/badge'

type DisplayTestimonial = {
  id: string
  display_name: string | null
  client_name: string
  rating: number | null
  content: string
  event_type: string | null
  is_featured: boolean
  submitted_at: string | null
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className="text-lg" style={{ color: s <= rating ? '#e8b84b' : '#4a4540' }}>
          ★
        </span>
      ))}
    </span>
  )
}

export function TestimonialCard({ testimonial }: { testimonial: DisplayTestimonial }) {
  const name = testimonial.display_name || testimonial.client_name

  return (
    <div className="bg-stone-900 rounded-xl border border-stone-700 p-5 relative">
      {testimonial.is_featured && (
        <div className="absolute top-3 right-3">
          <Badge variant="info">Featured</Badge>
        </div>
      )}

      {/* Rating */}
      {testimonial.rating && (
        <div className="mb-3">
          <StarRating rating={testimonial.rating} />
        </div>
      )}

      {/* Quote-styled review text */}
      <blockquote className="text-sm text-stone-300 leading-relaxed mb-4 italic">
        &ldquo;{testimonial.content}&rdquo;
      </blockquote>

      {/* Attribution */}
      <div className="flex items-center gap-2">
        {/* Avatar placeholder */}
        <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-xs font-bold text-stone-400">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-medium text-stone-200">{name}</p>
          {testimonial.event_type && (
            <p className="text-xs text-stone-500">{testimonial.event_type}</p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Grid display of testimonials. Usable on chef dashboard or public website.
 */
export function TestimonialGrid({
  testimonials,
  columns = 2,
}: {
  testimonials: DisplayTestimonial[]
  columns?: 2 | 3
}) {
  if (testimonials.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-stone-500 text-sm">No reviews to display yet.</p>
      </div>
    )
  }

  const gridClass =
    columns === 3
      ? 'grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      : 'grid gap-4 grid-cols-1 md:grid-cols-2'

  return (
    <div className={gridClass}>
      {testimonials.map((t) => (
        <TestimonialCard key={t.id} testimonial={t} />
      ))}
    </div>
  )
}
