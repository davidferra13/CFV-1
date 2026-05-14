import { getPublicPlatformTestimonials } from '@/lib/testimonials/public-testimonials'
import { ScrollReveal } from './scroll-reveal'

type Testimonial = {
  id: string
  name: string
  occasion: string
  rating: number
  quote: string
}

/** Minimum real testimonials required before this section renders */
const MIN_TESTIMONIALS_THRESHOLD = 3

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`h-4 w-4 ${i < count ? 'text-[#e8a96b]' : 'text-stone-700'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

function TestimonialCard({
  testimonial,
  delay,
}: {
  testimonial: Testimonial
  delay: 0 | 1 | 2 | 3
}) {
  return (
    <ScrollReveal delay={delay}>
      <div className="group relative flex h-full flex-col rounded-3xl border border-[#8b4513]/25 bg-gradient-to-br from-[#8b4513]/10 to-[#3a1c08]/5 p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#e8a96b]/30 hover:shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
        <Stars count={testimonial.rating} />
        <blockquote className="mt-5 flex-1 text-base leading-relaxed text-stone-300">
          &ldquo;{testimonial.quote}&rdquo;
        </blockquote>
        <div className="mt-6 border-t border-stone-800 pt-5">
          <p className="text-sm font-semibold text-stone-100">{testimonial.name}</p>
          <p className="mt-0.5 text-xs text-stone-500">{testimonial.occasion}</p>
        </div>
      </div>
    </ScrollReveal>
  )
}

export default async function HomepageTestimonials() {
  let testimonials: Testimonial[] = []

  try {
    const dbRows = await getPublicPlatformTestimonials()
    testimonials = dbRows.slice(0, 3).map((row) => ({
      id: row.id,
      name: row.display_name || row.client_name,
      occasion: row.event_type || 'Private Event',
      rating: row.rating ?? 0,
      quote: row.content,
    }))
  } catch {
    // No data = no section. Never fall back to fake testimonials.
  }

  if (testimonials.length < MIN_TESTIMONIALS_THRESHOLD) return null

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
      <ScrollReveal>
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#e8a96b]">
            What people are saying
          </p>
          <h2 className="font-display-serif mx-auto max-w-2xl text-4xl font-bold tracking-tight text-stone-100 sm:text-5xl">
            Real meals, real reviews.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-400">
            From intimate dinners to weekly meal prep, hear from people who found the right chef for
            the job.
          </p>
        </div>
      </ScrollReveal>

      <div className="grid gap-6 md:grid-cols-3">
        {testimonials.map((t, i) => (
          <TestimonialCard key={t.id} testimonial={t} delay={(i % 3) as 0 | 1 | 2} />
        ))}
      </div>
    </section>
  )
}
