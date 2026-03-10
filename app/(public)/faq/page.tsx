import type { Metadata } from 'next'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { LAUNCH_MODE, PRIMARY_SIGNUP_HREF, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

const FAQ_ITEMS = [
  {
    question: 'Who is ChefFlow built for?',
    answer:
      'ChefFlow is built for private chefs and chef-led teams managing inquiries, events, menu workflows, and payments.',
  },
  {
    question: 'Can I start with a small operation and grow later?',
    answer:
      'Yes. Most teams start with one repeatable workflow, then expand automations and reporting as volume increases.',
  },
  {
    question: 'Does ChefFlow handle payments directly?',
    answer:
      'Payments are processed through Stripe. ChefFlow coordinates the workflow and status visibility around those transactions.',
  },
  {
    question: 'How long does implementation usually take?',
    answer:
      'Most chefs can stand up a usable baseline quickly when they standardize one inquiry-to-event lifecycle first.',
  },
  {
    question: 'Can I migrate from spreadsheets or a generic CRM?',
    answer:
      'Yes. Migrate active opportunities and upcoming events first, then retire duplicate trackers after your first clean cycle.',
  },
  {
    question: 'Where can I review security and trust information?',
    answer:
      'The Trust Center summarizes security baseline, data handling, and support expectations in one place.',
  },
]

export const metadata: Metadata = {
  title: 'ChefFlow FAQ | Private Chef Software Questions',
  description:
    'Answers to common questions about ChefFlow pricing, implementation, migration, and operations for private chefs.',
  openGraph: {
    title: 'ChefFlow FAQ',
    description:
      'Common questions and practical answers for private chef operators evaluating ChefFlow.',
    url: `${BASE_URL}/faq`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  alternates: {
    canonical: `${BASE_URL}/faq`,
  },
}

export default function FaqPage() {
  const isBeta = LAUNCH_MODE === 'beta'
  const faqStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <div>
      <PublicPageView pageName="faq" properties={{ section: 'public_growth' }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

      <section className="relative overflow-hidden border-b border-stone-200 dark:border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[700px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[80px] hidden dark:block" />
        <div className="relative mx-auto w-full max-w-5xl px-4 py-16 text-center sm:px-6 md:py-24 lg:px-8">
          <p className="inline-flex rounded-full border border-brand-200 dark:border-brand-700 bg-white dark:bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-700 dark:text-brand-300">
            FAQ
          </p>
          <h1 className="mt-5 text-4xl font-display tracking-tight text-stone-900 dark:text-stone-100 md:text-6xl">
            Common questions from private chef operators.
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-stone-600 dark:text-stone-300 md:text-lg">
            Straight answers on setup, workflow fit, migration, and security expectations.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
        <div className="space-y-3">
          {FAQ_ITEMS.map((faq) => (
            <details
              key={faq.question}
              className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white/80 dark:bg-stone-900/80 p-4"
            >
              <summary className="cursor-pointer list-none pr-4 text-sm font-semibold text-stone-900 dark:text-stone-100">
                {faq.question}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-y border-stone-200 dark:border-stone-700/50 bg-stone-50/40 dark:bg-stone-900/40">
        <div className="mx-auto w-full max-w-5xl px-4 py-14 text-center sm:px-6 md:py-20 lg:px-8">
          <h2 className="text-3xl font-display tracking-tight text-stone-900 dark:text-stone-100 md:text-4xl">
            Ready to test the workflow in your own operation?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-600 dark:text-stone-300">
            Start with one lifecycle and measure your response times, handoffs, and margin clarity.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedLink
              href="/trust"
              analyticsName="faq_trust_link"
              analyticsProps={{ section: 'faq_bottom' }}
              className="inline-flex items-center rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 px-7 py-3 text-sm font-semibold text-stone-700 dark:text-stone-200 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              Review trust center
            </TrackedLink>
            <TrackedLink
              href={PRIMARY_SIGNUP_HREF}
              analyticsName="faq_primary_cta"
              analyticsProps={{ launch_mode: LAUNCH_MODE, section: 'faq_bottom' }}
              className="inline-flex items-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {isBeta ? 'Join beta waitlist' : PRIMARY_SIGNUP_LABEL}
            </TrackedLink>
          </div>
        </div>
      </section>
    </div>
  )
}
