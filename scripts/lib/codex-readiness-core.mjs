const STATUS_KEYS = ['modified', 'added', 'deleted', 'renamed', 'untracked']

function emptyStatusCounts() {
  return Object.fromEntries(STATUS_KEYS.map((key) => [key, 0]))
}

function stripOuterQuotes(value) {
  const trimmed = String(value ?? '').trim()
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function comparePaths(left, right) {
  return left.localeCompare(right, 'en', { sensitivity: 'base' })
}

function classifyGitStatus(code) {
  if (code === '??') {
    return 'untracked'
  }

  if (code.includes('R')) {
    return 'renamed'
  }

  if (code.includes('D')) {
    return 'deleted'
  }

  if (code.includes('A') || code.includes('C')) {
    return 'added'
  }

  return 'modified'
}

function normalizeGitPath(rawPath) {
  const trimmed = String(rawPath ?? '').trim()
  const renameParts = trimmed.split(/\s+->\s+/)
  return stripOuterQuotes(renameParts[renameParts.length - 1])
}

function normalizeHeading(value) {
  return String(value ?? '')
    .replace(/#+\s*$/g, '')
    .replace(/\*\*/g, '')
    .trim()
}

function normalizeChecklistText(value) {
  return String(value ?? '').replace(/\*\*/g, '').trim()
}

function toProgressKey(label) {
  const words = String(label ?? '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

  return words
    .map((word, index) => {
      if (index === 0) {
        return word
      }

      return word.slice(0, 1).toUpperCase() + word.slice(1)
    })
    .join('')
}

function cleanProgressLabel(label) {
  return String(label ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word === 'ux') {
        return 'UX'
      }

      if (word === 'v1') {
        return 'V1'
      }

      return word.slice(0, 1).toUpperCase() + word.slice(1)
    })
    .join(' ')
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ''))]
}

function pick(source, keys) {
  for (const key of keys) {
    if (source && Object.prototype.hasOwnProperty.call(source, key)) {
      return source[key]
    }
  }

  return null
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function formatNullable(value) {
  if (value === null || value === undefined || value === '') {
    return 'none'
  }

  return String(value)
}

function formatProgress(progress) {
  return Object.values(asObject(progress)).map((entry) => {
    if (entry && typeof entry === 'object') {
      return `${entry.label}: ${entry.percent}%`
    }

    return String(entry)
  })
}

function commandInvocation(command) {
  if (typeof command === 'string') {
    return command
  }

  return command?.invocation ?? (command?.name ? `npm run ${command.name}` : '')
}

function commandBody(command) {
  if (typeof command === 'string') {
    return ''
  }

  return command?.command ?? ''
}

function countLines(markdown) {
  return String(markdown ?? '').split(/\r?\n/).length
}

export function parseGitStatusLines(lines) {
  const statusCounts = emptyStatusCounts()
  const entries = []

  for (const rawLine of lines ?? []) {
    const line = String(rawLine ?? '').replace(/\r$/g, '')
    if (!line.trim()) {
      continue
    }

    const code = line.slice(0, 2)
    const rawPath = line.length > 3 ? line.slice(3) : line.slice(2)
    const path = normalizeGitPath(rawPath)
    if (!path) {
      continue
    }

    const category = classifyGitStatus(code)
    statusCounts[category] += 1
    entries.push({ status: code, category, path })
  }

  return {
    statusCounts,
    changedPaths: unique(entries.map((entry) => entry.path)).sort(comparePaths),
    entries,
  }
}

export function extractUncheckedChecklistItems(markdown) {
  const lines = String(markdown ?? '').split(/\r?\n/)
  const headingStack = []
  const items = []

  lines.forEach((line, index) => {
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      headingStack[level - 1] = normalizeHeading(headingMatch[2])
      headingStack.length = level
      return
    }

    const checklistMatch = line.match(/^\s*[-*]\s+\[\s\]\s+(.+?)\s*$/i)
    if (!checklistMatch) {
      return
    }

    items.push({
      text: normalizeChecklistText(checklistMatch[1]),
      section: headingStack[headingStack.length - 1] ?? null,
      headingPath: headingStack.filter(Boolean),
      lineNumber: index + 1,
    })
  })

  return items
}

export function extractProgressBlock(markdown) {
  const progress = {}
  const lines = String(markdown ?? '').split(/\r?\n/)

  for (const line of lines) {
    const match = line.match(/^\s*([A-Z][A-Z0-9 &/-]+?)\s+\[[^\]]+\]\s+(\d{1,3})%\s*$/)
    if (!match) {
      continue
    }

    const rawLabel = match[1].trim().replace(/\s+/g, ' ')
    const key = toProgressKey(rawLabel)
    progress[key] = {
      label: cleanProgressLabel(rawLabel),
      percent: Number(match[2]),
    }
  }

  return progress
}

