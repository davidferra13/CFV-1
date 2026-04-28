export type BuildQueueFrontmatter = {
  status?: string
  priority?: string
  category?: string
  source?: string
  confidence?: string
  title?: string
}

export type BuildQueueItem = {
  status: string
  priority: string
  category: string
  source: string
  confidence: string
  title: string
  path: string
}

export type BuildQueueStatusSummary = {
  total: number
  pending: number
  inProgress: number
  built: number
  other: number
}

type ParsedFrontmatter = {
  data: BuildQueueFrontmatter
  body: string
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
const DEFAULT_STATUS = 'pending'

export function parseBuildQueueFrontmatter(content: string): ParsedFrontmatter {
  const text = String(content || '').replace(/^\uFEFF/, '')
  const match = text.match(FRONTMATTER_PATTERN)

  if (!match) {
    return { data: {}, body: text }
  }

  const data: BuildQueueFrontmatter = {}

  for (const line of match[1].split(/\r?\n/)) {
    const parts = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!parts) continue

    const key = parts[1] as keyof BuildQueueFrontmatter
    const raw = parts[2].trim()
    data[key] = raw.replace(/^"|"$/g, '').replace(/\\"/g, '"').replace(/\\\\/g, '\\')
  }

  return { data, body: text.slice(match[0].length) }
}

export function parseBuildQueueMarkdown(path: string, content: string): BuildQueueItem {
  const parsed = parseBuildQueueFrontmatter(content)
  const title = parsed.data.title || extractTitle(parsed.body) || filenameWithoutExtension(path)

  return {
    status: normalizeStatus(parsed.data.status),
    priority: parsed.data.priority || 'medium',
    category: parsed.data.category || '',
    source: parsed.data.source || '',
    confidence: parsed.data.confidence || '',
    title,
    path,
  }
}

export function summarizeBuildQueueStatuses(
  items: Array<Pick<BuildQueueItem, 'status'> | { status?: string }>
): BuildQueueStatusSummary {
  const summary: BuildQueueStatusSummary = {
    total: items.length,
    pending: 0,
    inProgress: 0,
    built: 0,
    other: 0,
  }

  for (const item of items) {
    const status = normalizeStatus(item.status)

    if (status === 'pending') {
      summary.pending += 1
    } else if (status === 'in-progress') {
      summary.inProgress += 1
    } else if (status === 'built') {
      summary.built += 1
    } else {
      summary.other += 1
    }
  }

  return summary
}

function normalizeStatus(status: string | undefined): string {
  const normalized = String(status || DEFAULT_STATUS)
    .trim()
    .toLowerCase()

  if (['in-progress', 'in_progress', 'in progress', 'inprogress'].includes(normalized)) {
    return 'in-progress'
  }

  return normalized || DEFAULT_STATUS
}

function extractTitle(body: string): string {
  return (body.match(/^#\s+(.+)$/m) || [])[1] || ''
}

function filenameWithoutExtension(path: string): string {
  const filename = path.split(/[\\/]/).pop() || path
  return filename.replace(/\.md$/i, '')
}
