import type { GodModeResolvedItem, GodModeResolverContext } from '../../god-mode-types'

export async function resolveChurnSignals(
  ctx: GodModeResolverContext
): Promise<GodModeResolvedItem[]> {
  const { getChurnPreventionTriggersForTenant } =
    await import('@/lib/intelligence/churn-prevention-triggers-internal')

  let result
  try {
    result = await getChurnPreventionTriggersForTenant(ctx.tenantId)
  } catch (err) {
    console.error('[churn-resolver] Failed:', err)
    return []
  }

  if (!result) return []

  const items: GodModeResolvedItem[] = []

  for (const client of result.atRiskClients.slice(0, 10)) {
    const tier =
      client.riskLevel === 'critical'
        ? ('p0' as const)
        : client.riskLevel === 'high'
          ? ('p1' as const)
          : ('p2' as const)

    const topTrigger = client.triggers[0]

    items.push({
      definitionId: `chef.churn.${client.clientId}`,
      tier,
      label: `Churn signal: ${client.clientName}`,
      context: topTrigger?.description ?? client.suggestedAction,
      destination: `/chef/clients/${client.clientId}`,
      icon: 'user-minus',
      loopState: 'stale',
      sourceKind: 'client_profile',
      evidenceLabel: 'computed',
      confidence: client.riskScore / 100,
      score: client.riskScore,
      nextAction: client.suggestedAction,
      data: {
        clientId: client.clientId,
        riskScore: client.riskScore,
        riskLevel: client.riskLevel,
        triggerCount: client.triggers.length,
        daysSinceLastEvent: client.daysSinceLastEvent,
      },
    })
  }

  return items
}
