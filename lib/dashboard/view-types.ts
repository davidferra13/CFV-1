/**
 * Dashboard-specific action-layer types and resolvers.
 * Reshapes queue + onboarding data into the single "resolve next" task.
 */

import type { SurfaceActionTask } from '@/lib/interface/shared-types'
import type { OnboardingProgress } from '@/lib/onboarding/progress-actions'
import type { PriorityQueue, QueueItem } from '@/lib/queue/types'

export type DashboardResolveNextTask = SurfaceActionTask & {
  source: 'queue' | 'onboarding' | 'profile' | 'clear'
}

function buildQueueResolveTask(
  priorityQueue: PriorityQueue,
  item: QueueItem
): DashboardResolveNextTask {
  const badge =
    item.urgency === 'critical'
      ? 'Resolve now'
      : item.urgency === 'high'
        ? 'Resolve today'
        : 'Active work'
  const tone = item.urgency === 'critical' ? 'rose' : item.urgency === 'high' ? 'amber' : 'brand'
  const context = [
    item.context.primaryLabel,
    item.context.secondaryLabel ?? null,
    item.blocks ? `Blocks ${item.blocks}` : (item.contextLine ?? null),
    item.estimatedMinutes ? `~${item.estimatedMinutes} min` : null,
  ].filter((value): value is string => Boolean(value))

  return {
    id: item.id,
    source: 'queue',
    badge,
    title: item.title,
    description: item.description,
    href: item.href,
    ctaLabel: 'Resolve Next',
    tone,
    context,
    remainingCount: Math.max(priorityQueue.summary.totalItems - 1, 0),
    remainingLabel: 'more waiting after this',
  }
}

function resolveOnboardingTask(progress: OnboardingProgress): DashboardResolveNextTask | null {
  if (!progress.nextStep) return null

  return {
    id: `onboarding-${progress.nextStep.key}`,
    source: 'onboarding',
    badge: 'Activation gap',
    title: progress.nextStep.label,
    description: progress.nextStep.description,
    href: progress.nextStep.href,
    ctaLabel: 'Resolve Next',
    tone: 'sky',
    context: [progress.nextStep.evidenceLabel ?? 'First-week activation is still incomplete'],
    remainingCount: Math.max(progress.totalSteps - progress.completedSteps - 1, 0),
    remainingLabel: 'more activation steps after this',
  }
}

export function resolveDashboardNextTask(input: {
  priorityQueue: PriorityQueue
  onboardingProgress: OnboardingProgress | null
  profileGated: boolean
}): DashboardResolveNextTask {
  if (input.priorityQueue.nextAction) {
    return buildQueueResolveTask(input.priorityQueue, input.priorityQueue.nextAction)
  }

  const onboardingTask = input.onboardingProgress
    ? resolveOnboardingTask(input.onboardingProgress)
    : null
  if (onboardingTask) return onboardingTask

  if (input.profileGated) {
    return {
      id: 'profile-gated',
      source: 'profile',
      badge: 'Public surface blocked',
      title: 'Finish your public profile',
      description: 'Your live profile stays hidden until the basic public-facing copy is complete.',
      href: '/settings/my-profile',
      ctaLabel: 'Fix Profile',
      tone: 'rose',
      context: ['Bio or tagline is still missing'],
      remainingCount: 0,
      remainingLabel: null,
    }
  }

  return {
    id: 'queue-clear',
    source: 'clear',
    badge: 'Queue clear',
    title: 'Nothing urgent is blocking you.',
    description:
      'The active queue is clear, so you can choose the next planned move instead of reacting.',
    href: '/queue',
    ctaLabel: 'Open Queue',
    tone: 'slate',
    context: ['No urgent triage items detected'],
    remainingCount: 0,
    remainingLabel: null,
  }
}
