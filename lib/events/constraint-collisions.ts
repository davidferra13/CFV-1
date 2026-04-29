import type { ConstraintRadarData } from '@/lib/events/constraint-radar-types'

export type CollisionAlert = {
  severity: 'warning' | 'critical'
  message: string
  dimensions: string[]
  resolveTab: string
}

type Problem = {
  dimension: string
  label: string
}

function pickResolveTab(dimensions: string[]): string {
  if (dimensions.includes('dietary')) return 'overview'
  if (dimensions.includes('financial')) return 'money'
  if (dimensions.includes('logistics')) return 'prep'
  return 'overview'
}

export function detectConstraintCollisions(data: ConstraintRadarData): CollisionAlert[] {
  const problems: Problem[] = []

  if (data.logistics.groceryDeadlinePassed) {
    problems.push({ dimension: 'logistics', label: 'grocery deadline passed' })
  }
  if (data.logistics.daysUntilEvent !== null && data.logistics.daysUntilEvent <= 3) {
    problems.push({
      dimension: 'logistics',
      label: `only ${data.logistics.daysUntilEvent} day${
        data.logistics.daysUntilEvent === 1 ? '' : 's'
      } out`,
    })
  }
  if (!data.logistics.hasPrepTimeline) {
    problems.push({ dimension: 'logistics', label: 'no prep timeline' })
  }

  if (data.financial.paymentStatus === 'unpaid') {
    problems.push({ dimension: 'financial', label: 'deposit unpaid' })
  }
  if (data.financial.budgetStatus === 'critical') {
    problems.push({ dimension: 'financial', label: 'food cost critical' })
  }

  if (data.dietary.criticalConflicts > 0) {
    problems.push({
      dimension: 'dietary',
      label: `${data.dietary.criticalConflicts} critical allergen conflict${
        data.dietary.criticalConflicts === 1 ? '' : 's'
      }`,
    })
  }
  if (data.dietary.unconfirmedAllergies) {
    problems.push({ dimension: 'dietary', label: 'unconfirmed allergies' })
  }

  if (data.completion.blockingCount >= 2) {
    problems.push({
      dimension: 'completion',
      label: `${data.completion.blockingCount} blocking requirements`,
    })
  }
  if (data.completion.score < 50) {
    problems.push({
      dimension: 'completion',
      label: `completion only ${Math.round(data.completion.score)}%`,
    })
  }

  const uniqueDimensions = [...new Set(problems.map((problem) => problem.dimension))]

  if (uniqueDimensions.length < 2) return []

  const severity = uniqueDimensions.length >= 3 ? 'critical' : 'warning'
  const labels = problems.map((problem) => problem.label)
  const message =
    labels.length === 2
      ? `${capitalize(labels[0])} and ${labels[1]}`
      : `${labels.slice(0, -1).map(capitalize).join(', ')}, and ${labels[labels.length - 1]}`

  return [
    {
      severity,
      message,
      dimensions: uniqueDimensions,
      resolveTab: pickResolveTab(uniqueDimensions),
    },
  ]
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
