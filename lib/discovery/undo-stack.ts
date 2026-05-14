export type DiscoveryUndoCategory =
  | 'hide'
  | 'remove'
  | 'dismiss'
  | 'clear'
  | 'filter_change'
  | 'reset'
  | 'feedback'
  | 'branch_restore'

export type DiscoveryUndoEntry<TState> = {
  id: string
  category: DiscoveryUndoCategory
  label: string
  before: TState
  after: TState
  createdAt: string
}

export type DiscoveryUndoStack<TState> = {
  current: TState
  past: readonly DiscoveryUndoEntry<TState>[]
  future: readonly DiscoveryUndoEntry<TState>[]
  maxDepth: number
}

export type DiscoveryUndoResult<TState> = {
  stack: DiscoveryUndoStack<TState>
  restored: DiscoveryUndoEntry<TState> | null
}

export function createDiscoveryUndoStack<TState>(
  current: TState,
  maxDepth = 20
): DiscoveryUndoStack<TState> {
  return { current, past: [], future: [], maxDepth }
}

export function pushDiscoveryUndo<TState>(
  stack: DiscoveryUndoStack<TState>,
  input: Omit<DiscoveryUndoEntry<TState>, 'id' | 'before' | 'createdAt'> & {
    id?: string
    before?: TState
    createdAt?: string
  }
): DiscoveryUndoStack<TState> {
  const entry: DiscoveryUndoEntry<TState> = {
    id: input.id ?? `undo-${stack.past.length + 1}`,
    category: input.category,
    label: input.label,
    before: input.before ?? stack.current,
    after: input.after,
    createdAt: input.createdAt ?? new Date(0).toISOString(),
  }

  return {
    current: input.after,
    past: [...stack.past, entry].slice(-stack.maxDepth),
    future: [],
    maxDepth: stack.maxDepth,
  }
}

export function undoDiscoveryAction<TState>(
  stack: DiscoveryUndoStack<TState>
): DiscoveryUndoResult<TState> {
  const restored = stack.past[stack.past.length - 1] ?? null
  if (!restored) return { stack, restored: null }

  return {
    restored,
    stack: {
      current: restored.before,
      past: stack.past.slice(0, -1),
      future: [restored, ...stack.future],
      maxDepth: stack.maxDepth,
    },
  }
}

export function redoDiscoveryAction<TState>(
  stack: DiscoveryUndoStack<TState>
): DiscoveryUndoResult<TState> {
  const restored = stack.future[0] ?? null
  if (!restored) return { stack, restored: null }

  return {
    restored,
    stack: {
      current: restored.after,
      past: [...stack.past, restored].slice(-stack.maxDepth),
      future: stack.future.slice(1),
      maxDepth: stack.maxDepth,
    },
  }
}

export function restoreDiscoveryBranch<TState>(
  stack: DiscoveryUndoStack<TState>,
  entryId: string
): DiscoveryUndoResult<TState> {
  const index = stack.past.findIndex((entry) => entry.id === entryId)
  if (index < 0) return { stack, restored: null }

  const restored = stack.past[index]
  const branchEntry: DiscoveryUndoEntry<TState> = {
    id: `restore-${restored.id}`,
    category: 'branch_restore',
    label: `Restore ${restored.label}`,
    before: stack.current,
    after: restored.before,
    createdAt: new Date(0).toISOString(),
  }

  return {
    restored,
    stack: {
      current: restored.before,
      past: [...stack.past.slice(0, index), branchEntry].slice(-stack.maxDepth),
      future: stack.past.slice(index),
      maxDepth: stack.maxDepth,
    },
  }
}
