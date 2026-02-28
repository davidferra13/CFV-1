/**
 * Report Generator for Remy Quality Tests
 *
 * Produces both JSON benchmark files (machine-readable, for regression comparison)
 * and Markdown reports (human-readable, with full response text for every prompt).
 */

import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

/**
 * Generate both JSON and Markdown reports from evaluation results.
 *
 * @param {object} opts
 * @param {string} opts.suite - Suite name ('chef', 'client', 'adversarial')
 * @param {EvaluationResult[]} opts.results - Array of evaluation results
 * @param {number} opts.durationMs - Total run duration in ms
 * @param {object} opts.models - Ollama models used { fast, standard }
 * @param {string} opts.benchmarkDir - Path to benchmarks directory
 * @param {string} opts.reportDir - Path to reports directory
 * @returns {{ benchmarkPath: string, reportPath: string }}
 */
export function generateReports({ suite, results, durationMs, models, benchmarkDir, reportDir }) {
  const now = new Date()
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const dateStr = now.toISOString().slice(0, 10)

  // ─── Compute summary stats ───────────────────────────────────────
  const total = results.length
  const passed = results.filter((r) => r.overall === 'pass').length
  const warned = results.filter((r) => r.overall === 'warn').length
  const failed = results.filter((r) => r.overall === 'fail').length
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0

  const timings = results.map((r) => r.timing).filter(Boolean)
  const avgClassification = avg(timings.map((t) => t.intentEventMs).filter((v) => v !== null))
  const avgFirstToken = avg(timings.map((t) => t.firstTokenMs).filter((v) => v !== null))
  const avgTotal = avg(timings.map((t) => t.totalMs))
  const avgToksPerSec = avg(timings.map((t) => t.tokensPerSec).filter((v) => v > 0))

  // Category breakdown
  const categories = {}
  for (const r of results) {
    if (!categories[r.category]) {
      categories[r.category] = { total: 0, passed: 0, warned: 0, failed: 0, totalMs: 0 }
    }
    const cat = categories[r.category]
    cat.total++
    if (r.overall === 'pass') cat.passed++
    else if (r.overall === 'warn') cat.warned++
    else cat.failed++
    cat.totalMs += r.timing?.totalMs || 0
  }
  for (const cat of Object.values(categories)) {
    cat.avgMs = Math.round(cat.totalMs / cat.total)
  }

  const failedResults = results.filter((r) => r.overall === 'fail')
  const warnedResults = results.filter((r) => r.overall === 'warn')

  // ─── JSON Benchmark ──────────────────────────────────────────────
  const benchmark = {
    runId: randomUUID(),
    timestamp: now.toISOString(),
    suite,
    ollamaModels: models,
    totalPrompts: total,
    passed,
    warned,
    failed,
    passRate,
    durationMinutes: Math.round(durationMs / 60000),
    averages: {
      classificationMs: avgClassification,
      firstTokenMs: avgFirstToken,
      totalMs: avgTotal,
      tokensPerSec: avgToksPerSec,
    },
    categoryBreakdown: categories,
    results: results.map((r) => ({
      promptId: r.promptId,
      category: r.category,
      prompt: r.prompt,
      overall: r.overall,
      failCount: r.failCount,
      checks: r.checks,
      timing: r.timing,
      responseLength: r.fullResponse?.length || 0,
      tasks: r.tasks?.length || 0,
    })),
    failedPrompts: failedResults.map((r) => ({
      promptId: r.promptId,
      prompt: r.prompt,
      checks: r.checks,
    })),
  }

  const benchmarkPath = path.join(benchmarkDir, `${timestamp}.json`)
  fs.mkdirSync(benchmarkDir, { recursive: true })
  fs.writeFileSync(benchmarkPath, JSON.stringify(benchmark, null, 2))

  // ─── Markdown Report ─────────────────────────────────────────────
  const lines = []
  const durationMin = Math.round(durationMs / 60000)

  lines.push(`# Remy Quality Report — ${capitalize(suite)} Suite`)
  lines.push(`**Date:** ${dateStr} | **Duration:** ${durationMin} min | **Pass Rate:** ${passed}/${total} (${passRate}%)`)
  lines.push('')

  // Summary table
  lines.push('## Summary')
  lines.push('')
  lines.push('| Metric | Value |')
  lines.push('|--------|-------|')
  lines.push(`| Total prompts | ${total} |`)
  lines.push(`| Passed | ${passed} |`)
  lines.push(`| Warnings | ${warned} |`)
  lines.push(`| Failed | ${failed} |`)
  lines.push(`| Pass rate | ${passRate}% |`)
  lines.push(`| Avg classification time | ${fmtMs(avgClassification)} |`)
  lines.push(`| Avg first-token time | ${fmtMs(avgFirstToken)} |`)
  lines.push(`| Avg total response time | ${fmtMs(avgTotal)} |`)
  lines.push(`| Avg tokens/sec | ${avgToksPerSec.toFixed(1)} |`)
  lines.push(`| Total duration | ${durationMin} min |`)
  lines.push('')

  // Category breakdown
  lines.push('## Category Breakdown')
  lines.push('')
  lines.push('| Category | Total | Pass | Warn | Fail | Avg Time |')
  lines.push('|----------|-------|------|------|------|----------|')
  for (const [name, cat] of Object.entries(categories)) {
    lines.push(`| ${name} | ${cat.total} | ${cat.passed} | ${cat.warned} | ${cat.failed} | ${fmtMs(cat.avgMs)} |`)
  }
  lines.push('')

  // Timing distribution
  const timingBuckets = { '<10s': 0, '10-30s': 0, '30-60s': 0, '60-120s': 0, '>120s': 0 }
  for (const t of timings) {
    const sec = t.totalMs / 1000
    if (sec < 10) timingBuckets['<10s']++
    else if (sec < 30) timingBuckets['10-30s']++
    else if (sec < 60) timingBuckets['30-60s']++
    else if (sec < 120) timingBuckets['60-120s']++
    else timingBuckets['>120s']++
  }
  lines.push('## Timing Distribution')
  lines.push('')
  lines.push('| Bucket | Count |')
  lines.push('|--------|-------|')
  for (const [bucket, count] of Object.entries(timingBuckets)) {
    lines.push(`| ${bucket} | ${count} |`)
  }
  lines.push('')

  // Failures detail
  if (failedResults.length > 0) {
    lines.push('## Failures')
    lines.push('')
    for (const r of failedResults) {
      lines.push(`### ${r.promptId}: "${r.prompt}"`)
      lines.push('')
      for (const [name, check] of Object.entries(r.checks)) {
        if (!check.pass) {
          lines.push(`- **${name}:** ${formatCheck(check)}`)
        }
      }
      lines.push(`- **Response time:** ${fmtMs(r.timing?.totalMs)}`)
      lines.push(`- **Response excerpt:** ${truncate(r.fullResponse, 300)}`)
      lines.push('')
    }
  }

  // Warnings detail
  if (warnedResults.length > 0) {
    lines.push('## Warnings')
    lines.push('')
    for (const r of warnedResults) {
      lines.push(`### ${r.promptId}: "${r.prompt}"`)
      lines.push('')
      for (const [name, check] of Object.entries(r.checks)) {
        if (!check.pass) {
          lines.push(`- **${name}:** ${formatCheck(check)}`)
        }
      }
      lines.push('')
    }
  }

  // Full per-prompt results
  lines.push('## Per-Prompt Results')
  lines.push('')
  for (const r of results) {
    const icon = r.overall === 'pass' ? '✅' : r.overall === 'warn' ? '⚠️' : '❌'
    lines.push(`### ${icon} ${r.promptId}: "${r.prompt}"`)
    lines.push('')
    lines.push(`- **Verdict:** ${r.overall.toUpperCase()}`)
    lines.push(`- **Intent:** ${r.checks.intentCorrect ? `${r.checks.intentCorrect.actual} (expected: ${r.checks.intentCorrect.expected}) ${r.checks.intentCorrect.pass ? '✅' : '❌'}` : 'n/a'}`)

    if (r.checks.taskTypesMatch) {
      lines.push(`- **Tasks:** ${r.checks.taskTypesMatch.actual.join(', ') || 'none'} (expected: ${r.checks.taskTypesMatch.expected.join(', ')}) ${r.checks.taskTypesMatch.pass ? '✅' : '❌'}`)
    }

    lines.push(`- **Classification:** ${fmtMs(r.timing?.intentEventMs)} | **First token:** ${fmtMs(r.timing?.firstTokenMs)} | **Total:** ${fmtMs(r.timing?.totalMs)}`)
    lines.push(`- **Tokens/sec:** ${r.timing?.tokensPerSec || 0}`)
    lines.push(`- **Response length:** ${r.fullResponse?.length || 0} chars`)

    if (r.checks.toneCheck && !r.checks.toneCheck.pass) {
      lines.push(`- **Tone violations:** ${r.checks.toneCheck.forbiddenFound.join(', ')}`)
    }

    if (r.checks.guardrailHeld) {
      lines.push(`- **Guardrail:** ${r.checks.guardrailHeld.details} ${r.checks.guardrailHeld.pass ? '✅' : '❌'}`)
    }

    // Full response text
    lines.push('')
    lines.push('**Full response:**')
    lines.push('```')
    lines.push(r.fullResponse || '[no response text]')
    lines.push('```')

    if (r.tasks && r.tasks.length > 0) {
      lines.push('')
      lines.push('**Tasks returned:**')
      lines.push('```json')
      lines.push(JSON.stringify(r.tasks, null, 2).substring(0, 2000))
      lines.push('```')
    }

    lines.push('')
    lines.push('---')
    lines.push('')
  }

  const reportPath = path.join(reportDir, `${dateStr}-${suite}-quality.md`)
  fs.mkdirSync(reportDir, { recursive: true })
  fs.writeFileSync(reportPath, lines.join('\n'))

  return { benchmarkPath, reportPath }
}

