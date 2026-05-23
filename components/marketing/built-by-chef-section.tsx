import { ChefHat } from '@/components/ui/icons'

export function BuiltByChefSection() {
  return (
    <section className="border-t border-stone-800/40 bg-[#0c0a09]">
      <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,1.2fr)] lg:items-center">
          <div>
            <div className="inline-flex rounded-2xl bg-brand-950/80 p-3 text-brand-300">
              <ChefHat className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-stone-100 md:text-4xl">
              Built by a Chef, For Chefs
            </h2>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
              Not a tech company guessing at your workflow
            </p>
          </div>

          <div className="space-y-4 text-base leading-relaxed text-stone-300">
            <p>
              ChefFlow was born from 10+ years of managing private dining events
              with spreadsheets, text messages, and memory. Every feature exists
              because a real chef needed it.
            </p>
            <p>
              Recipes lived in one place, pricing in another, client details
              scattered across inboxes and notebooks. Nothing talked to anything
              else. The software that existed was built for restaurant dining
              rooms, not for operators who travel to a client&apos;s kitchen with a
              van full of groceries.
            </p>
            <p className="text-sm text-stone-400">
              ChefFlow is the system that should have existed from the start:
              inquiry intake, menu costing, proposals, payments, and
              post-event follow-through in one place.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
