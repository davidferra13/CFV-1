import { requireChef } from '@/lib/auth/get-user'
import { getAllSubstitutions } from '@/lib/ingredients/substitution-actions'
import { SubstitutionLookup } from '@/components/culinary/substitution-lookup'
import { SubstitutionManager } from '@/components/culinary/substitution-manager'
import Link from 'next/link'

export default async function SubstitutionsPage() {
  await requireChef()
  const { system, personal } = await getAllSubstitutions()

  // Group system substitutions by original ingredient
  const grouped: Record<string, typeof system> = {}
  for (const sub of system) {
    if (!grouped[sub.original]) grouped[sub.original] = []
    grouped[sub.original].push(sub)
  }

  const sortedOriginals = Object.keys(grouped).sort()

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      <div>
        <Link
          href="/culinary"
          className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
        >
          ← Culinary
        </Link>
        <h1 className="text-2xl font-bold text-stone-100 mt-2">Ingredient Substitutions</h1>
        <p className="text-sm text-stone-400 mt-1">
          Quick reference for when you need to swap an ingredient mid-prep. Search by ingredient or
          browse the full list below.
        </p>
      </div>

      {/* Quick search */}
      <section>
        <h2 className="text-lg font-semibold text-stone-200 mb-3">Quick Lookup</h2>
        <SubstitutionLookup />
      </section>

      {/* Add personal substitution */}
      <section>
        <h2 className="text-lg font-semibold text-stone-200 mb-3">Your Substitutions</h2>
        <SubstitutionManager personal={personal} />
      </section>

      {/* System reference */}
      <section>
        <h2 className="text-lg font-semibold text-stone-200 mb-3">
          Standard Substitutions ({system.length})
        </h2>
        <p className="text-xs text-stone-500 mb-4">
          Curated reference list. These are always available to all chefs.
        </p>

        <div className="space-y-4">
          {sortedOriginals.map((original) => (
            <div
              key={original}
              className="rounded-lg border border-stone-700 bg-stone-800/50 overflow-hidden"
            >
              <div className="px-4 py-2 bg-stone-800">
                <h3 className="text-sm font-medium text-stone-200">{original}</h3>
              </div>
              <div className="divide-y divide-stone-700/50">
                {grouped[original].map((sub, i) => (
                  <div key={i} className="px-4 py-2.5 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-stone-300">{sub.substitute}</span>
                      <span className="text-xs text-stone-500 font-mono bg-stone-900 px-1.5 py-0.5 rounded">
                        {sub.ratio}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400">{sub.notes}</p>
                    {sub.dietary_safe_for.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {sub.dietary_safe_for.map((diet) => (
                          <span
                            key={diet}
                            className="text-xxs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400"
                          >
                            {diet}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
