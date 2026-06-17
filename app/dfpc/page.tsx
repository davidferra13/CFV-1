export default function DfpcHomePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20">
      {/* Hero */}
      <section className="py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-stone-50 sm:text-5xl">
          Private Chef Experiences
          <br />
          <span className="text-amber-300/90">Across New England</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-400">
          Personal dinners, vacation dining, and private events crafted by Chef David Ferra. From
          the coast of Maine to the hills of Vermont.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <span className="rounded-lg bg-amber-700/80 px-6 py-3 text-sm font-medium text-white">
            Book a Dinner
          </span>
          <span className="rounded-lg border border-stone-700 px-6 py-3 text-sm font-medium text-stone-300">
            Learn More
          </span>
        </div>
      </section>

      {/* Proof of concept banner */}
      <section className="mt-12 rounded-xl border border-emerald-800/50 bg-emerald-950/30 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
          Multi-Domain POC
        </p>
        <p className="mt-2 text-lg text-stone-300">
          This page is served from the ChefFlow codebase.
        </p>
        <p className="mt-1 text-sm text-stone-500">
          Same Next.js app, same database, same deploy. Different domain, different layout,
          different audience.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-4 text-center text-sm">
          <div className="rounded-lg bg-stone-900/60 p-4">
            <p className="text-emerald-400">dfprivatechef.com</p>
            <p className="mt-1 text-stone-500">Visitors see this</p>
          </div>
          <div className="rounded-lg bg-stone-900/60 p-4">
            <p className="text-emerald-400">app.cheflowhq.com</p>
            <p className="mt-1 text-stone-500">David sees ops</p>
          </div>
          <div className="rounded-lg bg-stone-900/60 p-4">
            <p className="text-emerald-400">One codebase</p>
            <p className="mt-1 text-stone-500">Zero duplication</p>
          </div>
        </div>
      </section>
    </div>
  )
}
