import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

function pct(n, total) {
  if (total === 0) return 0
  return Math.round((n / total) * 100)
}

function stripDocsExt(filePath) {
  return filePath.replace(/^docs\//, '').replace(/\.md$/, '')
}

function main() {
  const registryPath = path.join(ROOT, 'saturation-tracking', 'registry.json')

  if (!fs.existsSync(registryPath)) {
    console.error('Run populate.mjs first: node devtools/saturation/populate.mjs')
    process.exit(1)
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
  const { specs, audits, personas, sessions, file_heatmap } = registry

  const lines = []

  lines.push('# Saturation Report')
  lines.push('')
  lines.push(`> Generated: ${registry.generated_at}`)
  lines.push('> Run: `node devtools/saturation/populate.mjs && node devtools/saturation/report.mjs`')
  lines.push('')
  lines.push('---')
  lines.push('')

  // Spec Coverage
  lines.push(`## Spec Coverage (${specs.total} specs)`)
  lines.push('')
  lines.push('| Status      | Count | %      |')
  lines.push('| ----------- | ----- | ------ |')
  for (const status of ['verified', 'built', 'in-progress', 'ready', 'draft', 'unknown']) {
    const count = specs.by_status[status] || 0
    lines.push(`| ${status.padEnd(11)} | ${String(count).padEnd(5)} | ${String(pct(count, specs.total)).padEnd(4)}%  |`)
  }
  lines.push('')

  const verifiedCount = specs.by_status['verified'] || 0
  const readyCount = specs.by_status['ready'] || 0
  const draftCount = specs.by_status['draft'] || 0

  lines.push(`**Completion rate:** ${verifiedCount}/${specs.total} verified (${pct(verifiedCount, specs.total)}%)`)
  lines.push(`**Ready to build:** ${readyCount} specs waiting for a builder agent`)
  lines.push('')

  if (readyCount > 20) {
    lines.push('Bottleneck: too many specs queued as ready. Prioritize building over speccing.')
    lines.push('')
  }
  if (specs.total > 0 && draftCount > specs.total / 2) {
    lines.push('Most specs still in draft. Focus on moving drafts to ready, or pruning dead drafts.')
    lines.push('')
  }

  lines.push('---')
  lines.push('')

  // Audit Freshness
  lines.push(`## Audit Freshness (${audits.total} audits)`)
  lines.push('')
  lines.push('| Audit | Last Run | Changed Files | Decay |')
  lines.push('| ----- | -------- | ------------- | ----- |')
  for (const audit of audits.items) {
    const name = stripDocsExt(audit.file)
    const decayLabel = audit.decay === 'stale' ? 'STALE' : audit.decay
    lines.push(`| ${name} | ${audit.date} | ${audit.files_changed_since} | ${decayLabel} |`)
  }
  lines.push('')
  lines.push(`**Fresh:** ${audits.fresh} | **Aging:** ${audits.aging} | **Stale:** ${audits.stale}`)
  lines.push('')

  if (audits.stale > 0) {
    const staleNames = audits.items
      .filter((a) => a.decay === 'stale')
      .map((a) => stripDocsExt(a.file))
      .join(', ')
    lines.push(`Action needed: re-run stale audits: ${staleNames}`)
    lines.push('')
  }

  lines.push('---')
  lines.push('')

  // Persona Test Saturation
  lines.push('## Persona Test Saturation')
  lines.push('')
  lines.push('| Metric               | Value                |')
  lines.push('| -------------------- | -------------------- |')
  lines.push(`| Formally tested      | ${personas.tested}             |`)
  lines.push(`| Defined              | ${personas.defined}            |`)
  lines.push(`| Research cataloged   | ${personas.research_cataloged} |`)
  lines.push(`| Unique gaps found    | ${personas.unique_gaps}        |`)
  lines.push(`| **Saturation level** | **${personas.saturation}**     |`)
  lines.push('')

  if (personas.saturation === 'LOW') {
    lines.push('Coverage is thin. Run more persona stress tests before shipping.')
    lines.push('')
  } else if (personas.saturation === 'MEDIUM') {
    lines.push('Making progress. Prioritize untested persona types (see REGISTRY.md heat map).')
    lines.push('')
  } else if (personas.saturation === 'HIGH' || personas.saturation === 'SATURATED') {
    lines.push('Good coverage. Shift to depth work on known gaps.')
    lines.push('')
  }

  lines.push('---')
  lines.push('')

  // Session Topic Frequency
  lines.push(`## Session Topic Frequency (from ${sessions.total} digests)`)
  lines.push('')
  if (sessions.date_range.earliest && sessions.date_range.latest) {
    lines.push(`_Date range: ${sessions.date_range.earliest} to ${sessions.date_range.latest}_`)
    lines.push('')
  }
  lines.push('| Topic | Mentions |')
  lines.push('| ----- | -------- |')
  for (const topic of sessions.top_topics) {
    lines.push(`| ${topic.word} | ${topic.count} |`)
  }
  lines.push('')

  const heavyTopics = sessions.top_topics.filter((t) => t.count > 15)
  for (const t of heavyTopics) {
    lines.push(`Heavy concentration on '${t.word}'. Check if progress is proportional to attention.`)
  }
  if (heavyTopics.length > 0) lines.push('')

  lines.push('---')
  lines.push('')

  // File Attention Heatmap
  lines.push('## File Attention Heatmap (Last 30 Days)')
  lines.push('')
  lines.push('| File | Commits |')
  lines.push('| ---- | ------- |')
  for (const entry of file_heatmap) {
    lines.push(`| ${entry.file} | ${entry.commits} |`)
  }
  lines.push('')

  const thrashing = file_heatmap.filter((e) => e.commits > 30)
  for (const t of thrashing) {
    lines.push(`Thrashing risk: ${t.file} has ${t.commits} commits in 30 days. Investigate stability.`)
  }

  if (file_heatmap.length >= 5 && file_heatmap[0].commits > file_heatmap[4].commits * 3) {
    lines.push('Attention is concentrated. Check if neglected files need review.')
  }

  if (thrashing.length > 0 || (file_heatmap.length >= 5 && file_heatmap[0].commits > file_heatmap[4].commits * 3)) {
    lines.push('')
  }

  lines.push('---')
  lines.push('')

  // Quick Summary
  lines.push('## Quick Summary')
  lines.push('')
  lines.push(`- **Specs:** ${verifiedCount}/${specs.total} verified (${pct(verifiedCount, specs.total)}%), ${readyCount} ready to build`)
  lines.push(`- **Audits:** ${audits.stale} stale (need re-run)`)
  lines.push(`- **Personas:** ${personas.saturation} saturation (${personas.tested} tested)`)

  const topTopic = sessions.top_topics[0]
  if (topTopic) {
    lines.push(`- **Sessions:** ${sessions.total} digests, top topic: ${topTopic.word} (${topTopic.count})`)
  } else {
    lines.push(`- **Sessions:** ${sessions.total} digests`)
  }

  if (file_heatmap.length > 0) {
    lines.push(`- **Hottest file:** ${file_heatmap[0].file} (${file_heatmap[0].commits} commits/30d)`)
  }
  lines.push('')

  const outPath = path.join(ROOT, 'saturation-tracking', 'REPORT.md')
  fs.writeFileSync(outPath, lines.join('\n'))
  console.log('Report written to saturation-tracking/REPORT.md')
}

main()
