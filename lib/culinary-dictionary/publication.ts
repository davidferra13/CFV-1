import type { CulinaryDictionaryTerm } from './types'

export function isDictionaryTermPubliclyVisible(term: Pick<CulinaryDictionaryTerm, 'publicSafe'>) {
  return term.publicSafe === true
}

export function filterPublicDictionaryTerms<T extends Pick<CulinaryDictionaryTerm, 'publicSafe'>>(
  terms: T[]
): T[] {
  return terms.filter(isDictionaryTermPubliclyVisible)
}

export function canShowDictionaryAliasPublicly(alias: { needsReview?: boolean }): boolean {
  return alias.needsReview !== true
}
