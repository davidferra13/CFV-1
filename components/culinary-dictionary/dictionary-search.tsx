import { DICTIONARY_TERM_TYPES, type DictionaryTermType } from '@/lib/culinary-dictionary/types'

type DictionarySearchProps = {
  query: string
  termType: DictionaryTermType | 'all'
  actionPath: string
}

const TERM_TYPE_LABELS: Record<DictionaryTermType | 'all', string> = {
  all: 'All',
  ingredient: 'Ingredients',
  technique: 'Techniques',
  cut: 'Cuts',
  sauce: 'Sauces',
  texture: 'Texture',
  flavor: 'Flavor',
  dietary: 'Dietary',
  allergen: 'Allergens',
  equipment: 'Equipment',
  service: 'Service',
  composition: 'Composition',
  other: 'Other',
}

export function DictionarySearch({ query, termType, actionPath }: DictionarySearchProps) {
  return (
    <form action={actionPath} className="rounded-xl border border-stone-800 bg-stone-900/60 p-4">
      <div className="flex flex-col gap-3 lg:flex-row">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search terms, aliases, techniques, ingredients..."
          className="min-h-[44px] flex-1 rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
        />
        <select
          name="type"
          defaultValue={termType}
          className="min-h-[44px] rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 focus:border-brand-500 focus:outline-none"
        >
          <option value="all">{TERM_TYPE_LABELS.all}</option>
          {DICTIONARY_TERM_TYPES.map((type) => (
            <option key={type} value={type}>
              {TERM_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-[44px] rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Search
        </button>
      </div>
    </form>
  )
}
