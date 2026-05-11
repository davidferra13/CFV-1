import { requireClient } from '@/lib/auth/get-user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FAQAccordion } from '@/components/help/faq-accordion'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Help',
}

export default async function MyHelpPage() {
  await requireClient()

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Help</h1>
        <p className="text-stone-400 mt-1">
          Find answers to common questions about your experience.
        </p>
      </div>

      {/* FAQ Section */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-100">Frequently Asked Questions</h2>
        <FAQAccordion />
      </section>

      {/* Contact Your Chef */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Your Chef</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-400 mb-3">
            Have a question not covered here? Your chef is always happy to help.
          </p>
          <Link
            href="/my-chat"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium transition-colors"
          >
            Send a Message
          </Link>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-stone-400 list-decimal list-inside">
            <li>
              <span className="text-stone-200 font-medium">Inquiry</span> - Tell your chef about
              your event: date, guest count, vibe, and any dietary needs.
            </li>
            <li>
              <span className="text-stone-200 font-medium">Quote</span> - Your chef sends a detailed
              proposal with pricing. Review and approve when ready.
            </li>
            <li>
              <span className="text-stone-200 font-medium">Menu</span> - Collaborate on the perfect
              menu. Your preferences and allergies are already on file.
            </li>
            <li>
              <span className="text-stone-200 font-medium">Event</span> - Your chef handles
              shopping, prep, cooking, and cleanup. You enjoy the evening.
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Cancellation Policy */}
      <Card>
        <CardHeader>
          <CardTitle>Cancellation Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-stone-400 space-y-2">
            <p>
              Cancellation terms are set by your individual chef and outlined in your event contract
              or quote. In general:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Cancellations 7+ days before the event: full deposit refund (minus any purchased
                ingredients)
              </li>
              <li>Cancellations 3-7 days before: partial deposit refund at chef discretion</li>
              <li>Cancellations under 3 days: deposit is typically non-refundable</li>
            </ul>
            <p>
              Always check your specific contract for exact terms, or message your chef to discuss
              rescheduling options.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Payment & Billing */}
      <Card>
        <CardHeader>
          <CardTitle>Payment &amp; Billing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-stone-400 space-y-2">
            <p>
              <span className="text-stone-200 font-medium">Deposit:</span> A deposit (typically 50%)
              is required to confirm your event. This secures your date and allows your chef to
              begin planning and purchasing.
            </p>
            <p>
              <span className="text-stone-200 font-medium">Balance:</span> The remaining balance is
              due before or on the day of your event, depending on your chef&apos;s terms.
            </p>
            <p>
              <span className="text-stone-200 font-medium">Splitting:</span> You can split any
              payment among guests. Each person gets their own secure payment link and pays their
              portion directly. Track payment status on your event page.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
