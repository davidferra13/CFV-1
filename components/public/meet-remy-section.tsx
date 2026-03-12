import { Layers, Mail, TrendingUp, Heart, BookOpen } from '@/components/ui/icons'

const FEATURE_HIGHLIGHTS = [
  {
    icon: Mail,
    title: 'Follow-up drafts',
    description:
      'Thank-you notes, follow-ups, and referral asks. Remy drafts them so you can review instead of starting from scratch.',
  },
  {
    icon: TrendingUp,
    title: 'Event recap numbers',
    description:
      'Ask how a dinner performed and get the food cost, revenue, and what you actually kept.',
  },
  {
    icon: Heart,
    title: 'Client context',
    description:
      'Surface allergies, past menus, and household preferences before you make the next recommendation.',
  },
  {
    icon: BookOpen,
    title: 'Recipe recall',
    description:
      'Search your own recipe library by ingredient, cuisine, or event type when planning gets busy.',
  },
]

export function MeetRemySection() {
  return (
    <section className="relative overflow-hidden border-y border-stone-200 dark:border-stone-700/50">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-50/50 via-transparent to-brand-50/30 dark:from-brand-900/30 dark:via-transparent dark:to-brand-800/15" />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
            <Layers className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-display tracking-tight text-stone-900 dark:text-stone-100 md:text-4xl">
            When the busywork piles up, Remy helps.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-600 dark:text-stone-300">
            Remy helps draft, summarize, and surface the details that are easy to lose between
            service days. You stay in control of what actually goes out.
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
          {FEATURE_HIGHLIGHTS.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-700 dark:bg-stone-900"
              >
                <div className="mb-2 inline-flex rounded-lg bg-brand-50 p-2 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  {feature.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
