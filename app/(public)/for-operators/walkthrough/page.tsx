import type { Metadata } from 'next'
import Image from 'next/image'
import { PublicPageView } from '@/components/analytics/public-page-view'
import { TrackedLink } from '@/components/analytics/tracked-link'
import {
  ArrowRight,
  BadgeDollarSign,
  ClipboardList,
  LayoutDashboard,
  Repeat,
  ShieldCheck,
  Users,
} from '@/components/ui/icons'
import { buildMarketingSignupHref } from '@/lib/marketing/signup-links'
import { SUPPORT_EMAIL, buildMarketingMetadata, getFounderProfile } from '@/lib/site/public-site'
import { OperatorWalkthroughForm } from './_components/operator-walkthrough-form'

type OperatorWalkthroughPageProps = {
  searchParams?: {
    source_cta?: string | string[]
    source_page?: string | string[]
  }
}

const WALKTHROUGH_FIT = [
  {
    icon: Users,
    title: 'Private chefs',
    detail:
      'For operators running direct dinners, repeat households, and proposal-heavy client work.',
  },
  {
    icon: ClipboardList,
    title: 'Caterers and small teams',
    detail:
      'For chef-led teams that need cleaner handoffs across inquiries, prep, staffing, and service.',
  },
  {
    icon: Repeat,
    title: 'Meal prep and recurring service',
    detail:
      'For recurring operators who need client memory, payment continuity, and repeatable weekly workflows.',
  },
] as const

const WALKTHROUGH_COVERS = [
  {
    icon: LayoutDashboard,
    title: 'Current-state workflow review',
    detail:
      'We look at the tools, spreadsheets, inbox habits, and handoff points you are already using.',
  },
  {
    icon: ClipboardList,
    title: 'Live operator workflow fit',
    detail:
      'The conversation stays on inquiries, event execution, documents, payments, and finance continuity.',
  },
  {
    icon: BadgeDollarSign,
    title: 'Pilot and migration scope',
    detail:
      'If ChefFlow looks right, the next step is a narrow pilot or access path, not a vague platform pitch.',
  },
] as const

const REQUEST_GUIDANCE = [
  'Request this walkthrough if you already run a real culinary business and want the product mapped to your live process.',
  'Request it when you need help judging fit across event handoffs, staffing, menu approvals, payment flow, or margin visibility.',
  'Skip it if you only need general support or a consumer booking question. The regular contact page is still the right lane for that.',
  'Skip it if you have not yet seen the operator proof page and only need basic product orientation first.',
] as const

const NEXT_STEP_ITEMS = [
  'The request is reviewed against the workflow details you submit.',
  'If the fit looks real, you get an email reply with either a walkthrough angle or one to two short follow-up questions.',
  'If a walkthrough is premature, the reply points you to the sharpest next step instead: proof, pricing, or a narrow pilot path.',
] as const

function getSearchParamValue(value?: string | string[]) {
  if (Array.isArray(value)) return value[0]
  return value
}

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Operator Walkthrough - Founder-Led ChefFlow Evaluation',
  description:
    'Request an operator walkthrough for private chefs, caterers, meal prep operators, and similar small culinary businesses evaluating ChefFlow.',
  path: '/for-operators/walkthrough',
  imagePath: '/social/chefflow-operators.png',
  imageAlt: 'ChefFlow operator walkthrough and evaluation flow',
  openGraphTitle: 'Request an Operator Walkthrough',
  twitterTitle: 'ChefFlow Operator Walkthrough',
})

