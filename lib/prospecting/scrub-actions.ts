'use server'

import { scrubProspects as scrubProspectsAction } from './scrub/scrub-prospects'
import {
  reEnrichProspect as reEnrichProspectAction,
  batchReEnrich as batchReEnrichAction,
} from './scrub/re-enrich'
import { getScrubSessionProgress as getScrubSessionProgressAction } from './scrub/session-progress'
import { competitorIntelScrub as competitorIntelScrubAction } from './scrub/competitor-intel'
import { lookalikeProspect as lookalikeProspectAction } from './scrub/lookalike'

export async function scrubProspects(...args: Parameters<typeof scrubProspectsAction>) {
  return scrubProspectsAction(...args)
}

export async function reEnrichProspect(...args: Parameters<typeof reEnrichProspectAction>) {
  return reEnrichProspectAction(...args)
}

export async function batchReEnrich(...args: Parameters<typeof batchReEnrichAction>) {
  return batchReEnrichAction(...args)
}

export async function getScrubSessionProgress(
  ...args: Parameters<typeof getScrubSessionProgressAction>
) {
  return getScrubSessionProgressAction(...args)
}

export async function competitorIntelScrub(...args: Parameters<typeof competitorIntelScrubAction>) {
  return competitorIntelScrubAction(...args)
}

export async function lookalikeProspect(...args: Parameters<typeof lookalikeProspectAction>) {
  return lookalikeProspectAction(...args)
}