export function summarizeSyncStatus(syncJson) {
  const sync = asObject(syncJson)
  const summary = asObject(sync.summary)
  const summarySteps = Array.isArray(summary.steps) ? summary.steps : []
  const explicitFailedStepNames = Array.isArray(summary.failedStepNames)
    ? summary.failedStepNames
    : []
  const failedStepNames = unique([
    ...explicitFailedStepNames,
    ...summarySteps
      .filter((step) => asObject(step).status === 'failed')
      .map((step) => asObject(step).name),
  ])

  const status = pick(sync, ['status'])
  const lastSuccessAt = pick(sync, ['last_success_at', 'lastSuccessAt'])
  const result = {
    present: Object.keys(sync).length > 0,
    status,
    lastError: pick(sync, ['last_error', 'lastError']),
    lastSuccessAt,
    lastFailureAt: pick(sync, ['last_failure_at', 'lastFailureAt']),
    elapsedSeconds: pick(sync, ['last_elapsed_s', 'elapsedSeconds']),
    runId: pick(sync, ['run_id', 'runId']),
    summaryRunId: pick(summary, ['runId', 'run_id']),
    failedStepNames,
    attentionRequired: [],
  }

  if (String(status ?? '').toLowerCase() === 'failed') {
    result.attentionRequired.push('sync status is failed')
  }

  if (!lastSuccessAt) {
    result.attentionRequired.push('sync last success is missing')
  }

  return result
}

export function selectExistingPackageScripts(packageJson, desiredScripts) {
  const scripts = asObject(asObject(packageJson).scripts)

  return (desiredScripts ?? [])
    .filter((name) => typeof scripts[name] === 'string')
    .map((name) => ({
      name,
      invocation: `npm run ${name}`,
      command: scripts[name],
    }))
}

export function summarizeGitignoreNoise(gitignoreText) {
  const patterns = String(gitignoreText ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))

  const categories = [
    {
      category: 'Next build outputs',
      matches: (line) =>
        line.includes('.next') ||
        line === '/out/' ||
        line === '/build' ||
        line.startsWith('.next-'),
    },
    {
      category: 'Playwright outputs',
      matches: (line) =>
        line.includes('playwright') || line.includes('test-results') || line.startsWith('pw-'),
    },
    {
      category: 'logs',
      matches: (line) => line.includes('*.log') || line.endsWith('.log') || line.includes('-log'),
    },
    {
      category: 'backups',
      matches: (line) => line.toLowerCase().includes('backup') || line === 'backups/',
    },
    {
      category: 'screenshots',
      matches: (line) =>
        line.toLowerCase().includes('screenshot') || line === '*.png' || line.includes('*.png'),
    },
    {
      category: 'temp directories',
      matches: (line) =>
        line.toLowerCase().includes('tmp') ||
        line.toLowerCase().includes('temp') ||
        line.includes('.codex-temp'),
    },
    {
      category: 'Tauri build output',
      matches: (line) => line.includes('src-tauri/target') || line.includes('src-tauri/gen'),
    },
    {
      category: 'local data and private exports',
      matches: (line) =>
        line.includes('/storage/') ||
        line.includes('/data/email-references/') ||
        line.includes('davidfood') ||
        line.includes('mempalace') ||
        line.includes('credentials') ||
        line.includes('service-account') ||
        line.includes('*.mbox'),
    },
  ]

  return categories
    .map((category) => ({
      category: category.category,
      patterns: patterns.filter(category.matches).slice(0, 12),
    }))
    .filter((category) => category.patterns.length > 0)
}

