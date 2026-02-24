import { requireChef } from '@/lib/auth/get-user'
import { getTestimonials } from '@/lib/testimonials/actions'
import { createServerClient } from '@/lib/supabase/server'
import { TestimonialManager } from '@/components/testimonials/testimonial-manager'

export default async function TestimonialsPage() {
  const user = await requireChef()

  // Fetch testimonials and events in parallel
  const supabase = createServerClient()
  const [testimonials, { data: events }] = await Promise.all([
    getTestimonials(),
    supabase
      .from('events')
      .select('id, occasion, event_date')
      .eq('tenant_id', user.entityId!)
      .order('event_date', { ascending: false }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">Testimonials</h1>
        <p className="text-stone-500 mt-1">
          Guest reviews from your events. Approve and feature your favorites.
        </p>
      </div>

      <TestimonialManager
        initialTestimonials={testimonials as any}
        events={(events ?? []) as any}
      />
    </div>
  )
}
