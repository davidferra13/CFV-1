// Public Booking Page — /book/campaign/[token]
// No authentication required.
// Shows the dinner concept and a lightweight "Count me in" booking form.

import { notFound } from 'next/navigation'
import { getCampaignByToken } from '@/lib/campaigns/public-booking-actions'
import { CampaignBookingForm } from '@/components/public/campaign-booking-form'
import { format } from 'date-fns'
import { Calendar, DollarSign, Users } from '@/components/ui/icons'

type Props = { params: { token: string } }

export default async function PublicBookingPage({ params }: Props) {
  const dinner = await getCampaignByToken(params.token)

  if (!dinner) notFound()

  const dateDisplay = dinner.proposed_date
    ? format(new Date(dinner.proposed_date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')
    : null

  const timeDisplay = dinner.proposed_time ? dinner.proposed_time.slice(0, 5) : null

  const priceDisplay = dinner.price_per_person_cents
    ? `$${Math.round(dinner.price_per_person_cents / 100)} per person`
    : null

  return (
    <div className="min-h-screen bg-stone-800 flex flex-col items-center justify-start py-12 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Chef / dinner header */}
        <div className="text-center space-y-1">
          <p className="text-sm text-stone-500 font-medium">
            {dinner.chef_name}
            {dinner.chef_business_name ? ` · ${dinner.chef_business_name}` : ''}
          </p>
          <h1 className="text-2xl font-bold text-stone-200">{dinner.campaign_name}</h1>
          {dinner.occasion && dinner.occasion !== dinner.campaign_name && (
            <p className="text-sm text-stone-500">{dinner.occasion}</p>
          )}
        </div>

        {/* Key details */}
        <div className="bg-stone-900 border border-stone-700 rounded-2xl p-5 space-y-3">
          {(dateDisplay || timeDisplay) && (
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-brand-500 shrink-0" />
              <span className="text-stone-300">
                {dateDisplay}
                {timeDisplay ? ` at ${timeDisplay}` : ''}
              </span>
            </div>
          )}
          {priceDisplay && (
            <div className="flex items-center gap-3 text-sm">
              <DollarSign className="w-4 h-4 text-brand-500 shrink-0" />
              <span className="text-stone-300">{priceDisplay}</span>
            </div>
          )}
          {(dinner.guest_count_min || dinner.guest_count_max) && (
            <div className="flex items-center gap-3 text-sm">
              <Users className="w-4 h-4 text-brand-500 shrink-0" />
              <span className="text-stone-300">
                {dinner.guest_count_min && dinner.guest_count_max
                  ? `Up to ${dinner.guest_count_max} guests`
                  : dinner.guest_count_max
                    ? `Up to ${dinner.guest_count_max} guests`
                    : `${dinner.guest_count_min}+ guests`}
              </span>
            </div>
          )}

          {/* Concept description */}
          {dinner.concept_description && (
            <div className="pt-2 border-t border-stone-800">
              <p className="text-sm text-stone-400 leading-relaxed whitespace-pre-wrap">
                {dinner.concept_description}
              </p>
            </div>
          )}

          {/* Menu preview */}
          {dinner.menu_preview.length > 0 && (
            <div className="pt-2 border-t border-stone-800 space-y-1.5">
              <p className="text-xs text-stone-400 font-medium uppercase tracking-wide">Menu</p>
              {dinner.menu_preview.map((course, i) => (
                <div key={i} className="text-sm">
                  {course.course_name && (
                    <span className="text-stone-400 text-xs mr-1.5">{course.course_name}</span>
                  )}
                  <span className="text-stone-300">{course.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fully booked state */}
        {dinner.is_full ? (
          <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 text-center space-y-2">
            <p className="text-base font-semibold text-stone-300">This dinner is fully booked.</p>
            <p className="text-sm text-stone-400">
              Contact {dinner.chef_name} directly to be added to a waitlist.
            </p>
          </div>
        ) : (
          /* Booking form */
          <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-stone-200 mb-4 text-center">
              Reserve your spot
            </h2>
            <CampaignBookingForm token={params.token} dinner={dinner} />
          </div>
        )}

        {/* Branding footer */}
        <p className="text-center text-xs text-stone-300">Powered by ChefFlow</p>
      </div>
    </div>
  )
}
