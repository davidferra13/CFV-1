import {
  redoDiscoveryAction,
  restoreDiscoveryBranch,
  undoDiscoveryAction,
  type DiscoveryUndoEntry,
  type DiscoveryUndoResult,
  type DiscoveryUndoStack,
} from '@/lib/discovery/undo-stack'

export type RemyUndoCommand =
  | { type: 'undo'; steps: number }
  | { type: 'redo'; steps: number }
  | { type: 'restore'; entryId?: string; labelQuery?: string; stepsBack?: number }

export type RemyUndoProposal<TState> = {
  command: RemyUndoCommand
  result: DiscoveryUndoResult<TState>
  branchCreated: boolean
  durableStatePreserved: boolean
  requiresConfirmation: boolean
  reason: string
}

export function parseRemyUndoCommand(message: string): RemyUndoCommand | null {
  const normalized = message.trim().toLowerCase()
  const steps = numberWordToInt(normalized.match(/\b(one|two|three|four|five|\d+)\b/)?.[1]) ?? 1

  if (/\b(redo|forward)\b/.test(normalized)) return { type: 'redo', steps }
  if (/\b(restore|go back to|from before|before i said)\b/.test(normalized)) {
    const labelQuery = normalized.match(/before i said\s+(.+)$/)?.[1]?.trim()
    return { type: 'restore', labelQuery, stepsBack: steps }
  }
  if (/\b(undo|go back|back up)\b/.test(normalized)) return { type: 'undo', steps }
  return null
}

export function proposeUndoOrBranchRestore<TState>(
  stack: DiscoveryUndoStack<TState>,
  command: RemyUndoCommand
): RemyUndoProposal<TState> {
  if (command.type === 'redo') {
    let result: DiscoveryUndoResult<TState> = { stack, restored: null }
    for (let index = 0; index < command.steps; index += 1) {
      result = redoDiscoveryAction(result.stack)
      if (!result.restored) break
    }
    return {
      command,
      result,
      branchCreated: false,
      durableStatePreserved: true,
      requiresConfirmation: false,
      reason: result.restored
        ? 'Redo restores temporary discovery state only.'
        : 'Nothing to redo.',
    }
  }

  if (command.type === 'restore') {
    const entry = resolveRestoreEntry(stack.past, command)
    const result = entry ? restoreDiscoveryBranch(stack, entry.id) : { stack, restored: null }
    return {
      command: { ...command, entryId: entry?.id ?? command.entryId },
      result,
      branchCreated: Boolean(result.restored),
      durableStatePreserved: true,
      requiresConfirmation: false,
      reason: result.restored
        ? 'Restored a prior rail snapshot as a branch without deleting durable saves or votes.'
        : 'No matching discovery snapshot was found.',
    }
  }

  let result: DiscoveryUndoResult<TState> = { stack, restored: null }
  for (let index = 0; index < command.steps; index += 1) {
    result = undoDiscoveryAction(result.stack)
    if (!result.restored) break
  }
  return {
    command,
    result,
    branchCreated: false,
    durableStatePreserved: true,
    requiresConfirmation: false,
    reason: result.restored ? 'Undo restored temporary discovery state only.' : 'Nothing to undo.',
  }
}

function resolveRestoreEntry<TState>(
  entries: readonly DiscoveryUndoEntry<TState>[],
  command: Extract<RemyUndoCommand, { type: 'restore' }>
): DiscoveryUndoEntry<TState> | null {
  if (command.entryId) return entries.find((entry) => entry.id === command.entryId) ?? null
  if (command.labelQuery) {
    return (
      [...entries]
        .reverse()
        .find((entry) => entry.label.toLowerCase().includes(command.labelQuery!.toLowerCase())) ??
      null
    )
  }
  const index = entries.length - (command.stepsBack ?? 1)
  return entries[index] ?? null
}

function numberWordToInt(value: string | undefined): number | null {
  if (!value) return null
  if (/^\d+$/.test(value)) return Math.max(1, Number(value))
  const words: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
  }
  return words[value] ?? null
}
