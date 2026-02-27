import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cannabis Dining — What to Expect | ChefFlow',
  description: 'Education-first overview of ChefFlow cannabis dining structure.',
  robots: { index: true, follow: true },
}

export default function CannabisPublicPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 sm:py-14">
      <div
        className="rounded-2xl p-6 sm:p-8"
        style={{
          background: 'linear-gradient(135deg, #0f1a12 0%, #131f17 100%)',
          border: '1px solid rgba(90,130,98,0.24)',
        }}
      >
        <h1 className="text-3xl font-semibold text-stone-100">Cannabis Dining: What to Expect</h1>
        <p className="mt-3 text-sm text-stone-300">
          This page explains how cannabis dining is structured inside ChefFlow events. The goal is
          clarity, comfort, and informed participation.
        </p>

        <section className="mt-6 space-y-2 text-sm text-stone-300">
          <h2 className="text-lg font-semibold text-stone-100">Service Philosophy</h2>
          <p>
            Participation is voluntary. Guests can fully enjoy dinner without consuming cannabis.
          </p>
          <p>No course is infused by default.</p>
          <p>Infusion only happens after clear guest acknowledgment.</p>
        </section>

        <section className="mt-6 space-y-2 text-sm text-stone-300">
          <h2 className="text-lg font-semibold text-stone-100">Per-Course Tracking</h2>
          <p>ChefFlow records participation preferences before service.</p>
          <p>Guest intake data supports seating planning and service pacing.</p>
          <p>Pre-service notes help the chef handle comfort and accommodation requests.</p>
        </section>

        <section className="mt-6 space-y-2 text-sm text-stone-300">
          <h2 className="text-lg font-semibold text-stone-100">Education-First Structure</h2>
          <p>Guests receive what-to-expect details before arriving.</p>
          <p>Alcohol mixing is discouraged and transportation planning is emphasized.</p>
          <p>
            If a guest prefers private discussion, the chef can resolve details before the dinner
            begins.
          </p>
        </section>
      </div>
    </div>
  )
}
