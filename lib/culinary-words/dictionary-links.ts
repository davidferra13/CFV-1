import { normalizeCulinaryTerm } from '@/lib/culinary-dictionary/normalization'
import { SEEDED_DICTIONARY_TERMS } from '@/lib/culinary-dictionary/seed'

type DictionaryWordLink = {
  canonicalName: string
  href: string
}

const CANONICAL_DICTIONARY_TERMS = new Map(
  SEEDED_DICTIONARY_TERMS.map((term) => [normalizeCulinaryTerm(term.canonicalName), term])
)

export function getCulinaryWordDictionaryLink(word: string): DictionaryWordLink | null {
  const term = CANONICAL_DICTIONARY_TERMS.get(normalizeCulinaryTerm(word))
  if (!term) return null

  return {
    canonicalName: term.canonicalName,
    href: `/culinary/dictionary?q=${encodeURIComponent(term.canonicalName)}`,
  }
}
