export type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
export type Pos = { x: number; y: number }

const OPPOSITE: Record<Dir, Dir> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
}

export function positionsEqual(a: Pos, b: Pos): boolean {
  return a.x === b.x && a.y === b.y
}

export function isOppositeDirection(a: Dir, b: Dir): boolean {
  return OPPOSITE[a] === b
}

export function queueDirection(queue: Dir[], requested: Dir, current: Dir, maxBuffered = 2): Dir[] {
  const anchor = queue[queue.length - 1] ?? current
  if (
    requested === anchor ||
    isOppositeDirection(requested, anchor) ||
    queue.length >= maxBuffered
  ) {
    return queue
  }
  return [...queue, requested]
}

export function nextHeadPosition(head: Pos, dir: Dir): Pos {
  if (dir === 'UP') return { x: head.x, y: head.y - 1 }
  if (dir === 'DOWN') return { x: head.x, y: head.y + 1 }
  if (dir === 'LEFT') return { x: head.x - 1, y: head.y }
  return { x: head.x + 1, y: head.y }
}

export function collidesWithBody(snake: Pos[], nextHead: Pos, willGrow: boolean): boolean {
  const body = willGrow ? snake : snake.slice(0, -1)
  return body.some((segment) => positionsEqual(segment, nextHead))
}

export function randomOpenPosition(grid: number, blocked: Pos[]): Pos {
  const capacity = grid * grid
  if (blocked.length >= capacity) {
    throw new Error('No open positions available in grid.')
  }

  const blockedSet = new Set(blocked.map((p) => `${p.x}:${p.y}`))
  const attempts = Math.min(200, capacity)
  for (let i = 0; i < attempts; i++) {
    const candidate = { x: Math.floor(Math.random() * grid), y: Math.floor(Math.random() * grid) }
    if (!blockedSet.has(`${candidate.x}:${candidate.y}`)) {
      return candidate
    }
  }

  for (let y = 0; y < grid; y++) {
    for (let x = 0; x < grid; x++) {
      if (!blockedSet.has(`${x}:${y}`)) {
        return { x, y }
      }
    }
  }

  throw new Error('Failed to find open position in grid.')
}
