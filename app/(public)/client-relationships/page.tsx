import type { Metadata } from 'next'
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Repeat,
  ShieldCheck,
  Users,
} from '@/components/ui/icons'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { LAUNCH_MODE, PRIMARY_SIGNUP_HREF, PRIMARY_SIGNUP_LABEL } from '@/lib/marketing/launch-mode'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'

export const metadata: Metadata = {
  title: 'Client Relationships | ChefFlow',
  description:
    'Turn imported contacts, past clients, and marketplace bookings into repeat direct business with client memory, reactivation, and chef-reviewed follow-up.',
  openGraph: {
    title: 'Client Relationships | ChefFlow',
    description:
      'Use ChefFlow to segment imported contacts, recognize repeat signals, and turn one-off dinners into stronger long-term client relationships.',
    url: `${BASE_URL}/client-relationships`,
    siteName: 'ChefFlow',
    type: 'website',
  },
  alternates: {
    canonical: `${BASE_URL}/client-relationships`,
  },
}

const OUTCOME_PATHS = [
  'Repeat household for holidays, anniversaries, and hosted dinners',
  'Annual-occasion client who comes back on a predictable rhythm',
  'Referral source who sends friends, family, or corporate hosts',
  'Dormant client worth reactivating with the right timing',
]

const SIGNALS = [
  {
    icon: Users,
    title: 'Recognize who is actually worth following up with',
    description:
      'Separate locals, hosts, families, concierges, and partner sources from one-time travelers and one-off occasion guests.',
  },
  {
    icon: ClipboardList,
    title: 'Keep the memory that makes the second booking easier',
    description:
      'Store occasion history, household preferences, allergies, pricing context, kitchen notes, and the small details that marketplaces forget.',
  },
  {
    icon: CalendarDays,
    title: 'Track timing, not just identity',
    description:
      'A good contact is not only a name and number. It is a last dinner date, a seasonal pattern, an anniversary window, and a next-reason-to-book.',
  },
  {
    icon: Repeat,
    title: 'Measure repeat value beyond the same exact person',
    description:
      'Repeat business can mean direct rebooks, referrals, annual events, household expansion, or partner-driven introductions.',
  },
]

const CONTACT_PLAYS = [
  {
    eyebrow: 'Reactivation',
    title: 'Bring dormant contacts back with context.',
    description:
      'Instead of blasting a list, ChefFlow helps chefs reach out with the last event, occasion, preferences, and likely next reason to book still attached.',
  },
  {
    eyebrow: 'Annual Reminders',
    title: 'Turn one good dinner into a yearly rhythm.',
    description:
      'Birthday dinners, anniversaries, mini-moons, holiday hosting, and summer trips should create future follow-up windows automatically.',
  },
  {
    eyebrow: 'Direct Rebook',
    title: 'Give the best contacts a cleaner path back.',
    description:
      'Move high-intent past clients toward direct inquiry, faster quoting, and chef-controlled follow-up without relying on memory or scattered inboxes.',
  },
  {
    eyebrow: 'Referral Growth',
    title: 'Turn happy clients into your referral network.',
    description:
      'Some contacts will never book monthly, but they will send friends, family, house guests, and company teams if you follow up the right way.',
  },
]

const QUALIFICATION_SPLIT = {
  strong: [
    'Local households that host more than once per year',
    'Clients who mention future holidays, travel dates, or milestones',
    'Clients who ask for personalization, saved preferences, or direct contact',
    'Referral partners, concierges, Airbnb hosts, and planners',
  ],
  weak: [
    'One-time travelers with no future event signal',
    'Large group organizers booking a single bachelorette or birthday trip',
    'Low-context contacts with no location, no timing pattern, and no direct relationship path',
    'Anyone who was price-shopping without meaningful engagement',
  ],
}

const OPERATING_LOOP = [
  {
    step: '01',
    title: 'Import the contact history you already have.',
    description:
      'Bring in CSV exports, old client lists, inquiry history, and marketplace-driven bookings so the system starts with real context instead of a blank CRM.',
  },
  {
    step: '02',
    title: 'Tag what kind of relationship each contact represents.',
    description:
      'ChefFlow should distinguish past client, partner source, referral node, one-off traveler, annual occasion, and dormant direct-booking opportunity.',
  },
  {
    step: '03',
    title: 'Surface who deserves attention now.',
    description:
      'The goal is not more activity. The goal is better timing: who should get a thank-you, a review ask, a reactivation note, or a seasonal reminder.',
  },
  {
    step: '04',
    title: 'Keep every follow-up chef-reviewed and grounded in context.',
    description:
      'Outreach should feel like remembered hospitality, not automation spam. The chef approves what gets sent and why.',
  },
]

