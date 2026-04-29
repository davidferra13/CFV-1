import { Button } from '@/components/ui/button'
import { addChefDictionaryAliasForm } from '@/lib/culinary-dictionary/actions'
import type { CulinaryDictionaryTerm } from '@/lib/culinary-dictionary/types'
import { DictionaryTermCard } from './dictionary-term-card'

type ChefDictionaryTermCardProps = {
  term: CulinaryDictionaryTerm
}

export function ChefDictionaryTermCard({ term }: ChefDictionaryTermCardProps) {
  return (
    <DictionaryTermCard term={term} mode="chef">
      <form action={addChefDictionaryAliasForm} className="mt-4 border-t border-stone-800 pt-4">
        <input type="hidden" name="termId" value={term.id} />
        <input type="hidden" name="aliasKind" value="synonym" />
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            name="alias"
            placeholder={`Add chef alias for ${term.canonicalName}`}
            className="min-h-[44px] flex-1 rounded-lg border border-stone-700 bg-stone-950 px-3 text-sm text-stone-100 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
          />
          <Button type="submit" variant="secondary" size="sm">
            Add Alias
          </Button>
        </div>
      </form>
    </DictionaryTermCard>
  )
}
