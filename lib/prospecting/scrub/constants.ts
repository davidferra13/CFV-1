export const MAX_PROSPECTS_PER_SCRUB = 10
export const MAX_WEB_ENRICHMENTS = 5
export const MAX_APPROACH_CALLS = 5
export const MAX_EMAIL_DRAFTS = 5
export const APPROACH_COOLDOWN_MS = 3_000
export const MAX_CONSECUTIVE_FAILURES = 2
export const MAX_DEEP_CRAWL_PAGES = 3

export const PHASE_1_TIMEOUT_MS = 120_000
export const PHASE_VALIDATE_TIMEOUT_MS = 60_000
export const PHASE_2_TIMEOUT_MS = 120_000
export const PHASE_3_TIMEOUT_MS = 90_000
export const PHASE_4_TIMEOUT_MS = 90_000

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
