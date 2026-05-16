import type { BuyablePriceContract } from '@/lib/pricing/buyable-price-contract'
import type {
  PieReliabilityBucket,
  PieReliabilityClassification,
} from '@/lib/pricing/pie-reliability'
import type {
  PriceLifecycleLedger,
  PriceLifecycleState,
  PriceLifecycleTransition,
} from '@/lib/pricing/price-lifecycle-ledger'
import {
  DEFAULT_COMMAND_SURFACE_VISIBILITY,
  applyPlaybackToActions,
  commandSurfacePlayback,
  highestRiskZone,
  uniqueRiskSignals,
  type CommandSurfaceAction,
  type CommandSurfaceItem,
  type CommandSurfacePlayback,
  type CommandSurfaceRiskSignal,
  type CommandSurfaceRiskZone,
  type CommandSurfaceVisibility,
} from './types'

export interface PieCommandSurfaceAdapterInput {
  id: string
  ingredientName: string
  contract: BuyablePriceContract
  reliability?: PieReliabilityClassification | PieReliabilityBucket | null
  lifecycle?: PriceLifecycleLedger | PriceLifecycleState | null
  href?: string | null
  proofHref?: string | null
  region?: string | null
  visibility?: Partial<CommandSurfaceVisibility>
  playback?: Partial<CommandSurfacePlayback>
}

export function mapPiePriceToCommandSurfaceItem(
  input: PieCommandSurfaceAdapterInput
): CommandSurfaceItem {
  const visibility: CommandSurfaceVisibility = {
    ...DEFAULT_COMMAND_SURFACE_VISIBILITY,
    ...input.visibility,
    roleAudience: input.visibility?.roleAudience ?? DEFAULT_COMMAND_SURFACE_VISIBILITY.roleAudience,
  }
  const playback = commandSurfacePlayback(input.playback)
  const lifecycleTransition = latestLifecycleTransition(input.lifecycle)
  const lifecycleState = lifecycleStateFrom(input.lifecycle)
  const reliabilityBucket = reliabilityBucketFrom(input.reliability)
  const riskSignals = uniqueRiskSignals(
    derivePieRiskSignals(input.contract, reliabilityBucket, lifecycleState)
  )
  const actions = applyPlaybackToActions(
    buildPieCommandActions(input.contract, input.href ?? null, input.proofHref ?? null),
    playback
  )

  return {
    id: input.id,
    title: input.ingredientName,
    description: input.contract.displayLabel,
    domain: 'pricing',
    href: input.href ?? null,
    sourceKind: 'pie',
    sourceId: input.id,
    tier: tierForPieRisk(highestRiskZone(riskSignals)),
    loopState: loopStateForLifecycle(lifecycleState, input.contract.sourceHealth),
    evidenceLabel: evidenceLabelForPie(input.contract, lifecycleState),
    confidence: confidenceScoreFromLabel(input.contract.confidenceLabel),
    proof: {
      id: `pie:${input.id}:proof`,
      label: input.contract.displayLabel,
      present: input.contract.localProof.present || input.contract.missingProof.length === 0,
      href: input.proofHref ?? null,
      evidenceLabel: evidenceLabelForPie(input.contract, lifecycleState),
      confidence: confidenceScoreFromLabel(input.contract.confidenceLabel),
      observedAt: input.contract.proof.observedAt ?? input.contract.freshness.observedAt,
      sourceLabels: input.contract.proof.sourceLabels,
      visibility,
      metadata: {
        trustLevel: input.contract.trustLevel,
        priceState: input.contract.priceState,
        sourceHealth: input.contract.sourceHealth,
        freshness: input.contract.freshness,
        missingProof: input.contract.missingProof,
        lifecycleState,
        lifecycleEvidence: lifecycleTransition?.evidence ?? null,
        region: input.region ?? null,
      },
    },
    riskZone: highestRiskZone(riskSignals),
    riskSignals,
    actions,
    visibility,
    playback,
    metadata: {
      safeForShopping: input.contract.safeForShopping,
      recommendedAction: input.contract.recommendedAction,
      reliabilityBucket,
      lifecycleState,
      reasons: input.contract.reasons,
    },
  }
}

export function riskZoneForPieReliabilityBucket(
  bucket: PieReliabilityBucket
): CommandSurfaceRiskZone {
  switch (bucket) {
    case 'direct_observed':
      return 'ready'
    case 'regional_observed':
    case 'national_observed':
      return 'watch'
    case 'estimated':
    case 'synthetic':
      return 'synthetic_or_modeled'
    case 'stale':
      return 'stale'
    case 'suspicious':
      return 'degraded'
  }
}

