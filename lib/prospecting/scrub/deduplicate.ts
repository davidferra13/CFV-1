import { normalizeCity, isSimilarName } from '../fuzzy-match'

type ProspectDedupCandidate = {
  name: string
  city?: string | null
}

export function mapExistingProspects(existing: any[] | null | undefined) {
  return (existing ?? []).map((e: any) => ({
    name: e.name ?? '',
    city: e.city ?? '',
  }))
}

export function filterNewProspects<T extends ProspectDedupCandidate>(
  prospects: T[],
  existingList: ProspectDedupCandidate[]
) {
  return prospects.filter((p) => {
    return !existingList.some(
      (e: any) =>
        isSimilarName(p.name, e.name) &&
        (normalizeCity(p.city ?? '') === normalizeCity(e.city ?? '') ||
          !(p.city ?? '') ||
          !(e.city ?? ''))
    )
  })
}
