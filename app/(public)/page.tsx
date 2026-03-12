import type { Metadata } from 'next'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Heart,
  MessageSquare,
  ShieldCheck,
  UsersRound,
} from '@/components/ui/icons'
import { TrackedLink } from '@/components/analytics/tracked-link'
import { LAUNCH_MODE, PRIMARY_SIGNUP_HREF } from '@/lib/marketing/launch-mode'
import {
  PLATFORM_HERO_COPY,
  PLATFORM_HERO_HEADLINE,
  PLATFORM_KEYWORDS,
  PLATFORM_META_DESCRIPTION,
  PLATFORM_NAME,
  PLATFORM_SHORT_DESCRIPTION,
} from '@/lib/marketing/platform-positioning'
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/seo/json-ld'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
const HOME_PRIMARY_CTA_LABEL = LAUNCH_MODE === 'beta' ? 'Request early access' : 'Get started'

export const metadata: Metadata = {
  title: `${PLATFORM_NAME} | Chef-Built Back Office`,
  description: PLATFORM_META_DESCRIPTION,
  keywords: PLATFORM_KEYWORDS,
  openGraph: {
    title: `${PLATFORM_NAME} | Chef-Built Back Office`,
    description: PLATFORM_SHORT_DESCRIPTION,
    url: BASE_URL,
    siteName: PLATFORM_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${PLATFORM_NAME} | Chef-Built Back Office`,
    description: PLATFORM_SHORT_DESCRIPTION,
  },
  alternates: {
    canonical: BASE_URL,
  },
}

const REALITY_PILLS = [
  'Built by a working chef',
  'Works alongside repeat clients and marketplace leads',
  'Designed for private-chef service, not restaurant service',
]

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'One place for the full inquiry story',
    description:
      'Keep lead source, menu context, addresses, dietary notes, approvals, and follow-up attached to the same client instead of scattered across texts and tabs.',
  },
  {
    icon: UsersRound,
    title: 'Client memory that gets stronger over time',
    description:
      'Allergies, kitchen setup, favorite dishes, anniversary notes, and household preferences stay easy to reach when the next dinner comes around.',
  },
  {
    icon: CreditCard,
    title: 'Cleaner handoff from booking to follow-through',
    description:
      'Quotes, event details, expenses, and post-service notes live in the same flow so you stop rebuilding the picture after every event.',
  },
]

const WORKFLOW_STEPS = [
  {
    icon: CalendarDays,
    label: 'Capture',
    title: 'Bring incoming work into one calm system.',
    description:
      'Website forms, repeat requests, referrals, marketplace leads, and loose notes can all start from the same operating baseline.',
  },
  {
    icon: BookOpen,
    label: 'Prepare',
    title: 'Carry the details forward instead of re-learning them.',
    description:
      'Menus, allergies, kitchen notes, approvals, and client preferences stay connected while the event takes shape.',
  },
  {
    icon: Heart,
    label: 'Follow Through',
    title: 'Make the next booking easier than the first.',
    description:
      'Close the loop while the event is fresh: what landed, what to suggest next, when to follow up, and what the client should never have to repeat.',
  },
]

const WHAT_CHEFFLOW_IS = [
  'A chef-built back office for inquiry, planning, and follow-through',
  'A way to keep client memory, menus, approvals, and money connected',
  'Something that works with the channels you already use to get work',
  'Built in the reality of private-chef service, not imagined from outside it',
]

const WHAT_CHEFFLOW_IS_NOT = [
  'A marketplace trying to stand between you and your clients',
  'A restaurant POS system dressed up for a different kind of business',
  'A generic CRM with food words pasted on top',
  'Software that expects you to reshape your work around the tool',
]

export default function Home() {
  const isBeta = LAUNCH_MODE === 'beta'

  return (
    <div className="overflow-x-clip">
      <OrganizationJsonLd />
      <WebSiteJsonLd />

      <section className="relative overflow-hidden border-b border-stone-200 dark:border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[440px] w-[700px] -translate-x-1/2 rounded-full bg-brand-700/15 blur-[70px] hidden dark:block" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 text-center sm:px-6 md:pb-24 md:pt-28 lg:px-8">
          <p className="mx-auto inline-flex rounded-full border border-brand-200 bg-white/85 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 shadow-sm dark:border-brand-700 dark:bg-stone-900/80 dark:text-brand-300">
            Built by a working chef
          </p>
          <h1 className="mx-auto mt-6 max-w-4xl fluid-display-xl font-display tracking-tight text-stone-900 dark:text-stone-100">
            {PLATFORM_HERO_HEADLINE}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[1.0625rem] leading-8 text-stone-600 dark:text-stone-300 md:text-lg">
            {PLATFORM_HERO_COPY}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedLink
              href="#workflow"
              analyticsName="home_hero_workflow"
              analyticsProps={{ section: 'hero' }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              See how it works
              <ArrowRight className="h-4 w-4" />
            </TrackedLink>
            <TrackedLink
              href="/contact"
              analyticsName="home_hero_contact"
              analyticsProps={{ section: 'hero' }}
              className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              Talk to David
            </TrackedLink>
          </div>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            No marketplace cut. No generic CRM. No restaurant POS pretending to fit private-chef
            work.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {REALITY_PILLS.map((pill) => (
              <span
                key={pill}
                className="inline-flex rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-xs font-medium text-stone-700 shadow-sm dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-200"
              >
                {pill}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700 dark:text-brand-300">
              Why it exists
            </p>
            <h2 className="mt-4 text-3xl font-display tracking-tight text-stone-900 dark:text-stone-100 md:text-4xl">
              The cooking was never the part missing a system.
            </h2>
            <p className="mt-5 text-base leading-8 text-stone-600 dark:text-stone-300">
              The problem was everything wrapped around it: inquiry notes, kitchen details, menu
              revisions, allergies, approvals, deposits, follow-up, and remembering what a client
              loved last time.
            </p>
            <p className="mt-4 text-base leading-8 text-stone-600 dark:text-stone-300">
              ChefFlow was built in that gap. Not as a marketplace. Not as restaurant software. Not
              as a generic business app with food words layered on top.
            </p>
          </div>

          <aside className="rounded-[28px] border border-stone-200 bg-white/85 p-6 shadow-[var(--shadow-card)] dark:border-stone-700 dark:bg-stone-900/80">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500 dark:text-stone-400">
              What chefs were stuck with
            </p>
            <ul className="mt-5 space-y-4">
              {[
                'Spreadsheets that fall apart the minute the calendar gets busy.',
                'Text threads where the important client details disappear three scrolls back.',
                'Restaurant tools that assume counter service, not private dinners and repeat households.',
                'Generic CRMs that understand pipelines but not menus, kitchens, or hospitality.',
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm leading-7 text-stone-600 dark:text-stone-300"
                >
                  <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 md:pb-20 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700 dark:text-brand-300">
            What ChefFlow holds together
          </p>
          <h2 className="mt-4 text-3xl font-display tracking-tight text-stone-900 dark:text-stone-100 md:text-4xl">
            One operating record instead of five separate memories.
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <article
                key={feature.title}
                className="rounded-xl border border-stone-200 bg-white p-6 shadow-[var(--shadow-card)] dark:border-stone-700 dark:bg-stone-900"
              >
                <div className="mb-4 inline-flex rounded-lg bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100">
                  {feature.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-stone-600 dark:text-stone-300">
                  {feature.description}
                </p>
              </article>
            )
          })}
        </div>
      </section>

      <section
        id="workflow"
        className="border-y border-stone-200 bg-stone-50/50 dark:border-stone-700/50 dark:bg-stone-900/40"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700 dark:text-brand-300">
              How it works
            </p>
            <h2 className="mt-4 text-3xl font-display tracking-tight text-stone-900 dark:text-stone-100 md:text-4xl">
              Built around how private-chef work actually moves.
            </h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {WORKFLOW_STEPS.map((step, index) => {
              const Icon = step.icon
              return (
                <article
                  key={step.title}
                  className="rounded-[28px] border border-stone-200 bg-white/90 p-6 shadow-[var(--shadow-card)] dark:border-stone-700 dark:bg-stone-900/85"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="inline-flex rounded-lg bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500 dark:text-stone-400">
                      {index + 1}. {step.label}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-stone-900 dark:text-stone-100">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-stone-300">
                    {step.description}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700 dark:text-brand-300">
            Positioning
          </p>
          <h2 className="mt-4 text-3xl font-display tracking-tight text-stone-900 dark:text-stone-100 md:text-4xl">
            ChefFlow needs to be clear about what it is and what it is not.
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-[28px] border border-stone-200 bg-white/85 p-6 shadow-[var(--shadow-card)] dark:border-stone-700 dark:bg-stone-900/80">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-700 dark:text-brand-300">
              ChefFlow is
            </h3>
            <ul className="mt-5 space-y-3">
              {WHAT_CHEFFLOW_IS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm leading-7 text-stone-600 dark:text-stone-300"
                >
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[28px] border border-stone-200 bg-white/85 p-6 shadow-[var(--shadow-card)] dark:border-stone-700 dark:bg-stone-900/80">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
              ChefFlow is not
            </h3>
            <ul className="mt-5 space-y-3">
              {WHAT_CHEFFLOW_IS_NOT.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm leading-7 text-stone-600 dark:text-stone-300"
                >
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 md:pb-20 lg:px-8">
        <div className="rounded-[32px] border border-stone-200 bg-[linear-gradient(135deg,_rgba(255,255,255,0.92)_0%,_rgba(255,246,237,0.98)_100%)] px-6 py-10 text-center shadow-[var(--shadow-card)] dark:border-stone-700 dark:bg-[linear-gradient(135deg,_rgba(28,25,23,0.96)_0%,_rgba(41,26,20,0.96)_100%)] md:px-10 md:py-14">
          {isBeta && (
            <p className="mx-auto mb-4 inline-flex rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-700 dark:border-brand-700 dark:bg-stone-900 dark:text-brand-300">
              Closed beta
            </p>
          )}
          <h2 className="mx-auto max-w-3xl fluid-display-lg font-display tracking-tight text-stone-900 dark:text-stone-100">
            {isBeta
              ? 'Built with working chefs, not imagined for them.'
              : 'If spreadsheets, texts, and memory are still running the business, start here.'}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-600 dark:text-stone-300">
            {isBeta
              ? 'ChefFlow is being shaped in active service with a small group of chefs who care deeply about how the business side should feel.'
              : 'ChefFlow is for private chefs who want the business side to feel calmer, more coherent, and more worthy of the hospitality they deliver.'}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedLink
              href={PRIMARY_SIGNUP_HREF}
              analyticsName="home_final_primary_cta"
              analyticsProps={{ section: 'final_cta' }}
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              {HOME_PRIMARY_CTA_LABEL}
            </TrackedLink>
            <TrackedLink
              href="/about"
              analyticsName="home_final_about_cta"
              analyticsProps={{ section: 'final_cta' }}
              className="inline-flex items-center justify-center rounded-lg border border-stone-300 bg-white px-7 py-3 text-sm font-semibold text-stone-900 transition-colors hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              Read the story behind it
            </TrackedLink>
          </div>
        </div>
      </section>
    </div>
  )
}
