import { Layers, Mail, TrendingUp, Heart, BookOpen } from '@/components/ui/icons'

const FEATURE_HIGHLIGHTS = [
  {
    icon: Mail,
    title: 'Email drafts',
    description:
      'Thank-you notes, follow-ups, and referral asks. Remy drafts them, you review before sending.',
  },
  {
    icon: TrendingUp,
    title: 'Profit breakdown',
    description:
      'Ask "how did the Johnson dinner do?" and get food cost, revenue, and what you actually kept.',
  },
  {
    icon: Heart,
    title: 'Client memory',
    description:
      'Remy knows your clients. Allergies, past menus, preferences. Ask before you plan.',
  },
  {
    icon: BookOpen,
    title: 'Recipe search',
    description:
      'Find your own recipes by ingredient, cuisine, or event type. Your recipe book, searchable.',
  },
]

export function MeetRemySection() {
  return (
    <section className="relative overflow-hidden border-y border-stone-700/50">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-900/30 via-transparent to-brand-800/15" />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-950 text-brand-400">
            <Layers className="h-6 w-6" />
          </div>
          <h2 className="text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
            Your admin assistant, built in
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-300">
            Remy handles the admin side so you can focus on cooking. You review everything before it
            goes out. Nothing sends without your approval.
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
          {FEATURE_HIGHLIGHTS.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="rounded-xl border border-stone-700 bg-stone-900 p-5"
              >
                <div className="mb-2 inline-flex rounded-lg bg-brand-950 p-2 text-brand-400">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-stone-100">{feature.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-400">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
