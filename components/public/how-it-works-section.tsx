// How ChefFlow Actually Works — Transparency Section
// Addresses the "is this just AI?" confusion.
// Shows visitors that ChefFlow is a hand-coded platform, not AI-generated.

import { Code2, Database, Bot, Shield } from 'lucide-react'

const PILLARS = [
  {
    icon: Code2,
    title: 'Hand-Built Platform',
    description:
      'Every page, form, and workflow in ChefFlow was written by hand — by a private chef who has been in the industry for 15 years. This is real software, not AI-generated templates.',
  },
  {
    icon: Database,
    title: 'Your Own Database',
    description:
      'Your clients, events, recipes, and financials live in a real, encrypted database. Structured, backed up, and completely separate from any AI system.',
  },
  {
    icon: Bot,
    title: 'AI Assistant (Optional)',
    description:
      'Remy is an optional AI helper that runs on your own hardware. It drafts emails, suggests menus, and spots patterns — but the platform works perfectly without it.',
  },
  {
    icon: Shield,
    title: 'Private by Architecture',
    description:
      'Your client data never touches external AI servers. Conversations stay in your browser. No cloud LLMs, no data mining, no exceptions. Private by design.',
  },
]

export function HowItWorksSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 md:py-20 lg:px-8">
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-display tracking-tight text-stone-100 md:text-4xl">
          How it actually works.
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-stone-400">
          ChefFlow is not an AI wrapper. It&apos;s a fully coded platform with an optional AI
          assistant. Here&apos;s the difference.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((pillar) => {
          const Icon = pillar.icon
          return (
            <div
              key={pillar.title}
              className="rounded-xl border border-stone-700 bg-surface p-6 shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5"
            >
              <div className="mb-4 inline-flex rounded-lg bg-brand-950 p-2.5 text-brand-400">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold text-stone-100">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">{pillar.description}</p>
            </div>
          )
        })}
      </div>

      {/* Simplified architecture diagram */}
      <div className="mt-12 rounded-2xl border border-stone-700 bg-stone-800 p-6 md:p-8">
        <h3 className="mb-6 text-center text-sm font-semibold uppercase tracking-wider text-stone-500">
          Under the hood
        </h3>
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:gap-0">
          {/* Browser */}
          <div className="flex flex-col items-center rounded-xl border border-stone-700 bg-surface px-6 py-4 shadow-sm">
            <span className="text-2xl">🖥️</span>
            <span className="mt-1 text-xs font-semibold text-stone-300">Your Browser</span>
            <span className="text-[10px] text-stone-400">Forms, dashboard, calendar</span>
          </div>

          {/* Arrow */}
          <div className="hidden h-0.5 w-12 bg-stone-300 md:block" />
          <div className="h-6 w-0.5 bg-stone-300 md:hidden" />

          {/* App */}
          <div className="flex flex-col items-center rounded-xl border-2 border-brand-600 bg-brand-950 px-6 py-4 shadow-sm">
            <span className="text-2xl">⚙️</span>
            <span className="mt-1 text-xs font-semibold text-brand-300">ChefFlow App</span>
            <span className="text-[10px] text-brand-600">Hand-coded logic & workflows</span>
          </div>

          {/* Arrow */}
          <div className="hidden h-0.5 w-12 bg-stone-300 md:block" />
          <div className="h-6 w-0.5 bg-stone-300 md:hidden" />

          {/* Database */}
          <div className="flex flex-col items-center rounded-xl border border-stone-700 bg-surface px-6 py-4 shadow-sm">
            <span className="text-2xl">🗄️</span>
            <span className="mt-1 text-xs font-semibold text-stone-300">Your Database</span>
            <span className="text-[10px] text-stone-400">Encrypted, backed up, yours</span>
          </div>

          {/* Remy branch */}
          <div className="relative ml-0 md:ml-4">
            <div className="hidden h-0.5 w-8 bg-stone-700 md:block" />
            <div className="flex flex-col items-center rounded-xl border border-dashed border-stone-600 bg-stone-900/80 px-5 py-3">
              <span className="text-lg">🤖</span>
              <span className="mt-0.5 text-[10px] font-semibold text-stone-500">Remy AI</span>
              <span className="text-[9px] text-stone-400">Optional · Local only</span>
            </div>
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-stone-500">
          The app is the platform. Remy is an optional assistant that runs on your hardware. Your
          data flows through hand-coded logic — not through AI.
        </p>
      </div>
    </section>
  )
}