export function buildMarkdownBrief(report) {
  const lines = []
  const productTruth = asObject(report?.productTruth)
  const launch = asObject(report?.launch)
  const workspace = asObject(report?.workspace)
  const operationalHealth = asObject(report?.operationalHealth)
  const sync = asObject(operationalHealth.sync)
  const liveOpsGuardian = asObject(operationalHealth.liveOpsGuardian)
  const recommendation = asObject(report?.recommendation)
  const warnings = Array.isArray(report?.warnings) ? report.warnings : []
  const artifactNoise = Array.isArray(report?.artifactNoise) ? report.artifactNoise : []
  const verificationCommands = Array.isArray(report?.verificationCommands)
    ? report.verificationCommands
    : []
  const uncheckedItems = Array.isArray(launch.uncheckedItems) ? launch.uncheckedItems : []
  const changedPathsSample = Array.isArray(workspace.changedPathsSample)
    ? workspace.changedPathsSample
    : []
  const statusCounts = {
    ...emptyStatusCounts(),
    ...asObject(workspace.statusCounts),
  }
  const attentionRequired = Array.isArray(operationalHealth.attentionRequired)
    ? operationalHealth.attentionRequired
    : []

  lines.push('## Product Truth')
  lines.push(`- Generated at: ${formatNullable(report?.generatedAt)}`)
  lines.push(`- Source: ${formatNullable(productTruth.source)}`)
  lines.push('- ChefFlow is operator-first: true.')
  lines.push('- Canonical center: the authenticated operator workspace.')
  lines.push(
    '- Supporting surfaces: public discovery, client portal, staff, partner, admin, and API surfaces support the operator system.'
  )
  lines.push(
    '- Internal-only: this Codex Readiness Pack is local developer tooling and does not add user-facing OpenAI, ChatGPT, or cloud AI features.'
  )
  lines.push('')

  lines.push('## Launch Blockers')
  lines.push('- Source: docs/product-blueprint.md')
  const progressLines = formatProgress(launch.progress)
  if (progressLines.length > 0) {
    lines.push('- Progress snapshot:')
    for (const item of progressLines) {
      lines.push(`  - ${item}`)
    }
  } else {
    lines.push('- Progress snapshot: unavailable')
  }
  if (uncheckedItems.length > 0) {
    lines.push('- Unchecked V1 launch items:')
    for (const item of uncheckedItems) {
      const evidence = item.lineNumber ? `docs/product-blueprint.md:${item.lineNumber}` : ''
      const section = item.section ? `; ${item.section}` : ''
      lines.push(`  - ${item.text}${evidence ? ` (${evidence}${section})` : ''}`)
    }
  } else {
    lines.push('- Unchecked V1 launch items: none found')
  }
  lines.push('')

  lines.push('## Workspace State')
  lines.push(`- Branch: ${formatNullable(workspace.branch)}`)
  lines.push(
    `- Git status counts: modified ${statusCounts.modified}, added ${statusCounts.added}, deleted ${statusCounts.deleted}, renamed ${statusCounts.renamed}, untracked ${statusCounts.untracked}`
  )
  if (changedPathsSample.length > 0) {
    lines.push('- First changed paths, sorted by path:')
    for (const path of changedPathsSample) {
      lines.push(`  - ${path}`)
    }
  } else {
    lines.push('- First changed paths, sorted by path: none')
  }
  lines.push(`- Changed paths remaining after sample: ${workspace.changedPathsRemaining ?? 0}`)
  lines.push('')

  lines.push('## Operational Health')
  lines.push('- Sync status from docs/sync-status.json:')
  lines.push(`  - Status: ${formatNullable(sync.status)}`)
  lines.push(`  - Last error: ${formatNullable(sync.lastError)}`)
  lines.push(`  - Last success: ${formatNullable(sync.lastSuccessAt)}`)
  lines.push(`  - Last failure: ${formatNullable(sync.lastFailureAt)}`)
  lines.push(`  - Elapsed seconds: ${formatNullable(sync.elapsedSeconds)}`)
  lines.push(`  - Run id: ${formatNullable(sync.runId)}`)
  const failedStepNames = Array.isArray(sync.failedStepNames) ? sync.failedStepNames : []
  if (failedStepNames.length > 0) {
    lines.push('  - Failed steps:')
    for (const stepName of failedStepNames) {
      lines.push(`    - ${stepName}`)
    }
  } else {
    lines.push('  - Failed steps: none reported')
  }
  lines.push('- Live ops guardian from logs/live-ops-guardian-latest.json:')
  lines.push(`  - Run id: ${formatNullable(liveOpsGuardian.runId)}`)
  lines.push(`  - Run time: ${formatNullable(liveOpsGuardian.ranAt)}`)
  lines.push(`  - Changed path count: ${formatNullable(liveOpsGuardian.changedPathCount)}`)
  lines.push(`  - New changes detected: ${formatNullable(liveOpsGuardian.newChangesDetected)}`)
  if (attentionRequired.length > 0) {
    lines.push('- Attention required:')
    for (const item of attentionRequired) {
      lines.push(`  - ${item}`)
    }
  } else {
    lines.push('- Attention required: none')
  }
  lines.push('')

  lines.push('## Verification Commands')
  if (verificationCommands.length > 0) {
    for (const command of verificationCommands) {
      const body = commandBody(command)
      lines.push(`- ${commandInvocation(command)}${body ? ` -> ${body}` : ''}`)
    }
  } else {
    lines.push('- No preferred verification commands found in package.json')
  }
  lines.push('')

  lines.push('## Artifact Noise')
  lines.push('- Warning: this command reports ignored/generated categories but does not clean them.')
  if (artifactNoise.length > 0) {
    for (const item of artifactNoise) {
      const patterns = Array.isArray(item.patterns) ? item.patterns : []
      lines.push(`- ${item.category}:`)
      if (patterns.length > 0) {
        for (const pattern of patterns) {
          lines.push(`  - ${pattern}`)
        }
      } else {
        lines.push('  - no matching patterns found')
      }
    }
  } else {
    lines.push('- No matching ignored/generated categories found in .gitignore')
  }
  lines.push('')

  lines.push('## Recommended Next Agent Task')
  lines.push(`- Title: ${formatNullable(recommendation.title)}`)
  lines.push(`- Rationale: ${formatNullable(recommendation.rationale)}`)
  const evidence = Array.isArray(recommendation.evidence) ? recommendation.evidence : []
  if (evidence.length > 0) {
    lines.push('- Evidence:')
    for (const item of evidence) {
      lines.push(`  - ${item}`)
    }
  } else {
    lines.push('- Evidence: none')
  }

  if (warnings.length > 0) {
    lines.push('')
    lines.push('Warnings:')
    for (const warning of warnings) {
      lines.push(`- ${warning}`)
    }
  }

  const markdown = `${lines.join('\n')}\n`
  if (countLines(markdown) > 250) {
    return `${lines.slice(0, 245).join('\n')}\n- Brief truncated to stay under 250 lines.\n`
  }

  return markdown
}
