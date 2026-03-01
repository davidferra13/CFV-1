// Summarize all overnight eval reports
// Usage: node scripts/remy-eval/summarize-overnight.mjs

import fs from 'fs'
import path from 'path'

const reportsDir = path.join(import.meta.dirname, 'reports')
const files = fs.readdirSync(reportsDir)
  .filter(f => f.startsWith('eval-') && f.endsWith('.json'))
  .sort()
  .slice(-10) // last 10 reports

if (files.length === 0) {
  console.log('No reports found in', reportsDir)
  process.exit(0)
}

console.log('╔══════════════════════════════════════════════════════════╗')
console.log('║           Remy Eval — Overnight Summary                 ║')
console.log('╠══════════════════════════════════════════════════════════╣')
console.log(`║  Reports found: ${files.length.toString().padEnd(40)}║`)
console.log('╚══════════════════════════════════════════════════════════╝\n')

// Track per-test pass rates across runs
const testStats = {}
const runSummaries = []

for (const file of files) {
  const report = JSON.parse(fs.readFileSync(path.join(reportsDir, file), 'utf8'))
  const passed = report.results.filter(t => t.passed).length
  const total = report.results.length
  const ts = file.match(/eval-(\d+)/)?.[1]
  const date = ts ? new Date(parseInt(ts)).toLocaleString() : file

  runSummaries.push({ file, passed, total, date })

  for (const test of report.results) {
    if (!testStats[test.testId]) {
      testStats[test.testId] = { passes: 0, fails: 0, scores: [], category: test.category }
    }
    if (test.passed) {
      testStats[test.testId].passes++
    } else {
      testStats[test.testId].fails++
    }
    if (test.llmScore?.overall) {
      testStats[test.testId].scores.push(test.llmScore.overall)
    }
  }
}

// Print run summaries
console.log('── Run Results ──────────────────────────────────────────\n')
for (const run of runSummaries) {
  const pct = ((run.passed / run.total) * 100).toFixed(1)
  const bar = '█'.repeat(Math.round(run.passed / run.total * 20)) + '░'.repeat(20 - Math.round(run.passed / run.total * 20))
  console.log(`  ${run.date}  ${bar}  ${run.passed}/${run.total} (${pct}%)`)
}

// Print per-test reliability
console.log('\n── Test Reliability (across all runs) ───────────────────\n')

const sorted = Object.entries(testStats).sort((a, b) => {
  const aRate = a[1].passes / (a[1].passes + a[1].fails)
  const bRate = b[1].passes / (b[1].passes + b[1].fails)
  return aRate - bRate
})

// Always-failing tests
const alwaysFail = sorted.filter(([, s]) => s.passes === 0)
if (alwaysFail.length > 0) {
  console.log('  🔴 ALWAYS FAILING:')
  for (const [id, s] of alwaysFail) {
    const avgScore = s.scores.length > 0 ? (s.scores.reduce((a, b) => a + b, 0) / s.scores.length).toFixed(1) : 'N/A'
    console.log(`     ${id.padEnd(12)} ${s.fails} fails, avg score: ${avgScore}`)
  }
  console.log('')
}

// Flaky tests (sometimes pass, sometimes fail)
const flaky = sorted.filter(([, s]) => s.passes > 0 && s.fails > 0)
if (flaky.length > 0) {
  console.log('  🟡 FLAKY (sometimes pass, sometimes fail):')
  for (const [id, s] of flaky) {
    const rate = ((s.passes / (s.passes + s.fails)) * 100).toFixed(0)
    const avgScore = s.scores.length > 0 ? (s.scores.reduce((a, b) => a + b, 0) / s.scores.length).toFixed(1) : 'N/A'
    console.log(`     ${id.padEnd(12)} ${rate}% pass rate (${s.passes}/${s.passes + s.fails}), avg score: ${avgScore}`)
  }
  console.log('')
}

// Always-passing tests
const alwaysPass = sorted.filter(([, s]) => s.fails === 0)
if (alwaysPass.length > 0) {
  console.log(`  🟢 ALWAYS PASSING: ${alwaysPass.length} tests`)
  for (const [id, s] of alwaysPass) {
    const avgScore = s.scores.length > 0 ? (s.scores.reduce((a, b) => a + b, 0) / s.scores.length).toFixed(1) : 'N/A'
    console.log(`     ${id.padEnd(12)} ${s.passes} passes, avg score: ${avgScore}`)
  }
}

// Category breakdown
console.log('\n── Category Averages ────────────────────────────────────\n')
const categories = {}
for (const [id, s] of Object.entries(testStats)) {
  if (!categories[s.category]) categories[s.category] = { passes: 0, total: 0, scores: [] }
  categories[s.category].passes += s.passes
  categories[s.category].total += s.passes + s.fails
  categories[s.category].scores.push(...s.scores)
}

for (const [cat, s] of Object.entries(categories)) {
  const rate = ((s.passes / s.total) * 100).toFixed(0)
  const avgScore = s.scores.length > 0 ? (s.scores.reduce((a, b) => a + b, 0) / s.scores.length).toFixed(1) : 'N/A'
  console.log(`  ${cat.padEnd(20)} ${rate.padStart(3)}% pass rate, avg LLM score: ${avgScore}`)
}

console.log('\n─────────────────────────────────────────────────────────')
console.log(`Total: ${files.length} runs, ${Object.keys(testStats).length} unique tests tracked`)