export function derivePieRiskSignals(
  contract: BuyablePriceContract,
  reliability: PieReliabilityBucket | null,
  lifecycleState: PriceLifecycleState | null
): CommandSurfaceRiskSignal[] {
  const signals: CommandSurfaceRiskSignal[] = []

  if (lifecycleState === 'disputed') {
    signals.push({ zone: 'disputed', reason: 'The price lifecycle is disputed.', source: 'pie' })
  }

  if (contract.priceState === 'missing' || contract.trustLevel === 'no_trusted_price') {
    signals.push({
      zone: 'missing_proof',
      reason: 'Required local buyable proof is missing.',
      source: 'pie',
    })
  }

  if (
    lifecycleState === 'stale' ||
    contract.sourceHealth === 'stale' ||
    contract.freshness.label === 'stale'
  ) {
    signals.push({ zone: 'stale', reason: 'Price proof is stale.', source: 'pie' })
  }

  if (lifecycleState === 'fallback-served' || contract.sourceHealth === 'degraded') {
    signals.push({ zone: 'degraded', reason: 'The price source is degraded.', source: 'pie' })
  }

  if (
    contract.priceState === 'synthetic_or_modeled' ||
    contract.trustLevel === 'modeled_estimate' ||
    reliability === 'estimated' ||
    reliability === 'synthetic'
  ) {
    signals.push({
      zone: 'synthetic_or_modeled',
      reason: 'The price is synthetic or modeled and must stay distinct from observed truth.',
      source: 'pie',
    })
  }

  if (reliability) {
    const zone = riskZoneForPieReliabilityBucket(reliability)
    signals.push({
      zone,
      reason: `PIE reliability bucket: ${reliability}.`,
      source: 'pie-reliability',
    })
  }

  if (signals.length === 0) {
    signals.push({
      zone: contract.safeForShopping ? 'ready' : 'watch',
      reason: contract.safeForShopping
        ? 'Local buyable proof is present.'
        : 'Use with proof labels and monitoring.',
      source: 'pie',
    })
  }

  return signals
}

function buildPieCommandActions(
  contract: BuyablePriceContract,
  href: string | null,
  proofHref: string | null
): CommandSurfaceAction[] {
  const actions: CommandSurfaceAction[] = []

  if (href) {
    actions.push({
      id: 'pie.open',
      label: 'Open price',
      kind: 'navigation',
      href,
    })
  }
  if (proofHref) {
    actions.push({
      id: 'pie.open-proof',
      label: 'Open proof',
      kind: 'navigation',
      href: proofHref,
    })
  }

  actions.push({
    id: 'pie.resolve-proof',
    label: contract.recommendedAction,
    kind: 'mutation',
    mutation: {
      command: 'pie.resolve_price_proof',
      enabled: true,
      readOnlyBlocked: false,
    },
    params: {
      trustLevel: contract.trustLevel,
      missingProof: contract.missingProof,
    },
  })

  return actions
}

function reliabilityBucketFrom(
  reliability: PieCommandSurfaceAdapterInput['reliability']
): PieReliabilityBucket | null {
  if (!reliability) return null
  return typeof reliability === 'string' ? reliability : reliability.bucket
}

function latestLifecycleTransition(
  lifecycle: PieCommandSurfaceAdapterInput['lifecycle']
): PriceLifecycleTransition | null {
  if (!lifecycle || typeof lifecycle === 'string') return null
  return lifecycle.transitions.at(-1) ?? null
}

function lifecycleStateFrom(
  lifecycle: PieCommandSurfaceAdapterInput['lifecycle']
): PriceLifecycleState | null {
  if (!lifecycle) return null
  if (typeof lifecycle === 'string') return lifecycle
  return latestLifecycleTransition(lifecycle)?.state ?? null
}

function confidenceScoreFromLabel(label: BuyablePriceContract['confidenceLabel']): number | null {
  switch (label) {
    case 'high':
      return 0.9
    case 'medium':
      return 0.65
    case 'low':
      return 0.3
    case 'none':
      return null
  }
}

function evidenceLabelForPie(
  contract: BuyablePriceContract,
  lifecycleState: PriceLifecycleState | null
): CommandSurfaceItem['evidenceLabel'] {
  if (lifecycleState === 'disputed') return 'disputed'
  if (contract.sourceHealth === 'stale' || contract.freshness.label === 'stale') return 'stale'
  if (contract.priceState === 'synthetic_or_modeled') return 'computed'
  if (contract.localProof.present) return 'confirmed'
  if (contract.proof.sourceLabels.length > 0) return 'inferred'
  return 'unknown'
}

function loopStateForLifecycle(
  lifecycleState: PriceLifecycleState | null,
  sourceHealth: BuyablePriceContract['sourceHealth']
): CommandSurfaceItem['loopState'] {
  if (lifecycleState === 'disputed' || lifecycleState === 'reviewed') return 'waiting'
  if (lifecycleState === 'archived') return 'dismissed'
  if (lifecycleState === 'resolved' || lifecycleState === 'reconciled') return 'done'
  if (lifecycleState === 'stale' || sourceHealth === 'stale') return 'stale'
  if (lifecycleState === 'fallback-served' || sourceHealth === 'degraded') return 'blocked'
  return 'active'
}

function tierForPieRisk(riskZone: CommandSurfaceRiskZone): CommandSurfaceItem['tier'] {
  switch (riskZone) {
    case 'blocked':
    case 'disputed':
      return 'p0'
    case 'missing_proof':
    case 'stale':
    case 'degraded':
      return 'p1'
    case 'synthetic_or_modeled':
    case 'watch':
      return 'p2'
    case 'ready':
      return 'p3'
  }
}
