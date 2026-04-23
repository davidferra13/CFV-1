import { readFile } from 'node:fs/promises'
import path from 'node:path'

type CloverTaskStatus = 'done' | 'inProgress' | 'notStarted' | 'unknown'

export type CloverParitySectionProgress = {
  sectionId: string
  title: string
  done: number
  inProgress: number
  notStarted: number
  total: number
  completionPercent: number
}

export type CloverParityMvpItemProgress = {
  id: string
  status: CloverTaskStatus
}

export type CloverParityMvpProgress = {
  targetSegment: string | null
  done: number
  inProgress: number
  notStarted: number
  unknown: number
  total: number
  completionPercent: number
  items: CloverParityMvpItemProgress[]
}

export type CloverParityDashboard = {
  sections: CloverParitySectionProgress[]
  overall: {
    done: number
    inProgress: number
    notStarted: number
    total: number
    completionPercent: number
  }
  mvp: CloverParityMvpProgress
}

function computeCompletionPercent(input: { done: number; inProgress: number; total: number }) {
  if (input.total <= 0) return 0
  const weighted = input.done + input.inProgress * 0.5
  return Math.round((weighted / input.total) * 1000) / 10
}

function parseStatusMap(lines: string[]) {
  const map = new Map<string, 'x' | '~' | ' '>()

  for (const line of lines) {
    const match = line.match(/^- \[( |x|~)\]\s+`(CLV-[^`]+)`/)
    if (!match) continue
    map.set(match[2], match[1] as 'x' | '~' | ' ')
  }

  return map
}

function parseMvpContract(raw: string) {
  const lines = raw.split(/\r?\n/)
  const ids: string[] = []
  const seen = new Set<string>()
  let targetSegment: string | null = null

  for (const line of lines) {
    const segmentMatch = line.match(/^Target segment:\s*`?([^`]+)`?\s*$/i)
    if (segmentMatch) {
      targetSegment = segmentMatch[1].trim()
      continue
    }

    const idMatch = line.match(/^\s*-\s+`(CLV-[^`]+)`/)
    if (!idMatch) continue
    const id = idMatch[1]
    if (!seen.has(id)) {
      seen.add(id)
      ids.push(id)
    }
  }

  return { targetSegment, ids }
}

function buildMvpProgress(input: {
  ids: string[]
  targetSegment: string | null
  statusMap: Map<string, 'x' | '~' | ' '>
}): CloverParityMvpProgress {
  const result: CloverParityMvpProgress = {
    targetSegment: input.targetSegment,
    done: 0,
    inProgress: 0,
    notStarted: 0,
    unknown: 0,
    total: input.ids.length,
    completionPercent: 0,
    items: [],
  }

  for (const id of input.ids) {
    const marker = input.statusMap.get(id)
    let status: CloverTaskStatus

    if (marker === 'x') {
      status = 'done'
      result.done += 1
    } else if (marker === '~') {
      status = 'inProgress'
      result.inProgress += 1
    } else if (marker === ' ') {
      status = 'notStarted'
      result.notStarted += 1
    } else {
      status = 'unknown'
      result.unknown += 1
    }

    result.items.push({ id, status })
  }

  result.completionPercent = computeCompletionPercent({
    done: result.done,
    inProgress: result.inProgress,
    total: result.total,
  })

  return result
}

export async function getCloverParityDashboard(): Promise<CloverParityDashboard> {
  const parityPlanPath = path.join(process.cwd(), 'plans', 'clover-parity-master-todo.md')
  const mvpContractPath = path.join(process.cwd(), 'plans', 'clover-parity-mvp-contract.md')
  const [rawPlan, rawContract] = await Promise.all([
    readFile(parityPlanPath, 'utf8').catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return ''
      throw error
    }),
    readFile(mvpContractPath, 'utf8').catch(() => ''),
  ])
  const lines = rawPlan.split(/\r?\n/)

  const sections: CloverParitySectionProgress[] = []
  let current: CloverParitySectionProgress | null = null

  for (const line of lines) {
    const sectionMatch = line.match(/^##\s+(\d+)\)\s+(.+)$/)
    if (sectionMatch) {
      if (current && current.total > 0) {
        current.completionPercent = computeCompletionPercent({
          done: current.done,
          inProgress: current.inProgress,
          total: current.total,
        })
        sections.push(current)
      }

      current = {
        sectionId: sectionMatch[1],
        title: sectionMatch[2].trim(),
        done: 0,
        inProgress: 0,
        notStarted: 0,
        total: 0,
        completionPercent: 0,
      }
      continue
    }

    if (!current) continue

    // Count only CLV backlog items (skip acceptance gates and phase/meta rows).
    const taskMatch = line.match(/^- \[( |x|~)\]\s+`CLV-[^`]+`/)
    if (!taskMatch) continue

    const marker = taskMatch[1]
    if (marker === 'x') {
      current.done += 1
    } else if (marker === '~') {
      current.inProgress += 1
    } else {
      current.notStarted += 1
    }
    current.total += 1
  }

  if (current && current.total > 0) {
    current.completionPercent = computeCompletionPercent({
      done: current.done,
      inProgress: current.inProgress,
      total: current.total,
    })
    sections.push(current)
  }

  const overall = sections.reduce(
    (acc, section) => {
      acc.done += section.done
      acc.inProgress += section.inProgress
      acc.notStarted += section.notStarted
      acc.total += section.total
      return acc
    },
    { done: 0, inProgress: 0, notStarted: 0, total: 0, completionPercent: 0 }
  )
  overall.completionPercent = computeCompletionPercent(overall)

  const statusMap = parseStatusMap(lines)
  const parsedContract = parseMvpContract(rawContract)
  const mvp = buildMvpProgress({
    ids: parsedContract.ids,
    targetSegment: parsedContract.targetSegment,
    statusMap,
  })

  return { sections, overall, mvp }
}