/**
 * Print a summary to stdout.
 */
export function printSummary(results, durationMs) {
  const total = results.length
  const passed = results.filter((r) => r.overall === 'pass').length
  const warned = results.filter((r) => r.overall === 'warn').length
  const failed = results.filter((r) => r.overall === 'fail').length

  console.log('')
  console.log('═'.repeat(60))
  console.log('  REMY QUALITY TEST — FINAL SUMMARY')
  console.log('═'.repeat(60))
  console.log('')

  for (const r of results) {
    const icon = r.overall === 'pass' ? '✓' : r.overall === 'warn' ? '~' : '✗'
    const time = fmtMs(r.timing?.totalMs)
    const intent = r.checks.intentCorrect
      ? ` (${r.checks.intentCorrect.actual})`
      : ''
    console.log(`  ${icon} ${r.promptId} — ${time}${intent}`)
  }

  console.log('')
  console.log('─'.repeat(60))
  console.log(`  Passed: ${passed}/${total} (${Math.round((passed / total) * 100)}%)`)
  console.log(`  Warnings: ${warned}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  Duration: ${Math.round(durationMs / 60000)} minutes`)
  console.log('─'.repeat(60))

  if (failed > 0) {
    console.log('')
    console.log('  FAILURES:')
    for (const r of results.filter((r) => r.overall === 'fail')) {
      console.log(`    ✗ ${r.promptId}: "${r.prompt}"`)
      for (const [name, check] of Object.entries(r.checks)) {
        if (!check.pass) console.log(`      - ${name}: ${formatCheck(check)}`)
      }
    }
  }

  console.log('')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avg(arr) {
  if (arr.length === 0) return 0
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
}

function fmtMs(ms) {
  if (ms === null || ms === undefined) return 'n/a'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function truncate(s, max) {
  if (!s) return '[empty]'
  if (s.length <= max) return s
  return s.substring(0, max) + '...'
}

function formatCheck(check) {
  if (check.expected !== undefined && check.actual !== undefined) {
    return `expected "${check.expected}", got "${check.actual}"`
  }
  if (check.missed) return `missing: ${check.missed.join(', ')}`
  if (check.found) return `found forbidden: ${check.found.join(', ')}`
  if (check.forbiddenFound) return `tone violations: ${check.forbiddenFound.join(', ')}`
  if (check.errors) return `errors: ${check.errors.join(', ')}`
  if (check.details) return check.details
  if (check.actualMs !== undefined) return `${fmtMs(check.actualMs)} (max: ${fmtMs(check.maxMs)})`
  return JSON.stringify(check)
}
