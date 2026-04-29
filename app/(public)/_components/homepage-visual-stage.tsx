import Image from 'next/image'
import { TrackedLink } from '@/components/analytics/tracked-link'
import {
  PUBLIC_PRIMARY_CONSUMER_CTA,
  PUBLIC_SECONDARY_CONSUMER_CTA,
} from '@/lib/public/public-navigation-config'
import { HomepageLiveSignal } from './homepage-live-signal'
import { HomepageSearch } from './homepage-search'

const LIVE_SIGNALS = [
  'Choose the occasion, compare real profiles, then request the fit.',
  'One booking brief can carry location, service type, guest count, and timing.',
  'Browse first when you want options. Start a request when you are ready for chefs to reply.',
  'Book directly when the chef, date, pricing, and written terms are clear.',
] as const

const FLOW_STEPS = ['Search', 'Compare', 'Request', 'Confirm'] as const

export function HomepageVisualStage() {
  return (
    <section className="relative min-h-[88vh] overflow-hidden">
      <Image
        src="/sandbox/home-v2/chef-window-real.jpg"
        alt="A chef prepares food behind a restaurant window while service moves around the room"
        fill
        sizes="100vw"
        priority
        className="homepage-photo-drift object-cover object-center"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,4,3,0.92)_0%,rgba(5,4,3,0.72)_44%,rgba(5,4,3,0.42)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-52 bg-[linear-gradient(0deg,rgb(8,7,6)_0%,rgba(8,7,6,0)_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-[88vh] w-full max-w-7xl flex-col justify-center px-4 pb-20 pt-24 sm:px-6 lg:px-8">
        <div className="max-w-3xl animate-fade-slide-up">
          <p className="mb-5 inline-flex rounded-full border border-brand-600/30 bg-stone-950/45 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-200 backdrop-blur">
            Find, request, and book chef-led food work
          </p>
          <h1 className="max-w-3xl font-display text-[3.25rem] font-semibold leading-[0.95] tracking-normal text-white sm:text-6xl lg:text-[5.8rem]">
            Get the chef search moving.
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-stone-200 sm:text-lg sm:leading-8">
            Start with the occasion, compare real chef profiles, and send one serious request when
            you are ready to book.
          </p>

          <div className="mt-9 max-w-2xl rounded-[1.5rem] border border-stone-700/65 bg-stone-950/72 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl sm:p-5">
            <HomepageSearch />
            <div className="mt-4 border-t border-stone-800/70 pt-4">
              <HomepageLiveSignal messages={LIVE_SIGNALS} />
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <TrackedLink
              href={PUBLIC_PRIMARY_CONSUMER_CTA.href}
              analyticsName="home_living_hero_book"
              analyticsProps={{
                section: 'living_hero',
                destination: PUBLIC_PRIMARY_CONSUMER_CTA.href,
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl gradient-accent px-7 py-3 text-sm font-semibold tracking-[-0.01em] text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
            >
              {PUBLIC_PRIMARY_CONSUMER_CTA.label}
            </TrackedLink>
            <TrackedLink
              href={PUBLIC_SECONDARY_CONSUMER_CTA.href}
              analyticsName="home_living_hero_browse"
              analyticsProps={{
                section: 'living_hero',
                destination: PUBLIC_SECONDARY_CONSUMER_CTA.href,
              }}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-stone-600/80 bg-stone-950/70 px-7 py-3 text-sm font-medium tracking-[-0.01em] text-stone-200 transition-all duration-200 hover:border-stone-500 hover:bg-stone-900 hover:text-stone-100"
            >
              {PUBLIC_SECONDARY_CONSUMER_CTA.label}
            </TrackedLink>
          </div>
        </div>

        <div className="mt-14 grid max-w-2xl grid-cols-4 gap-2 rounded-2xl border border-stone-800/70 bg-stone-950/55 p-2 backdrop-blur md:max-w-3xl">
          {FLOW_STEPS.map((step, index) => (
            <div
              key={step}
              className="relative overflow-hidden rounded-xl border border-stone-800/70 bg-stone-900/55 px-3 py-3 text-center"
            >
              <div
                className="homepage-flow-pulse absolute inset-x-0 top-0 h-px bg-brand-300/70"
                style={{ animationDelay: `${index * 0.6}s` }}
              />
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                0{index + 1}
              </p>
              <p className="mt-1 text-xs font-semibold text-stone-100 sm:text-sm">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
