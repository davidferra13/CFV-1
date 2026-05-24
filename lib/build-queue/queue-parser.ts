import fs from 'fs'
import path from 'path'
import type { BuildQueueItem, BuildQueueCategory, BuildQueueStatus } from './queue-types'
import { BUILD_QUEUE_STATUSES } from './queue-types'

const QUEUE_PATH = path.join(process.cwd(), 'docs', 'UNIFIED-BUILD-QUEUE.md')

/**
 * Parse the UNIFIED-BUILD-QUEUE.md markdown file into typed objects.
 * Handles the repeated pattern of: ## CATEGORY (N items) followed by a markdown table.
 */
export function parseQueueFile(): BuildQueueCategory[] {
  const content = fs.readFileSync(QUEUE_PATH, 'utf-8')
  const lines = content.split('\n')

  const categories: BuildQueueCategory[] = []
  let currentCategory: string | null = null
  let inTable = false
  let headerSeen = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Detect category headers: ## CATEGORY NAME (N items)
    const categoryMatch = trimmed.match(/^## (.+?)(?:\s*\(\d+ items?\))?$/)
    if (categoryMatch) {
      const name = categoryMatch[1].trim()
      currentCategory = name
      inTable = false
      headerSeen = false
      continue
    }

    // Detect table header row (starts with | # or | --- )
    if (trimmed.startsWith('| #') || trimmed.startsWith('| ---')) {
      if (currentCategory && trimmed.startsWith('| #')) {
        headerSeen = true
        inTable = false
      } else if (headerSeen && trimmed.startsWith('| ---')) {
        inTable = true
      }
      continue
    }

    // Parse table data rows
    if (inTable && trimmed.startsWith('|') && currentCategory) {
      const item = parseTableRow(trimmed, currentCategory)
      if (item) {
        let cat = categories.find((c) => c.name === currentCategory)
        if (!cat) {
          cat = { name: currentCategory, itemCount: 0, items: [] }
          categories.push(cat)
        }
        cat.items.push(item)
        cat.itemCount = cat.items.length
      }
      continue
    }

    // A horizontal rule or empty line after a table ends the table
    if (trimmed === '---' || trimmed === '') {
      if (inTable) {
        inTable = false
        headerSeen = false
      }
    }
  }

  return categories
}

function parseTableRow(line: string, category: string): BuildQueueItem | null {
  // Split by | and trim; first and last are empty from leading/trailing |
  const cells = line
    .split('|')
    .map((c) => c.trim())
    .filter((_, i, arr) => i > 0 && i < arr.length - 1)

  if (cells.length < 4) return null

  const idStr = cells[0]
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return null

  const title = cells[1] || ''
  const rawStatus = (cells[2] || '').toUpperCase().trim() as BuildQueueStatus
  const dependsOnRaw = cells[3] || ''
  const notes = cells[4] || ''

  // Validate status; default to UNSPECCED if unrecognized
  const status: BuildQueueStatus = BUILD_QUEUE_STATUSES.includes(rawStatus)
    ? rawStatus
    : 'UNSPECCED'

  // Parse depends-on: handles "None", "#1", "#1, #3", or full item names separated by ;
  const dependsOn = parseDependsOn(dependsOnRaw)

  return { id, category, title, status, dependsOn, notes }
}

function parseDependsOn(raw: string): string[] {
  if (!raw || raw.toLowerCase() === 'none') return []

  // Split on semicolons first (for full item names), then commas
  const parts = raw
    .split(/[;]/)
    .flatMap((s) => s.split(/,(?![^(]*\))/))
    .map((s) => s.trim())
    .filter(Boolean)

  return parts
}

/**
 * Get all items flattened across categories.
 */
export function getAllItems(): BuildQueueItem[] {
  return parseQueueFile().flatMap((c) => c.items)
}
