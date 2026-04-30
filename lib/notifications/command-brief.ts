import { evaluateChefSignal, type ChefSignal, type EvaluatedChefSignal } from './noise-simulator'

export type CommandBriefCadence = 'daily' | 'weekly'

export type CommandBriefSection = {
  title: string
  items: EvaluatedChefSignal[]
}

export type CommandBrief = {
  cadence: CommandBriefCadence
  title: string
  generatedAt: string
  sections: CommandBriefSection[]
  highestRisk: EvaluatedChefSignal | null
  nextAction: string | null
  delivery: {
    email: true
    push: boolean
    sms: boolean
  }
}

function sortByRisk(signal: EvaluatedChefSignal): number {
  if (signal.risk === 'safety') return 0
  if (signal.risk === 'money') return 1
  if (signal.risk === 'service') return 2
  if (signal.risk === 'capacity') return 3
  if (signal.risk === 'relationship') return 4
  return 5
}

function sectionFor(signal: EvaluatedChefSignal): string {
  if (signal.risk === 'money') return 'Money'
  if (signal.risk === 'safety' || signal.risk === 'service') return 'Food, Prep, And Service'
  if (signal.risk === 'relationship' || signal.risk === 'growth') return 'Clients Waiting'
  if (signal.risk === 'capacity') return 'Capacity And Personal Guardrails'
  if (signal.risk === 'reputation') return 'Reputation And Social'
  return 'Admin And System'
}

export function createCommandBrief(
  signals: ChefSignal[],
  cadence: CommandBriefCadence,
  generatedAt = new Date().toISOString()
): CommandBrief {
  const evaluatedWithSuppression: EvaluatedChefSignal[] = []
  for (const signal of signals) {
    evaluatedWithSuppression.push(evaluateChefSignal(signal, evaluatedWithSuppression))
  }

  const evaluated = evaluatedWithSuppression.filter(
    (signal) => signal.decision !== 'suppress' && signal.decision !== 'archive'
  )

  const sectionMap = new Map<string, EvaluatedChefSignal[]>()
  for (const signal of evaluated) {
    const key = sectionFor(signal)
    sectionMap.set(key, [...(sectionMap.get(key) ?? []), signal])
  }

  const highestRisk = [...evaluated].sort(sortByRisk)[0] ?? null
  const nextAction =
    [...evaluated]
      .filter((signal) => signal.requiredAction)
      .sort(sortByRisk)
      .map((signal) => signal.requiredAction)[0] ?? null

  return {
    cadence,
    title: cadence === 'daily' ? 'Daily Command Brief' : 'Weekly Command Brief',
    generatedAt,
    sections: [...sectionMap.entries()].map(([title, items]) => ({ title, items })),
    highestRisk,
    nextAction,
    delivery: {
      email: true,
      push: evaluated.some(
        (signal) => signal.decision === 'deliver_now' || signal.decision === 'escalate'
      ),
      sms: evaluated.some((signal) => signal.channels.sms && signal.decision === 'escalate'),
    },
  }
}
