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

export type DesirePathRecommendation = {
  id: string
  title: string
  detail: string
  href: string
  priority: 'high' | 'medium' | 'low'
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
  recommendations: DesirePathRecommendation[]
}

type PageView = BreadcrumbEntry & {
  label: string
}

type LabelCounts = Map<string, Map<string, number>>

function increment(map: Map<string, number>, key: string, by = 1): void {
  map.set(key, (map.get(key) || 0) + by)
}

function incrementLabel(labelsByPath: LabelCounts, path: string, label: string): void {
  const labelCounts = labelsByPath.get(path) || new Map<string, number>()
  increment(labelCounts, label)
  labelsByPath.set(path, labelCounts)
}

function preferredLabel(path: string, labelsByPath: LabelCounts): string {
  const labelCounts = labelsByPath.get(path)
  if (!labelCounts || labelCounts.size === 0) return labelForPath(path)

  const [topLabel] = [...labelCounts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  )[0]
  return topLabel || labelForPath(path)
}

function toCountList(
  map: Map<string, number>,
  labelsByPath: LabelCounts,
  limit: number
): DesirePathCount[] {
  return [...map.entries()]
    .map(([path, count]) => ({
      path,
      label: preferredLabel(path, labelsByPath),
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

function toTransitionList(
  map: Map<string, number>,
  labelsByPath: LabelCounts,
  limit: number
): DesirePathTransition[] {
  return [...map.entries()]
    .map(([key, count]) => {
      const { fromPath, toPath } = parseTransitionKey(key)
      return {
        fromPath,
        fromLabel: preferredLabel(fromPath, labelsByPath),
        toPath,
        toLabel: preferredLabel(toPath, labelsByPath),
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

function buildRecommendations(input: {
  backtracks: DesirePathTransition[]
  loops: DesirePathLoop[]
  interactionHotspots: DesirePathCount[]
  exitPages: DesirePathCount[]
}): DesirePathRecommendation[] {
  const recommendations: DesirePathRecommendation[] = []
  const topBacktrack = input.backtracks[0]
  const topLoop = input.loops[0]
  const topInteraction = input.interactionHotspots[0]
  const topExit = input.exitPages[0]

  if (topBacktrack) {
    recommendations.push({
      id: `backtrack:${topBacktrack.fromPath}:${topBacktrack.toPath}`,
      title: 'Review this reversal',
      detail: `${topBacktrack.fromLabel} repeatedly returns to ${topBacktrack.toLabel}. Check whether the first page needs a clearer next action or context from the destination.`,
      href: topBacktrack.fromPath,
      priority: 'high',
    })
  }

  if (topLoop) {
    recommendations.push({
      id: `loop:${topLoop.path}`,
      title: 'Tighten this work surface',
      detail: `${topLoop.label} is revisited several times inside the same session. Look for missing summaries, filters, or inline actions that would reduce repeat trips.`,
      href: topLoop.path,
      priority: topLoop.sessions > 1 ? 'high' : 'medium',
    })
  }

  if (topInteraction) {
    recommendations.push({
      id: `interaction:${topInteraction.path}`,
      title: 'Audit the main action path',
      detail: `${topInteraction.label} has the most recorded clicks, searches, forms, or tab switches. Confirm the action result and next step are obvious after each interaction.`,
      href: topInteraction.path,
      priority: 'medium',
    })
  }

  if (topExit) {
    recommendations.push({
      id: `exit:${topExit.path}`,
      title: 'Check the stop point',
      detail: `${topExit.label} is a common last page in sessions. Confirm it leaves the chef with a clear saved state or next action.`,
      href: topExit.path,
      priority: 'low',
    })
  }

  const seen = new Set<string>()
  return recommendations
    .filter((recommendation) => {
      if (seen.has(recommendation.id)) return false
      seen.add(recommendation.id)
      return true
    })
    .slice(0, 4)
}

export function analyzeDesirePaths(sessions: BreadcrumbSession[]): DesirePathInsights {
  const pageCounts = new Map<string, number>()
  const transitionCounts = new Map<string, number>()
  const backtrackCounts = new Map<string, number>()
  const loopSessions = new Map<string, number>()
  const loopVisits = new Map<string, number>()
  const interactionCounts = new Map<string, number>()
  const exitCounts = new Map<string, number>()
  const labelsByPath: LabelCounts = new Map()

  let breadcrumbCount = 0
  let pageViewCount = 0
  let interactionCount = 0

  for (const session of sessions) {
    breadcrumbCount += session.breadcrumbs.length

    for (const entry of session.breadcrumbs) {
      if (entry.breadcrumb_type === 'page_view') {
        pageViewCount++
        increment(pageCounts, entry.path)
        incrementLabel(labelsByPath, entry.path, entry.label || labelForPath(entry.path))
      } else {
        interactionCount++
        increment(interactionCounts, entry.path)
        incrementLabel(labelsByPath, entry.path, labelForPath(entry.path))
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
      label: preferredLabel(path, labelsByPath),
      sessions: sessionCount,
      visits: loopVisits.get(path) || sessionCount,
    }))
    .sort(
      (a, b) => b.sessions - a.sessions || b.visits - a.visits || a.label.localeCompare(b.label)
    )
    .slice(0, 5)

  const backtracks = toTransitionList(backtrackCounts, labelsByPath, 5)
  const interactionHotspots = toCountList(interactionCounts, labelsByPath, 5)
  const exitPages = toCountList(exitCounts, labelsByPath, 5)

  return {
    sessionCount: sessions.length,
    breadcrumbCount,
    pageViewCount,
    interactionCount,
    hasEnoughData: sessions.length > 0 && pageViewCount >= 3,
    topPages: toCountList(pageCounts, labelsByPath, 5),
    topTransitions: toTransitionList(transitionCounts, labelsByPath, 5),
    backtracks,
    loops,
    interactionHotspots,
    exitPages,
    recommendations: buildRecommendations({
      backtracks,
      loops,
      interactionHotspots,
      exitPages,
    }),
  }
}
