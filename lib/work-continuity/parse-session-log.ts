import type { LoadedContinuitySource, WorkContinuityItem } from './types'
import { findLineNumber } from './sources'

export function parseSessionLogItems(
  source: LoadedContinuitySource | undefined
): WorkContinuityItem[] {
  if (!source) {
    return []
  }

  const line = findLineNumber(source, /Found 5 critical bugs/i)

  if (!line) {
    return []
  }

  return [
    {
      id: 'ticketed-events-critical-blockers',
      title: 'Ticketed events critical blockers',
      category: 'release_gap',
      lane: 'website-owned',
      status: 'blocked',
      sourcePaths: [
        {
          path: source.path,
          line,
          label: 'ticketed events audit found critical blockers',
        },
      ],
      nextAction: 'Run ticketed-events repair handoff before treating ticketing as shipped.',
      lastSeen: '2026-04-24',
    },
  ]
}
