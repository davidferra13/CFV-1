import type { Metadata } from 'next'
import Link from 'next/link'
import { buildMarketingMetadata } from '@/lib/site/public-site'
import {
  PUBLIC_PRIMARY_CONSUMER_CTA,
  PUBLIC_SECONDARY_CONSUMER_CTA,
} from '@/lib/public/public-surface-config'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Cannabis Dining | Private Cannabis-Paired Dinners | ChefFlow',
  description:
    'Discover private chefs who specialize in cannabis-paired and cannabis-infused dining experiences. Curated, intimate, and professionally executed.',
  path: '/cannabis/public',
  imagePath: '/social/chefflow-home.png',
  imageAlt: 'Cannabis Dining on ChefFlow',
})

const DINING_FORMATS = [
  { label: 'Infused tasting menu', detail: 'Multi-course, each course intentionally dosed' },
  { label: 'Pairing dinner', detail: 'Cannabis alongside traditional courses' },
  { label: 'Microdose brunch', detail: 'Light social format, low-dose throughout' },
  { label: 'Private supper club', detail: 'Small group, chef-curated evening' },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Find a chef',
    body: 'Browse private chef profiles. Look for chefs who list cannabis dining, private infused dinners, or specialty pairing menus in their services.',
  },
  {
    step: '02',
    title: 'Discuss your event',
    body: 'Submit an inquiry. The chef will follow up to discuss the menu format, dosing approach, guest count, and logistics for your occasion.',
  },
  {
    step: '03',
    title: 'Experience the dinner',
    body: 'Your chef arrives, sets up, and delivers a professionally executed private dining experience at your location.',
  },
]

export default function CannabisPublicPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      {/* Hero */}
      <div className="mb-10 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#c4956a]/70">
          Private Dining
        </p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Cannabis Dining
        </h1>
        <p className="mx-auto max-w-prose text-base text-slate-400">
          A refined category of private dining where experienced chefs pair or infuse seasonal menus
          with cannabis. Designed for intimate gatherings, curated tastings, and elevated at-home
          experiences.
        </p>
        {/* Format chips — quick visual shorthand for what this covers */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {DINING_FORMATS.map(({ label }) => (
            <span
              key={label}
              className="inline-flex items-center rounded-full border border-[#5c3520]/50 bg-[#1e0f08]/60 px-3 py-1 text-xs font-medium text-[#c4956a]/80"
            >
              {label}
            </span>
          ))}
        </div>
        {/* CTA above the fold — visible before any card */}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`${PUBLIC_SECONDARY_CONSUMER_CTA.href}?serviceType=private_dinner`}
            className="inline-flex items-center rounded-full bg-[#c4956a] px-6 py-2.5 text-sm font-semibold text-[#0d0704] transition-colors hover:bg-[#d4a57a]"
          >
            Browse Private Chefs
          </Link>
          <Link
            href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
            className="inline-flex items-center rounded-full border border-[#5c3520]/60 bg-[#1e0f08]/60 px-6 py-2.5 text-sm font-medium text-[#c4956a] transition-colors hover:border-[#8b5e3c]/70 hover:bg-[#2a1610]/80"
          >
            {PUBLIC_PRIMARY_CONSUMER_CTA.label}
          </Link>
        </div>
        {/* Warm separator */}
        <div className="mx-auto mt-10 h-px w-16 bg-gradient-to-r from-transparent via-[#c4956a]/40 to-transparent" />
      </div>

      {/* What it is */}
      <div className="mb-6 rounded-xl border border-slate-700/50 bg-slate-800/40 p-6 sm:p-8">
        <h2 className="mb-4 text-lg font-semibold text-white">What is cannabis dining?</h2>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          Cannabis dining brings together culinary craft and intentional cannabis use in a private,
          chef-led setting. Each chef approaches it differently: some offer infused courses, others
          offer pairing menus where cannabis accompanies traditional dishes, and others design
          microdose tasting experiences.
        </p>
        <p className="text-sm leading-relaxed text-slate-400">
          These are not public restaurant experiences. They are private, pre-arranged, and handled
          by chefs who understand both the culinary and wellness dimensions of the format.
        </p>
        {/* Format detail list */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {DINING_FORMATS.map(({ label, detail }) => (
            <div
              key={label}
              className="rounded-lg border border-slate-700/40 bg-slate-900/40 px-4 py-3"
            >
              <p className="mb-0.5 text-xs font-semibold text-white">{label}</p>
              <p className="text-xs leading-relaxed text-slate-500">{detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mb-6 rounded-xl border border-slate-700/50 bg-slate-800/40 p-6 sm:p-8">
        <h2 className="mb-6 text-lg font-semibold text-white">How it works</h2>
        <ol className="space-y-5">
          {HOW_IT_WORKS.map(({ step, title, body }) => (
            <li key={step} className="flex gap-4">
              <span className="mt-0.5 shrink-0 font-mono text-xs font-semibold text-[#c4956a]/60">
                {step}
              </span>
              <div>
                <p className="mb-1 text-sm font-semibold text-white">{title}</p>
                <p className="text-sm leading-relaxed text-slate-400">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* FAQ */}
      <div className="mb-6 rounded-xl border border-slate-700/50 bg-slate-800/40 p-6 sm:p-8">
        <h2 className="mb-5 text-lg font-semibold text-white">Common questions</h2>
        <dl className="space-y-5">
          <div>
            <dt className="mb-1 text-sm font-semibold text-white">Is this legal?</dt>
            <dd className="text-sm leading-relaxed text-slate-400">
              Cannabis dining is legal in states where recreational or medicinal cannabis is
              permitted for adults. You are responsible for confirming the laws in your state and
              locality before booking. ChefFlow does not provide legal advice.
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-sm font-semibold text-white">How is dosing managed?</dt>
            <dd className="text-sm leading-relaxed text-slate-400">
              Your chef will discuss dosing preferences, tolerance levels, and intended experience
              before the event. A responsible chef always starts low, communicates clearly, and
              adjusts to your group's comfort and experience level.
            </dd>
          </div>
          <div>
            <dt className="mb-1 text-sm font-semibold text-white">What should I tell the chef?</dt>
            <dd className="text-sm leading-relaxed text-slate-400">
              Share your group's experience level, any dietary restrictions, the occasion you are
              celebrating, and the overall tone you want for the evening. The more context you
              provide, the better the chef can design the right experience.
            </dd>
          </div>
        </dl>
      </div>

      {/* Legal notice */}
      <p className="mb-10 rounded-lg border border-amber-700/30 bg-amber-900/10 px-5 py-4 text-xs leading-relaxed text-amber-400/80">
        Cannabis dining services are only available where permitted by applicable state and local
        law. ChefFlow does not facilitate purchases, delivery, or distribution of cannabis products.
        You are responsible for verifying legality in your jurisdiction before arranging an event.
      </p>

      {/* Bottom CTAs */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href={`${PUBLIC_SECONDARY_CONSUMER_CTA.href}?serviceType=private_dinner`}
          className="inline-flex items-center rounded-full bg-[#c4956a] px-6 py-2.5 text-sm font-semibold text-[#0d0704] transition-colors hover:bg-[#d4a57a]"
        >
          Browse Private Chefs
        </Link>
        <Link
          href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
          className="inline-flex items-center rounded-full border border-[#5c3520]/60 bg-[#1e0f08]/60 px-6 py-2.5 text-sm font-medium text-[#c4956a] transition-colors hover:border-[#8b5e3c]/70 hover:bg-[#2a1610]/80"
        >
          {PUBLIC_PRIMARY_CONSUMER_CTA.label}
        </Link>
      </div>
    </main>
  )
}
