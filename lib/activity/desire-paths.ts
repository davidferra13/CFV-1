import type { BreadcrumbEntry, BreadcrumbSession } from './breadcrumb-types'
import { labelForPath } from './breadcrumb-types'

export type DesirePathCount = {
  path: string
  label: string
  count: number
}

export type DesirePathTransition = {
  fromPath: string
  fromLabel: string
  toPath: string
  toLabel: string
  count: number
}

export type DesirePathLoop = {
  path: string
  label: string
  sessions: number
  visits: number
}

export type DesirePathInsights = {
  sessionCount: number
  breadcrumbCount: number
  pageViewCount: number
  interactionCount: number
  hasEnoughData: boolean
  topPages: DesirePathCount[]
  topTransitions: DesirePathTransition[]
  backtracks: DesirePathTransition[]
  loops: DesirePathLoop[]
  interactionHotspots: DesirePathCount[]
  exitPages: DesirePathCount[]
}

type PageView = BreadcrumbEntry & {
  label: string
}

function increment(map: Map<string, number>, key: string, by = 1): void {
  map.set(key, (map.get(key) || 0) + by)
}

function toCountList(map: Map<string, number>, limit: number): DesirePathCount[] {
  return [...map.entries()]
    .map(([path, count]) => ({
      path,
      label: labelForPath(path),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
}

function transitionKey(fromPath: string, toPath: string): string {
  return `${fromPath}\n${toPath}`
}

function parseTransitionKey(key: string): { fromPath: string; toPath: string } {
  const [fromPath, toPath] = key.split('\n')
  return { fromPath: fromPath || '/', toPath: toPath || '/' }
}

function toTransitionList(map: Map<string, number>, limit: number): DesirePathTransition[] {
  return [...map.entries()]
    .map(([key, count]) => {
      const { fromPath, toPath } = parseTransitionKey(key)
      return {
        fromPath,
        fromLabel: labelForPath(fromPath),
        toPath,
        toLabel: labelForPath(toPath),
        count,
      }
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

function getPageViews(session: BreadcrumbSession): PageView[] {
  return session.breadcrumbs
    .filter((entry) => entry.breadcrumb_type === 'page_view')
    .map((entry) => ({
      ...entry,
      label: entry.label || labelForPath(entry.path),
    }))
}

export function analyzeDesirePaths(sessions: BreadcrumbSession[]): DesirePathInsights {
  const pageCounts = new Map<string, number>()
  const transitionCounts = new Map<string, number>()
  const backtrackCounts = new Map<string, number>()
  const loopSessions = new Map<string, number>()
  const loopVisits = new Map<string, number>()
  const interactionCounts = new Map<string, number>()
  const exitCounts = new Map<string, number>()

  let breadcrumbCount = 0
  let pageViewCount = 0
  let interactionCount = 0

  for (const session of sessions) {
    breadcrumbCount += session.breadcrumbs.length

    for (const entry of session.breadcrumbs) {
      if (entry.breadcrumb_type === 'page_view') {
        pageViewCount++
        increment(pageCounts, entry.path)
      } else {
        interactionCount++
        increment(interactionCounts, entry.path)
      }
    }

    const pageViews = getPageViews(session)
    const sessionPageCounts = new Map<string, number>()

    for (let index = 0; index < pageViews.length; index++) {
      const current = pageViews[index]
      increment(sessionPageCounts, current.path)

      const next = pageViews[index + 1]
      if (!next || next.path === current.path) continue

      increment(transitionCounts, transitionKey(current.path, next.path))

      const previous = pageViews[index - 1]
      if (previous && previous.path === next.path) {
        increment(backtrackCounts, transitionKey(current.path, next.path))
      }
    }

    const lastPage = pageViews[pageViews.length - 1]
    if (lastPage) increment(exitCounts, lastPage.path)

    for (const [path, count] of sessionPageCounts.entries()) {
      if (count < 3) continue
      increment(loopSessions, path)
      increment(loopVisits, path, count)
    }
  }

  const loops = [...loopSessions.entries()]
    .map(([path, sessionCount]) => ({
      path,
      label: labelForPath(path),
      sessions: sessionCount,
      visits: loopVisits.get(path) || sessionCount,
    }))
    .sort(
      (a, b) => b.sessions - a.sessions || b.visits - a.visits || a.label.localeCompare(b.label)
    )
    .slice(0, 5)

  return {
    sessionCount: sessions.length,
    breadcrumbCount,
    pageViewCount,
    interactionCount,
    hasEnoughData: sessions.length > 0 && pageViewCount >= 3,
    topPages: toCountList(pageCounts, 5),
    topTransitions: toTransitionList(transitionCounts, 5),
    backtracks: toTransitionList(backtrackCounts, 5),
    loops,
    interactionHotspots: toCountList(interactionCounts, 5),
    exitPages: toCountList(exitCounts, 5),
  }
}
