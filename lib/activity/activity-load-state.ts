export type ActivityLoadSection =
  | 'resumeItems'
  | 'chefActivity'
  | 'clientActivity'
  | 'domainCounts'
  | 'activityLogEnabled'
  | 'breadcrumbs'

export type ActivityLoadFailure = {
  section: ActivityLoadSection
  label: string
}

export type ActivityLoadResult<T> = {
  data: T
  failure: ActivityLoadFailure | null
}

export async function captureActivityLoad<T>(
  section: ActivityLoadSection,
  label: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<ActivityLoadResult<T>> {
  try {
    return { data: await fn(), failure: null }
  } catch (err) {
    console.error(`[ActivityPage] ${section} failed:`, err)
    return { data: fallback, failure: { section, label } }
  }
}

export function getFailedActivitySections(
  results: readonly ActivityLoadResult<unknown>[]
): ActivityLoadFailure[] {
  return results.flatMap((result) => (result.failure ? [result.failure] : []))
}