export default async function OperatorWalkthroughPage({
  searchParams,
}: OperatorWalkthroughPageProps) {
  const founder = await getFounderProfile()
  const sourcePage = getSearchParamValue(searchParams?.source_page)?.trim()
  const sourceCta = getSearchParamValue(searchParams?.source_cta)?.trim()

  return (
    <main>
      <PublicPageView
        pageName="operator_walkthrough"
        properties={{
          section: 'operator_growth',
          ...(sourcePage ? { source_page: sourcePage } : {}),
          ...(sourceCta ? { source_cta: sourceCta } : {}),
        }}
      />

      <section className="relative overflow-hidden border-b border-stone-700/50">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-brand-700/20 blur-[90px]" />
        <div className="pointer-events-none absolute right-0 top-12 h-[280px] w-[280px] rounded-full bg-brand-800/20 blur-[75px]" />

        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:items-start">
            <div>
              <p className="inline-flex rounded-full border border-brand-700 bg-stone-900 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                Operator walkthrough
              </p>
              <h1 className="mt-5 max-w-4xl fluid-display-xl font-display tracking-[-0.04em] text-stone-100">
                Request a founder-led evaluation of your operator workflow.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-stone-300 md:text-lg">
                This route is for qualified private chefs, caterers, meal prep operators, and
                similar small culinary businesses that want ChefFlow mapped to the way the work
                actually moves today.
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-400">
                It is not a generic sales demo and it is not fake calendar-booking theater. The goal
                is to pressure-test fit against real inquiries, event handoffs, service execution,
                and finance habits before anyone commits to the next step.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <TrackedLink
                  href="#walkthrough-request"
                  analyticsName="operator_walkthrough_hero_request"
                  analyticsProps={{ section: 'hero', source_page: sourcePage ?? null }}
                  className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Request operator walkthrough
                </TrackedLink>
                <TrackedLink
                  href="/for-operators"
                  analyticsName="operator_walkthrough_hero_proof"
                  analyticsProps={{ section: 'hero' }}
                  className="inline-flex items-center justify-center rounded-xl border border-stone-600 bg-stone-900 px-6 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
                >
                  Review operator proof first
                </TrackedLink>
              </div>
            </div>

            <aside className="rounded-[1.9rem] border border-stone-700 bg-stone-900/80 p-6 shadow-[var(--shadow-card)]">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                What happens here
              </p>
              <h2 className="mt-3 text-2xl font-display tracking-[-0.04em] text-stone-100">
                A matched next step, not a generic handoff.
              </h2>
              <ul className="mt-5 space-y-3">
                {NEXT_STEP_ITEMS.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-7 text-stone-300"
                  >
                    <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-brand-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 rounded-2xl border border-stone-700/60 bg-stone-950/70 p-4">
                <p className="text-sm font-semibold text-stone-100">Direct reply path</p>
                <p className="mt-2 text-sm leading-7 text-stone-300">
                  Questions that do not need a walkthrough can still go straight to{' '}
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="text-brand-400 transition-colors hover:text-brand-300"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                  .
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-18 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
            Who this is for
          </p>
          <h2 className="mt-3 text-3xl font-display tracking-[-0.04em] text-stone-100 md:text-4xl">
            Built for operators whose work already has real operational pressure.
          </h2>
          <p className="mt-4 text-sm leading-7 text-stone-400 md:text-base">
            The walkthrough is meant for owner-operators and small teams evaluating whether one
            operator workspace can hold the work together after the lead arrives.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {WALKTHROUGH_FIT.map((item) => {
            const Icon = item.icon

            return (
              <article
                key={item.title}
                className="rounded-[1.75rem] border border-stone-700 bg-stone-900/80 p-6 shadow-[var(--shadow-card)]"
              >
                <div className="inline-flex rounded-2xl bg-brand-950/60 p-3 text-brand-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-stone-100">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-300">{item.detail}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="border-y border-stone-700/50 bg-stone-900/40">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-18 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                What the walkthrough covers
              </p>
              <h2 className="mt-3 text-3xl font-display tracking-[-0.04em] text-stone-100 md:text-4xl">
                The evaluation stays specific.
              </h2>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {WALKTHROUGH_COVERS.map((item) => {
                  const Icon = item.icon

                  return (
                    <article
                      key={item.title}
                      className="rounded-2xl border border-stone-700 bg-stone-950/80 p-5"
                    >
                      <div className="inline-flex rounded-xl bg-brand-950 p-2.5 text-brand-300">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-stone-100">{item.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-stone-300">{item.detail}</p>
                    </article>
                  )
                })}
              </div>
            </div>

            <aside className="rounded-2xl border border-stone-700 bg-stone-950/80 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                Request guidance
              </p>
              <ul className="mt-4 space-y-3">
                {REQUEST_GUIDANCE.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm leading-7 text-stone-300"
                  >
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-brand-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <section
        id="walkthrough-request"
        className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20 lg:px-8"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,1.08fr)] lg:items-start">
          <div className="space-y-6">
            <div className="rounded-[1.9rem] border border-stone-700 bg-stone-900/80 p-6 shadow-[var(--shadow-card)] sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                Founder-led review
              </p>
              <div className="mt-5 flex items-start gap-4">
                {founder.headshotUrl ? (
                  <Image
                    src={founder.headshotUrl}
                    alt={founder.fullName}
                    width={72}
                    height={72}
                    className="h-[72px] w-[72px] rounded-2xl object-cover ring-1 ring-stone-700"
                  />
                ) : (
                  <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-stone-800 text-xl font-semibold text-stone-300">
                    {founder.fullName.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold text-stone-100">{founder.fullName}</p>
                  <p className="text-xs uppercase tracking-[0.12em] text-brand-300">
                    {founder.role}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-stone-300">
                    The evaluation stays tied to real operator workflows, not a generic SDR script.
                    That is why the request asks for stack and workflow context up front.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.9rem] border border-stone-700 bg-stone-900/80 p-6 shadow-[var(--shadow-card)] sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                After submission
              </p>
              <h2 className="mt-3 text-2xl font-display tracking-[-0.04em] text-stone-100">
                Expect a qualified reply, not an instant calendar drop.
              </h2>
              <ol className="mt-5 space-y-4">
                {NEXT_STEP_ITEMS.map((item, index) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-stone-700/60 bg-stone-950/60 px-4 py-4 text-sm leading-7 text-stone-300"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
                      Step {index + 1}
                    </span>
                    <p className="mt-2">{item}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <TrackedLink
                  href="/for-operators"
                  analyticsName="operator_walkthrough_form_proof"
                  analyticsProps={{ section: 'request_sidebar' }}
                  className="inline-flex items-center justify-center rounded-lg border border-stone-600 bg-stone-900 px-5 py-3 text-sm font-semibold text-stone-200 transition-colors hover:bg-stone-800"
                >
                  See operator proof
                </TrackedLink>
                <TrackedLink
                  href={buildMarketingSignupHref({
                    sourcePage: 'operator_walkthrough',
                    sourceCta: 'sidebar_signup',
                  })}
                  analyticsName="operator_walkthrough_signup"
                  analyticsProps={{ section: 'request_sidebar' }}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Start with access instead
                </TrackedLink>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-stone-700 bg-stone-900/85 p-6 shadow-[var(--shadow-card)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-300">
              Request form
            </p>
            <h2 className="mt-3 text-3xl font-display tracking-[-0.04em] text-stone-100">
              Send the workflow context first.
            </h2>
            <p className="mt-4 text-sm leading-7 text-stone-300">
              Keep it lean, but specific enough to tell whether the next step should be a
              walkthrough, a tighter proof review, or a narrow pilot path.
            </p>
            <div className="mt-6">
              <OperatorWalkthroughForm sourcePage={sourcePage} sourceCta={sourceCta} />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
