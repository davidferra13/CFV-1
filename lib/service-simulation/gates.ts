import type {
  ServiceSimulationPanelState,
  ServiceSimulationTransitionGate,
  ServiceSimulationTransitionTarget,
} from './types'

export function getServiceSimulationTransitionGate(
  panelState: ServiceSimulationPanelState,
  target: ServiceSimulationTransitionTarget
): ServiceSimulationTransitionGate {
  const reasons: ServiceSimulationTransitionGate['reasons'] = []
  const criticalCount = panelState.simulation.rollup.criticalBlockerCount
  const warningCount = panelState.simulation.rollup.warningCount
  const topConcern = panelState.simulation.rollup.topConcern

  if (panelState.status === 'unsimulated') {
    reasons.push({
      code: 'unsimulated',
      label: 'No saved rehearsal yet',
      detail:
        'Current truth can be checked now, but no chef-acknowledged service simulation has been saved.',
    })
  }

  if (panelState.status === 'stale') {
    const firstReason = panelState.staleReasons[0]
    reasons.push({
      code: 'stale',
      label: 'Saved rehearsal is stale',
      detail: firstReason?.label
        ? `${firstReason.label}. Save a fresh run before you rely on it.`
        : 'Event truth changed after the last saved simulation.',
    })
  }

  if (criticalCount > 0) {
    reasons.push({
      code: 'critical',
      label: `${criticalCount} must-fix blocker${criticalCount === 1 ? '' : 's'} still open`,
      detail:
        topConcern?.detail ??
        'The current walkthrough still shows service blockers that should be resolved before proceeding.',
    })
  }

  if (warningCount > 0) {
    reasons.push({
      code: 'warning',
      label: `${warningCount} item${warningCount === 1 ? '' : 's'} should still be verified`,
      detail:
        criticalCount > 0
          ? 'There are additional verification items beyond the must-fix blockers.'
          : (topConcern?.detail ??
            'The current walkthrough still has open verification items under live event truth.'),
    })
  }

  const hardBlock = target === 'in_progress' && criticalCount > 0
  const status: ServiceSimulationTransitionGate['status'] = hardBlock
    ? 'hard'
    : reasons.length > 0
      ? 'soft'
      : 'clear'
  const summary =
    status === 'clear'
      ? 'Simulation does not add any new concerns for this step.'
      : hardBlock
        ? 'Resolve the must-fix simulation blockers before starting live service.'
        : target === 'completed'
          ? 'Service has already happened, so simulation stays advisory here.'
          : 'Review the simulation signal, then continue intentionally if you still want to move forward.'

  return {
    target,
    status,
    title:
      status === 'hard'
        ? 'Simulation says stop before service'
        : status === 'soft'
          ? 'Simulation wants an explicit decision'
          : 'Simulation check is clear',
    summary,
    reasons,
  }
}
