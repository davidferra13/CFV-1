// Critical Path Analysis - Deterministic graph algorithm
// Computes the critical path through a task dependency graph using
// topological sort and forward/backward pass.
// No AI needed: this is standard project management math.

// ── Types ──────────────────────────────────────────────────────────────────

export interface TaskNode {
  id: string
  name: string
  durationMinutes: number
  dependsOn: string[] // task IDs this task depends on
}

export interface CriticalPathResult {
  criticalPath: string[] // ordered task IDs on the critical path
  totalDurationMinutes: number
  taskSchedule: Record<
    string,
    {
      earliestStart: number // minutes from project start
      earliestFinish: number
      latestStart: number
      latestFinish: number
      slack: number // 0 = critical
      isCritical: boolean
    }
  >
  hasCycle: boolean
  cycleError?: string
}

// ── Topological Sort (Kahn's algorithm) ────────────────────────────────────

function topologicalSort(tasks: TaskNode[]): { sorted: string[]; hasCycle: boolean } {
  const inDegree: Record<string, number> = {}
  const adjacency: Record<string, string[]> = {}
  const taskIds = new Set(tasks.map((t) => t.id))

  // Initialize
  for (const task of tasks) {
    inDegree[task.id] = 0
    adjacency[task.id] = []
  }

  // Build graph
  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      if (!taskIds.has(dep)) continue // skip invalid references
      adjacency[dep].push(task.id)
      inDegree[task.id] = (inDegree[task.id] ?? 0) + 1
    }
  }

  // Find nodes with no incoming edges
  const queue: string[] = []
  for (const task of tasks) {
    if (inDegree[task.id] === 0) {
      queue.push(task.id)
    }
  }

  const sorted: string[] = []
  while (queue.length > 0) {
    const current = queue.shift()!
    sorted.push(current)

    for (const neighbor of adjacency[current] ?? []) {
      inDegree[neighbor]--
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor)
      }
    }
  }

  return {
    sorted,
    hasCycle: sorted.length !== tasks.length,
  }
}

// ── Critical Path Method ───────────────────────────────────────────────────

/**
 * Computes the critical path through a dependency graph.
 * Uses forward pass (earliest start/finish) and backward pass (latest start/finish).
 * Tasks with zero slack are on the critical path.
 *
 * This is deterministic project management math, not AI.
 */
export function calculateCriticalPath(tasks: TaskNode[]): CriticalPathResult {
  if (tasks.length === 0) {
    return {
      criticalPath: [],
      totalDurationMinutes: 0,
      taskSchedule: {},
      hasCycle: false,
    }
  }

  // Step 1: Topological sort
  const { sorted, hasCycle } = topologicalSort(tasks)

  if (hasCycle) {
    return {
      criticalPath: [],
      totalDurationMinutes: 0,
      taskSchedule: {},
      hasCycle: true,
      cycleError: 'Circular dependency detected. Remove the cycle before calculating the timeline.',
    }
  }

  const taskMap: Record<string, TaskNode> = {}
  for (const t of tasks) {
    taskMap[t.id] = t
  }

  // Step 2: Forward pass (earliest start/finish)
  const es: Record<string, number> = {}
  const ef: Record<string, number> = {}

  for (const id of sorted) {
    const task = taskMap[id]
    const deps = task.dependsOn.filter((d) => taskMap[d])

    // Earliest start = max of all dependency earliest finishes
    es[id] = deps.length > 0 ? Math.max(...deps.map((d) => ef[d] ?? 0)) : 0
    ef[id] = es[id] + task.durationMinutes
  }

  // Total project duration
  const totalDuration = Math.max(...Object.values(ef), 0)

  // Step 3: Backward pass (latest start/finish)
  const ls: Record<string, number> = {}
  const lf: Record<string, number> = {}

  // Initialize: tasks with no successors finish at project end
  const hasSuccessor = new Set<string>()
  for (const task of tasks) {
    for (const dep of task.dependsOn) {
      hasSuccessor.add(dep)
    }
  }

  for (const id of [...sorted].reverse()) {
    if (!hasSuccessor.has(id)) {
      lf[id] = totalDuration
    } else {
      // Latest finish = min of all successor latest starts
      const successors = tasks.filter((t) => t.dependsOn.includes(id))
      lf[id] = successors.length > 0 ? Math.min(...successors.map((s) => ls[s.id])) : totalDuration
    }
    ls[id] = lf[id] - taskMap[id].durationMinutes
  }

  // Step 4: Calculate slack and identify critical path
  const schedule: CriticalPathResult['taskSchedule'] = {}
  const criticalPath: string[] = []

  for (const id of sorted) {
    const slack = ls[id] - es[id]
    const isCritical = slack === 0
    schedule[id] = {
      earliestStart: es[id],
      earliestFinish: ef[id],
      latestStart: ls[id],
      latestFinish: lf[id],
      slack,
      isCritical,
    }
    if (isCritical) {
      criticalPath.push(id)
    }
  }

  return {
    criticalPath,
    totalDurationMinutes: totalDuration,
    taskSchedule: schedule,
    hasCycle: false,
  }
}

// ── Cycle Detection Helper ─────────────────────────────────────────────────

/**
 * Checks if adding a dependency would create a cycle.
 * Use this before inserting a new dependency to prevent invalid states.
 */
export function wouldCreateCycle(
  existingTasks: TaskNode[],
  newTaskId: string,
  newDependsOnId: string
): boolean {
  // Build a temporary task list with the new dependency added
  const tempTasks = existingTasks.map((t) => {
    if (t.id === newTaskId) {
      return { ...t, dependsOn: [...t.dependsOn, newDependsOnId] }
    }
    return t
  })

  const { hasCycle } = topologicalSort(tempTasks)
  return hasCycle
}
