import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import { requireChef } from '@/lib/auth/get-user'
import { getSchedulingRules } from '@/lib/availability/rules-actions'
import { getBookingSettings, type BookingSettings } from '@/lib/booking/booking-settings-actions'
import { SettingsCategory } from '@/components/settings/settings-category'
import { SchedulingRulesForm } from '@/components/settings/scheduling-rules-form'
import { BookingPageSettings } from '@/components/settings/booking-page-settings'

export const metadata: Metadata = { title: 'Settings - Scheduling' }

export default async function SchedulingSettingsPage() {
  await requireChef()
  const [schedulingRules, bookingSettings] = await Promise.all([
    getSchedulingRules().catch(() => null),
    getBookingSettings().catch(() => null),
  ])

  return (
    <div>
      {/* Mobile back */}
      <div className="mb-4 md:hidden">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-stone-400 hover:text-stone-200"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Settings</span>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-100 sm:text-3xl">Scheduling</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-300">
          Availability rules and booking page configuration.
        </p>
      </div>

      <div className="space-y-6">
        <SettingsCategory
          title="Availability Rules"
          description="Set your default availability and blackout dates."
          icon="CalendarClock"
          primary
          tone="sky"
          defaultOpen={true}
        >
          <SchedulingRulesForm initialRules={schedulingRules} />
        </SettingsCategory>

        <SettingsCategory
          title="Booking Page"
          description="Configure your public booking page and pricing."
          icon="CalendarCheck"
          primary
          tone="sky"
          defaultOpen={true}
        >
          <BookingPageSettings
            initialSettings={
              bookingSettings ??
              ({
                booking_enabled: false,
                booking_slug: null,
                booking_headline: null,
                booking_bio_short: null,
                booking_min_notice_days: 7,
                booking_model: 'inquiry_first',
                booking_base_price_cents: null,
                booking_pricing_type: 'flat_rate',
                booking_deposit_type: 'percent',
                booking_deposit_percent: null,
                booking_deposit_fixed_cents: null,
              } as BookingSettings)
            }
          />
        </SettingsCategory>
      </div>
    </div>
  )
}