export default function ClientRelationshipsPage() {
  const isBeta = LAUNCH_MODE === 'beta'

  return (
    <div className="overflow-x-clip">
      <PublicPageView
        pageName="client_relationships"
        properties={{ section: 'feature_page', launch_mode: LAUNCH_MODE }}
      />

      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[90px]" />
        <div className="pointer-events-none absolute right-0 top-8 h-[280px] w-[280px] rounded-full bg-brand-800/20 blur-[80px]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col px-4 pb-16 pt-20 sm:px-6 md:pb-20 md:pt-24 lg:px-8">
          <p className="inline-flex w-fit rounded-full border border-brand-700 bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Client Relationships
          </p>
          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-start">
            <div>
              <h1 className="max-w-4xl fluid-display-xl font-display tracking-tight text-stone-100">
                Imported contacts should become repeat business, not dead history.
              </h1>
              <p className="mt-6 max-w-3xl text-[1.05rem] leading-8 text-stone-300 md:text-lg">
                Most private-chef dinners are naturally one-off. ChefFlow is built to help chefs
                recognize which contacts are actually worth building around, preserve the memory
                that makes the second booking easier, and turn old lists into repeat direct revenue.
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-400">
                This is not about blasting everyone in a spreadsheet. It is about knowing who is
                local, who hosts, who refers, who books annually, and when a follow-up actually
                makes sense.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <TrackedLink
                  href={PRIMARY_SIGNUP_HREF}
                  analyticsName="client_relationships_primary_cta"
                  analyticsProps={{ section: 'hero' }}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  {PRIMARY_SIGNUP_LABEL}
                </TrackedLink>
                <TrackedLink
                  href="/contact"
                  analyticsName="client_relationships_contact"
                  analyticsProps={{ section: 'hero' }}
                  className="inline-flex items-center justify-center rounded-lg border border-stone-600 bg-stone-900 px-6 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
                >
                  Book a walkthrough
                </TrackedLink>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6 shadow-[var(--shadow-card)]">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
                What a contact can become
              </p>
              <div className="mt-5 space-y-4">
                {OUTCOME_PATHS.map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between gap-4 rounded-xl border border-stone-700 bg-stone-950/70 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-stone-200">{item}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-brand-300" />
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-xl border border-brand-700/50 bg-brand-950/40 p-4">
                <p className="text-sm leading-7 text-stone-200">
                  ChefFlow helps chefs treat contact history as future revenue infrastructure, not
                  just old names in a file.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-18 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
            What The System Needs To Know
          </p>
          <h2 className="mt-2 text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
            Contacts become useful when the business remembers why they matter.
          </h2>
          <p className="mt-4 text-[0.98rem] leading-8 text-stone-300 md:text-base">
            The real value is not the phone number. It is the pattern around the person: what they
            booked, how they found you, whether they are local, and what makes them likely to come
            back or refer someone else.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {SIGNALS.map((item) => {
            const Icon = item.icon
            return (
              <article
                key={item.title}
                className="rounded-2xl border border-stone-700 bg-stone-900/80 p-6 shadow-[var(--shadow-card)]"
              >
                <div className="inline-flex rounded-lg bg-brand-950 p-2.5 text-brand-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-stone-100">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-300">{item.description}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="border-y border-stone-700/50 bg-stone-900/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-18 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
                Contact Plays
              </p>
              <h2 className="mt-2 text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
                Use the same contact list differently depending on the signal.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-stone-400">
              A recurring client strategy is really a set of small, repeatable plays tied to context
              and timing.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {CONTACT_PLAYS.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-stone-700 bg-stone-950/80 p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
                  {item.eyebrow}
                </p>
                <h3 className="mt-3 text-xl font-semibold text-stone-100">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-300">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-18 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-brand-700/40 bg-gradient-to-br from-stone-900 via-stone-900 to-brand-950/40 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-brand-300">
              Strong Repeat Potential
            </p>
            <h2 className="mt-2 text-2xl font-display tracking-tight text-stone-100">
              Contacts worth building around
            </h2>
            <ul className="mt-5 space-y-3">
              {QUALIFICATION_SPLIT.strong.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-7 text-stone-200">
                  <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-brand-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-2xl border border-stone-700 bg-stone-950/80 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-400">
              Weak Repeat Potential
            </p>
            <h2 className="mt-2 text-2xl font-display tracking-tight text-stone-100">
              Contacts that should not dominate attention
            </h2>
            <ul className="mt-5 space-y-3">
              {QUALIFICATION_SPLIT.weak.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-7 text-stone-300">
                  <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-stone-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-2 text-center sm:px-6 md:pb-20 lg:px-8">
        <div className="rounded-3xl border border-stone-700 bg-stone-900/80 px-6 py-10 shadow-[var(--shadow-card)] md:px-10">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            <Repeat className="h-4 w-4" />
            Operating Loop
          </p>
          <h2 className="mt-3 text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
            A better contact system is really a better follow-up system.
          </h2>
          <div className="mt-8 grid gap-4 text-left md:grid-cols-2">
            {OPERATING_LOOP.map((item) => (
              <article
                key={item.step}
                className="rounded-2xl border border-stone-700 bg-stone-950/70 p-5"
              >
                <p className="text-sm font-semibold tracking-[0.1em] text-brand-300">{item.step}</p>
                <h3 className="mt-3 text-xl font-semibold text-stone-100">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-300">{item.description}</p>
              </article>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-2xl text-[0.98rem] leading-8 text-stone-300 md:text-base">
            {isBeta
              ? 'Beta teams are helping shape this around real private-chef booking behavior, not generic CRM assumptions.'
              : 'ChefFlow gives chefs a place to turn old contact history into real repeat-business strategy.'}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedLink
              href={PRIMARY_SIGNUP_HREF}
              analyticsName="client_relationships_bottom_primary_cta"
              analyticsProps={{ section: 'final_cta', launch_mode: LAUNCH_MODE }}
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              {PRIMARY_SIGNUP_LABEL}
            </TrackedLink>
            <TrackedLink
              href="/pricing"
              analyticsName="client_relationships_pricing"
              analyticsProps={{ section: 'final_cta' }}
              className="inline-flex items-center justify-center rounded-lg border border-stone-600 bg-stone-900 px-7 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
            >
              Review pricing
            </TrackedLink>
          </div>
        </div>
      </section>
    </div>
  )
}
