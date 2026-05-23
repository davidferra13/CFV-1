import { Check, Shield } from '@/components/ui/icons'

const PROMISES = [
  'Full data export in open formats at any time',
  'No tracking pixels, no ad networks, no data selling',
  'Self-hosted option: your data stays on your hardware',
  'No vendor lock-in: leave whenever you want, take everything with you',
  'Recipes, clients, financials, and event history are yours, not ours',
] as const

export function DataPromise() {
  return (
    <section className="border-t border-stone-800/40 bg-stone-950/60">
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
          <div>
            <div className="inline-flex rounded-2xl bg-emerald-950/80 p-3 text-emerald-400">
              <Shield className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-stone-100 md:text-4xl">
              Your Data Promise
            </h2>
            <p className="mt-4 text-base leading-relaxed text-stone-400">
              Your recipes are your intellectual property. Your client
              relationships are your business. ChefFlow is a tool you use, not
              a platform that owns your work.
            </p>
          </div>

          <div className="space-y-3">
            {PROMISES.map((promise) => (
              <div
                key={promise}
                className="flex items-start gap-3 rounded-xl border border-stone-800/50 bg-stone-900/30 px-4 py-3"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span className="text-sm leading-relaxed text-stone-300">
                  {promise}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
