import type {
  CommitmentDomain,
  CommitmentSuggestion,
  FrictionCheckResult,
} from '@/lib/commitment/types'

type EvaluateFn = (tenantId: string, context: any) => Promise<FrictionCheckResult[]>
type SuggestFn = (tenantId: string) => Promise<CommitmentSuggestion[]>

interface DomainRegistration {
  domain: CommitmentDomain
  evaluate: EvaluateFn
  suggest: SuggestFn
}

const domainRegistry = new Map<CommitmentDomain, DomainRegistration>()

export function registerDomain(registration: DomainRegistration): void {
  domainRegistry.set(registration.domain, registration)
}

export function getDomainEvaluator(domain: CommitmentDomain): EvaluateFn | undefined {
  return domainRegistry.get(domain)?.evaluate
}

export function getDomainSuggestor(domain: CommitmentDomain): SuggestFn | undefined {
  return domainRegistry.get(domain)?.suggest
}

export function getRegisteredDomains(): CommitmentDomain[] {
  return [...domainRegistry.keys()]
}

export async function evaluateDomain(
  domain: CommitmentDomain,
  tenantId: string,
  context: unknown
): Promise<FrictionCheckResult[]> {
  const evaluator = getDomainEvaluator(domain)
  if (!evaluator) return []
  return evaluator(tenantId, context)
}

export async function suggestForDomain(
  domain: CommitmentDomain,
  tenantId: string
): Promise<CommitmentSuggestion[]> {
  const suggestor = getDomainSuggestor(domain)
  if (!suggestor) return []
  return suggestor(tenantId)
}

// Register all domains
import { evaluatePricingCommitments, getPricingSuggestions } from '@/lib/commitment/domains/pricing'

import {
  evaluateSchedulingCommitments,
  getSchedulingSuggestions,
} from '@/lib/commitment/domains/scheduling'

import { evaluateDietaryCommitments, getDietarySuggestions } from '@/lib/commitment/domains/dietary'

import { evaluateQualityCommitments, getQualitySuggestions } from '@/lib/commitment/domains/quality'

import {
  evaluateFinancialCommitments,
  getFinancialSuggestions,
} from '@/lib/commitment/domains/financial'

import {
  evaluateMenuIntegrityCommitments,
  getMenuIntegritySuggestions,
} from '@/lib/commitment/domains/menu-integrity'

import {
  evaluateCloseoutCommitments,
  getCloseoutSuggestions,
} from '@/lib/commitment/domains/closeout'

import {
  evaluateCommunicationCommitments,
  getCommunicationSuggestions,
} from '@/lib/commitment/domains/communication'

import {
  evaluateCapacityCommitments,
  getCapacitySuggestions,
} from '@/lib/commitment/domains/capacity'

import {
  evaluateContingencyCommitments,
  getContingencySuggestions,
} from '@/lib/commitment/domains/contingency'

registerDomain({
  domain: 'pricing',
  evaluate: evaluatePricingCommitments,
  suggest: getPricingSuggestions,
})

registerDomain({
  domain: 'scheduling',
  evaluate: evaluateSchedulingCommitments,
  suggest: getSchedulingSuggestions,
})

registerDomain({
  domain: 'dietary',
  evaluate: evaluateDietaryCommitments,
  suggest: getDietarySuggestions,
})

registerDomain({
  domain: 'quality',
  evaluate: evaluateQualityCommitments,
  suggest: getQualitySuggestions,
})

registerDomain({
  domain: 'financial',
  evaluate: evaluateFinancialCommitments,
  suggest: getFinancialSuggestions,
})

registerDomain({
  domain: 'menu',
  evaluate: evaluateMenuIntegrityCommitments,
  suggest: getMenuIntegritySuggestions,
})

registerDomain({
  domain: 'closeout',
  evaluate: evaluateCloseoutCommitments,
  suggest: getCloseoutSuggestions,
})

registerDomain({
  domain: 'communication',
  evaluate: evaluateCommunicationCommitments,
  suggest: getCommunicationSuggestions,
})

registerDomain({
  domain: 'capacity',
  evaluate: evaluateCapacityCommitments,
  suggest: getCapacitySuggestions,
})

registerDomain({
  domain: 'contingency',
  evaluate: evaluateContingencyCommitments,
  suggest: getContingencySuggestions,
})
