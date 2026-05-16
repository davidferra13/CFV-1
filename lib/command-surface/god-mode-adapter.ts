import type { GodModeResolvedItem } from '@/lib/discovery/god-mode-types'
import type { EvidenceLabel } from '@/lib/operating-loop/types'
import {
  DEFAULT_COMMAND_SURFACE_VISIBILITY,
  LIVE_COMMAND_SURFACE_PLAYBACK,
  applyPlaybackToActions,
  commandSurfacePlayback,
  highestRiskZone,
  uniqueRiskSignals,
  type CommandSurfaceAction,
  type CommandSurfaceItem,
  type CommandSurfacePlayback,
  type CommandSurfaceRiskSignal,
  type CommandSurfaceVisibility,
} from './types'

export interface GodModeCommandSurfaceAdapterOptions {
  domain?: string
  sourceId?: string | null
  visibility?: Partial<CommandSurfaceVisibility>
  playback?: Partial<CommandSurfacePlayback>
}

export function mapGodModeResolvedItemToCommandSurfaceItem(
  item: GodModeResolvedItem,
  options: GodModeCommandSurfaceAdapterOptions = {}
): CommandSurfaceItem {
  const visibility: CommandSurfaceVisibility = {
    ...DEFAULT_COMMAND_SURFACE_VISIBILITY,
    ...options.visibility,
    roleAudience:
      options.visibility?.roleAudience ?? DEFAULT_COMMAND_SURFACE_VISIBILITY.roleAudience,
  }
  const playback = commandSurfacePlayback(options.playback ?? LIVE_COMMAND_SURFACE_PLAYBACK)
  const evidenceLabel = item.evidenceLabel ?? 'unknown'
  const confidence = item.confidence ?? null
  const sourceId = options.sourceId ?? sourceIdFromItem(item)
  const proofHref = item.proofHref ?? null
  const riskSignals = uniqueRiskSignals(
    riskSignalsForGodModeItem({
      evidenceLabel,
      confidence,
      proofHref,
      loopState: item.loopState ?? 'active',
    })
  )
  const actions = applyPlaybackToActions(mapInlineActions(item), playback)

  return {
    id: item.definitionId,
    title: item.label,
    description: item.context || null,
    domain: options.domain ?? domainFromGodModeItem(item),
    href: item.destination,
    sourceKind: item.sourceKind ?? 'rail',
    sourceId,
    tier: item.tier,
    loopState: item.loopState ?? 'active',
    evidenceLabel,
    confidence,
    proof: {
      id: `god-mode:${item.definitionId}:proof`,
      label: proofLabelForEvidence(evidenceLabel),
      present: Boolean(proofHref) || evidenceLabel === 'confirmed',
      href: proofHref,
      evidenceLabel,
      confidence,
      visibility,
      metadata: {
        waitingOn: item.waitingOn ?? null,
        resumeContext: item.resumeContext ?? null,
      },
    },
    riskZone: highestRiskZone(riskSignals),
    riskSignals,
    actions,
    visibility,
    playback,
    metadata: {
      score: item.score ?? null,
      expiresAt: item.expiresAt?.toISOString() ?? null,
      escalatesAt: item.escalatesAt?.toISOString() ?? null,
      data: item.data ?? null,
      icon: item.icon ?? null,
      nextAction: item.nextAction ?? null,
    },
  }
}

function mapInlineActions(item: GodModeResolvedItem): CommandSurfaceAction[] {
  const actions: CommandSurfaceAction[] = [
    {
      id: `${item.definitionId}:open`,
      label: 'Open',
      kind: 'navigation',
      href: item.destination,
    },
  ]

  for (const inlineAction of item.inlineActions ?? []) {
    actions.push({
      id: `${item.definitionId}:${inlineAction.action}`,
      label: inlineAction.label,
      kind: 'mutation',
      params: inlineAction.params,
      variant: inlineAction.variant,
      mutation: {
        command: inlineAction.action,
        enabled: true,
        readOnlyBlocked: false,
      },
    })
  }

  return actions
}

function sourceIdFromItem(item: GodModeResolvedItem): string | null {
  const sourceId = item.data?.sourceId
  return typeof sourceId === 'string' && sourceId.length > 0 ? sourceId : null
}

function domainFromGodModeItem(item: GodModeResolvedItem): string {
  if (item.sourceKind) return item.sourceKind
  const [domain] = item.definitionId.split('.')
  return domain || 'rail'
}

function proofLabelForEvidence(evidenceLabel: EvidenceLabel): string {
  switch (evidenceLabel) {
    case 'confirmed':
      return 'Confirmed proof'
    case 'computed':
      return 'Computed proof'
    case 'inferred':
      return 'Inferred proof'
    case 'claimed':
      return 'Claimed proof'
    case 'stale':
      return 'Stale proof'
    case 'disputed':
      return 'Disputed proof'
    case 'user_entered':
      return 'User-entered proof'
    case 'unknown':
      return 'Unknown proof'
  }
}

function riskSignalsForGodModeItem(input: {
  evidenceLabel: EvidenceLabel
  confidence: number | null
  proofHref: string | null
  loopState: string
}): CommandSurfaceRiskSignal[] {
  const signals: CommandSurfaceRiskSignal[] = []

  if (input.loopState === 'blocked') {
    signals.push({ zone: 'blocked', reason: 'The source item is blocked.', source: 'god-mode' })
  }
  if (input.evidenceLabel === 'disputed') {
    signals.push({ zone: 'disputed', reason: 'The evidence is disputed.', source: 'god-mode' })
  }
  if (input.evidenceLabel === 'stale' || input.loopState === 'stale') {
    signals.push({ zone: 'stale', reason: 'The evidence is stale.', source: 'god-mode' })
  }
  if (!input.proofHref && input.evidenceLabel !== 'unknown') {
    signals.push({
      zone: 'missing_proof',
      reason: 'The item has evidence metadata but no proof destination.',
      source: 'god-mode',
    })
  }
  if (input.confidence !== null && input.confidence < 0.35) {
    signals.push({ zone: 'watch', reason: 'Confidence is low.', source: 'god-mode' })
  }
  if (signals.length === 0 && input.evidenceLabel === 'unknown') {
    signals.push({ zone: 'watch', reason: 'Evidence has not been classified.', source: 'god-mode' })
  }

  return signals
}
