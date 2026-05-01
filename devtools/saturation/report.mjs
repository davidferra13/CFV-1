import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const REGISTRY_PATH = path.join(ROOT, 'saturation-tracking', 'registry.json')
const REPORT_PATH = path.join(ROOT, 'saturation-tracking', 'REPORT.md')

function percent(count, total) {
  if (!total) return 0
  return Math.round((count / total) * 100)
}

function row(cells) {
  return `| ${cells.join(' | ')} |`
}

function auditName(file) {
  return file.replace(/^docs\//, '').replace(/\.md$/, '')
}

function tableOrEmpty(items, renderRow, emptyMessage) {
  if (!items.length) return `${emptyMessage}\n`
  return `${items.map(renderRow).join('\n')}\n`
}

function buildSpecSection(specs) {
  const statuses = ['verified', 'built', 'in-progress', 'ready', 'draft', 'unknown']
  const lines = [
    `## Spec Coverage (${specs.total} specs)`,
    '',
    '| Status      | Count | %      |',
    '| ----------- | ----- | ------ |',
    ...statuses.map((status) =>
      row([status, String(specs.by_status[status] ?? 0), `${percent(specs.by_status[status] ?? 0, specs.total)}%`])
    ),
    '',
    `**Completion rate:** ${specs.by_status.verified ?? 0}/${specs.total} verified (${percent(
      specs.by_status.verified ?? 0,
      specs.total
    )}%)`,
    `**Ready to build:** ${specs.by_status.ready ?? 0} specs waiting for a builder agent`,
  ]

  if ((specs.by_status.ready ?? 0) > 20) {
    lines.push('', 'Bottleneck: too many specs queued as ready. Prioritize building over speccing.')
  }

  if ((specs.by_status.draft ?? 0) > specs.total / 2) {
    lines.push('', 'Most specs still in draft. Focus on moving drafts to ready, or pruning dead drafts.')
  }

  return `${lines.join('\n')}\n`
}

function buildAuditSection(audits) {
  const staleAudits = audits.items.filter((item) => item.decay === 'stale')
  const lines = [
    `## Audit Freshness (${audits.total} audits)`,
    '',
    '| Audit | Last Run | Changed Files | Decay |',
    '| ----- | -------- | ------------- | ----- |',
    tableOrEmpty(
      audits.items,
      (item) =>
        row([
          auditName(item.file),
          item.date,
          String(item.files_changed_since),
          item.decay === 'stale' ? 'STALE' : item.decay,
        ]),
      '| No audits found | n/a | 0 | n/a |'
    ).trimEnd(),
    '',
    `**Fresh:** ${audits.fresh} | **Aging:** ${audits.aging} | **Stale:** ${audits.stale}`,
  ]

  if (staleAudits.length > 0) {
    lines.push(
      '',
      `Action needed: re-run stale audits: ${staleAudits.map((item) => auditName(item.file)).join(', ')}`
    )
  }

  return `${lines.join('\n')}\n`
}

function buildPersonaSection(personas) {
  const lines = [
    '## Persona Test Saturation',
    '',
    '| Metric               | Value                |',
    '| -------------------- | -------------------- |',
    row(['Formally tested', String(personas.tested)]),
    row(['Defined', String(personas.defined)]),
    row(['Research cataloged', String(personas.research_cataloged)]),
    row(['Unique gaps found', String(personas.unique_gaps)]),
    row(['**Saturation level**', `**${personas.saturation}**`]),
  ]

  if (personas.saturation === 'LOW') {
    lines.push('', 'Coverage is thin. Run more persona stress tests before shipping.')
  }

  if (personas.saturation === 'MEDIUM') {
    lines.push('', 'Making progress. Prioritize untested persona types, see REGISTRY.md heat map.')
  }

  if (personas.saturation === 'HIGH' || personas.saturation === 'SATURATED') {
    lines.push('', 'Good coverage. Shift to depth work on known gaps.')
  }

  return `${lines.join('\n')}\n`
}

function buildSessionSection(sessions) {
  const heavyTopic = sessions.top_topics.find((topic) => topic.count > 15)
  const lines = [
    `## Session Topic Frequency (from ${sessions.total} digests)`,
    '',
    `_Date range: ${sessions.date_range.earliest ?? 'n/a'} to ${sessions.date_range.latest ?? 'n/a'}_`,
    '',
    '| Topic | Mentions |',
    '| ----- | -------- |',
    tableOrEmpty(
      sessions.top_topics,
      (topic) => row([topic.word, String(topic.count)]),
      '| No topics found | 0 |'
    ).trimEnd(),
  ]

  if (heavyTopic) {
    lines.push('', `Heavy concentration on '${heavyTopic.word}'. Check if progress is proportional to attention.`)
  }

  return `${lines.join('\n')}\n`
}

function buildHeatmapSection(fileHeatmap) {
  const topFile = fileHeatmap[0]
  const fifthFile = fileHeatmap[4]
  const lines = [
    '## File Attention Heatmap (Last 30 Days)',
    '',
    '| File | Commits |',
    '| ---- | ------- |',
    tableOrEmpty(
      fileHeatmap,
      (item) => row([item.file, String(item.commits)]),
      '| No files found | 0 |'
    ).trimEnd(),
  ]

  if (topFile && topFile.commits > 30) {
    lines.push('', `Thrashing risk: ${topFile.file} has ${topFile.commits} commits in 30 days. Investigate stability.`)
  }

  if (topFile && fifthFile && topFile.commits > fifthFile.commits * 3) {
    lines.push('', 'Attention is concentrated. Check if neglected files need review.')
  }

  return `${lines.join('\n')}\n`
}

function buildSummary(registry) {
  const verified = registry.specs.by_status.verified ?? 0
  const ready = registry.specs.by_status.ready ?? 0
  const topTopic = registry.sessions.top_topics[0]
  const topFile = registry.file_heatmap[0]

  return [
    '## Quick Summary',
    '',
    `- **Specs:** ${verified}/${registry.specs.total} verified (${percent(
      verified,
      registry.specs.total
    )}%), ${ready} ready to build`,
    `- **Audits:** ${registry.audits.stale} stale, need re-run`,
    `- **Personas:** ${registry.personas.saturation} saturation (${registry.personas.tested} tested)`,
    `- **Sessions:** ${registry.sessions.total} digests, top topic: ${
      topTopic ? `${topTopic.word} (${topTopic.count})` : 'n/a'
    }`,
    `- **Hottest file:** ${topFile ? `${topFile.file} (${topFile.commits} commits/30d)` : 'n/a'}`,
    '',
  ].join('\n')
}

function buildReport(registry) {
  return [
    '# Saturation Report',
    '',
    `> Generated: ${registry.generated_at}`,
    '> Run: `node devtools/saturation/populate.mjs && node devtools/saturation/report.mjs`',
    '',
    '---',
    '',
    buildSpecSection(registry.specs),
    '---',
    '',
    buildAuditSection(registry.audits),
    '---',
    '',
    buildPersonaSection(registry.personas),
    '---',
    '',
    buildSessionSection(registry.sessions),
    '---',
    '',
    buildHeatmapSection(registry.file_heatmap),
    '---',
    '',
    buildSummary(registry),
  ].join('\n')
}

function main() {
  if (!existsSync(REGISTRY_PATH)) {
    console.error('Run populate.mjs first: node devtools/saturation/populate.mjs')
    process.exit(1)
  }

  const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8'))
  const report = buildReport(registry)
  writeFileSync(REPORT_PATH, report)

  console.log('Report written to saturation-tracking/REPORT.md')
}

main()
