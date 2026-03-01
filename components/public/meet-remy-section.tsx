import Image from 'next/image'
import { ShieldCheck } from 'lucide-react'

const CAPABILITIES = [
  {
    image: '/images/remy/remy-pondering.png',
    title: 'Drafts Your Emails',
    description:
      "Tell Remy about an event and he'll draft thank-you notes, follow-ups, and referral requests. You review — he sends nothing without your say.",
  },
  {
    image: '/images/remy/remy-aha.png',
    title: 'Analyzes Your Margins',
    description:
      "Ask about an event's profitability and Remy pulls the numbers — food cost %, revenue, expenses — no spreadsheet needed.",
  },
  {
    image: '/images/remy/remy-giddy-surprise.png',
    title: 'Tracks Client Preferences',
    description:
      'Remy remembers every dietary restriction, allergy, and preference across your entire client base. Ask him before any event.',
  },
  {
    image: '/images/remy/remy-whisk-1.png',
    title: 'Searches Your Recipe Book',
    description:
      'Remy searches your own recipes — by ingredient, by cuisine, by event type. He never generates recipes. Your IP, your cookbook.',
  },
]

export function MeetRemySection() {
  return (
    <section className="relative overflow-hidden border-y border-stone-700/50">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-900/30 via-transparent to-brand-800/15" />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
        {/* Hero split: mascot + intro */}
        <div className="flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-12 lg:gap-16">
          {/* Mascot image */}
          <div className="flex-shrink-0">
            <Image
              src="/images/remy/remy-mascot.png"
              alt="Remy, ChefFlow's AI concierge — a warm, round mascot in an oversized chef hat, waving a heart flag"
              width={400}
              height={394}
              className="h-auto w-[200px] animate-mascot-bob md:w-[300px] lg:w-[400px]"
            />
          </div>

          {/* Intro text */}
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-display tracking-tight text-stone-100 md:text-4xl lg:text-5xl">
              Meet Remy.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-stone-300 md:mx-0 md:text-lg">
              Your AI concierge — named after the rat from Ratatouille who proved anyone can cook. A
              40-year kitchen veteran who lives inside ChefFlow to handle the business side so you
              can focus on the craft.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-brand-700/50 bg-brand-950/50 px-4 py-2 text-xs font-medium text-brand-300">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-400" />
              AI assists, you decide — nothing happens without your approval.
            </div>
          </div>
        </div>

        {/* Capability cards */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 md:mt-16">
          {CAPABILITIES.map((cap) => (
            <article
              key={cap.title}
              className="rounded-xl border border-stone-700 bg-stone-900 p-5 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
            >
              <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-brand-50/10">
                <Image
                  src={cap.image}
                  alt={cap.title}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-lg object-contain"
                />
              </div>
              <h3 className="text-base font-semibold text-stone-100">{cap.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-400">{cap.description}</p>
            </article>
          ))}
        </div>

        {/* CTA */}
        <p className="mt-10 text-center text-sm font-medium text-brand-400">
          Try talking to Remy &rarr;
        </p>
      </div>
    </section>
  )
}
