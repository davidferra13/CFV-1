export type OnboardingTestReadinessStatus =
  | 'missing'
  | 'ready_to_test'
  | 'operator_review'
  | 'verified'

export type OnboardingTestReadinessFacts = {
  pilotCandidateCount: number
  setupReadyCount: number
  watchedRuns?: number
  completedRuns?: number
  unresolvedBlockers?: number
}

export type OnboardingTestReadiness = {
  status: OnboardingTestReadinessStatus
  evidence: string
  nextStep: string
  href: string
}

function countLabel(count: number, singular: string, plural: string): string {
  if (count === 1) return `1 ${singular}`
  return `${count} ${plural}`
}

function safeCount(value: number | undefined): number {
  return Number.isFinite(value) && value !== undefined ? Math.max(0, Math.floor(value)) : 0
}

export function buildOnboardingTestReadiness(
  facts: OnboardingTestReadinessFacts
): OnboardingTestReadiness {
  const pilotCandidateCount = safeCount(facts.pilotCandidateCount)
  const setupReadyCount = safeCount(facts.setupReadyCount)
  const watchedRuns = safeCount(facts.watchedRuns)
  const completedRuns = safeCount(facts.completedRuns)
  const unresolvedBlockers = safeCount(facts.unresolvedBlockers)

  if (completedRuns > 0 && unresolvedBlockers === 0) {
    return {
      status: 'verified',
      evidence: `${countLabel(completedRuns, 'watched onboarding run completed', 'watched onboarding runs completed')} with no unresolved blocker`,
      nextStep: 'Keep the notes attached to launch evidence and retest after major setup changes.',
      href: '/admin/beta/onboarding',
    }
  }

  if (watchedRuns > 0) {
    return {
      status: 'operator_review',
      evidence: `${countLabel(watchedRuns, 'watched onboarding run exists', 'watched onboarding runs exist')}; ${countLabel(unresolvedBlockers, 'unresolved blocker', 'unresolved blockers')}`,
      nextStep:
        unresolvedBlockers > 0
          ? 'Resolve or explicitly accept the onboarding blockers before launch.'
          : 'Operator should confirm whether the watched run used a nontechnical tester.',
      href: '/admin/beta/onboarding',
    }
  }

  if (setupReadyCount > 0) {
    return {
      status: 'ready_to_test',
      evidence: `${countLabel(setupReadyCount, 'chef is setup-ready', 'chefs are setup-ready')} for a watched onboarding run`,
      nextStep: 'Ask a nontechnical tester to complete setup while an operator records friction.',
      href: '/admin/beta/onboarding',
    }
  }

  return {
    status: 'missing',
    evidence:
      pilotCandidateCount > 0
        ? `${countLabel(pilotCandidateCount, 'pilot candidate exists', 'pilot candidates exist')}, but none are setup-ready`
        : 'No pilot candidate exists for a meaningful onboarding test',
    nextStep: 'Create or prepare one pilot chef profile before running onboarding validation.',
    href: '/admin/users',
  }
}
