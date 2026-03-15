// Chef Directory Hero - consumer-first food discovery framing

export function ChefHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900">
      {/* Subtle warm accent overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-600/10 via-transparent to-brand-800/10" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-brand-500/8 blur-3xl" />

      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center sm:px-6 md:py-28 lg:px-8">
        <p className="mb-4 rounded-full border border-brand-400/30 bg-brand-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-300">
          Food Directory
        </p>

        <h1 className="max-w-3xl text-4xl font-display tracking-tight text-white md:text-5xl lg:text-6xl">
          Discover chefs and food near you.
        </h1>

        <p className="mt-6 max-w-xl text-base leading-relaxed text-stone-300 md:text-lg">
          Browse by cuisine, service type, or location. Connect directly with providers.
        </p>

        <div className="mt-8 flex items-center gap-6 text-sm text-stone-300">
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Free to browse
          </span>
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            No middleman
          </span>
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 text-brand-400" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Connect directly
          </span>
        </div>
      </div>
    </section>
  )
}
