// Simulation Report Generator
// After each automated simulation run, this generates a plain-English fix report
// using Ollama — then writes it to docs/simulation-report.md.
//
// History is appended to docs/simulation-history.md so the AI can see what was
// already diagnosed and fixed, preventing repeated recommendations.
//
// No private client data involved — all simulation data is synthetic.
// No 'use server' — plain server-side module.

import { getOllamaConfig } from '@/lib/ai/providers'
import { makeOllamaClient } from './ollama-client'
import { writeFile, readFile, appendFile } from 'fs/promises'
import { join } from 'path'
import type { SimModule } from './types'

interface ModuleFailure {
  module: SimModule
  passRate: number // 0–1
  sampleFailures: string[] // failure strings from quality-evaluator
}

interface ReportInput {
  runId: string
  tenantId: string
  completedAt: string
  overallPassRate: number // 0–1
  moduleBreakdown: Record<string, { count: number; passedCount: number; passRate: number }>
  topFailures: ModuleFailure[]
}

const REPORT_PATH = join(process.cwd(), 'docs', 'simulation-report.md')
const HISTORY_PATH = join(process.cwd(), 'docs', 'simulation-history.md')

/** Read the last N lines of the history file for context injection */
async function readRecentHistory(maxChars = 3000): Promise<string> {
  try {
    const content = await readFile(HISTORY_PATH, 'utf-8')
    if (content.length <= maxChars) return content
    // Return the tail so we get the most recent entries
    return '...[earlier history truncated]...\n\n' + content.slice(-maxChars)
  } catch {
    return '' // no history yet
  }
}

/** Append a compact summary entry to the history file */
async function appendHistoryEntry(input: ReportInput): Promise<void> {
  const { runId, completedAt, overallPassRate, moduleBreakdown } = input

  const passing = Object.entries(moduleBreakdown)
    .filter(([, s]) => s.passRate >= 1)
    .map(([m]) => m)

  const failing = Object.entries(moduleBreakdown)
    .filter(([, s]) => s.passRate < 1)
    .map(([m, s]) => `${m} (${Math.round(s.passRate * 100)}%)`)

  const date = completedAt.slice(0, 16).replace('T', ' ') + ' UTC'
  const pct = Math.round(overallPassRate * 100)

  const entry = `
## ${date} — ${pct}% pass rate — Run ${runId.slice(0, 8)}
Passing: ${passing.length > 0 ? passing.join(', ') : 'none'}
Failing: ${failing.length > 0 ? failing.join(', ') : 'none — all modules passed'}
`

  try {
    // Initialise the file with a header if it doesn't exist yet
    try {
      await readFile(HISTORY_PATH, 'utf-8')
    } catch {
      await writeFile(
        HISTORY_PATH,
        '# Simulation History\n\nEach run is appended below. Fixes applied after each run are noted manually by the developer.\n',
        'utf-8'
      )
    }
    await appendFile(HISTORY_PATH, entry, 'utf-8')
    console.log('[sim-report] History entry appended to docs/simulation-history.md')
  } catch (err) {
    console.warn('[sim-report] Failed to append history entry:', err)
  }
}

export async function generatePostRunReport(input: ReportInput): Promise<void> {
  const { model } = getOllamaConfig()
  const ollama = makeOllamaClient()

  const { overallPassRate, moduleBreakdown, topFailures, completedAt } = input

  // Read prior history so the AI doesn't repeat already-diagnosed issues
  const priorHistory = await readRecentHistory()

  const failureSection = topFailures
    .map((f) => {
      const pct = Math.round(f.passRate * 100)
      const samples = f.sampleFailures
        .slice(0, 3)
        .map((s) => `  - ${s}`)
        .join('\n')
      return `Module: ${f.module} (${pct}% pass rate)\nFailure examples:\n${samples}`
    })
    .join('\n\n')

  const moduleTable = Object.entries(moduleBreakdown)
    .map(
      ([mod, stats]) =>
        `${mod}: ${Math.round(stats.passRate * 100)}% (${stats.passedCount}/${stats.count})`
    )
    .join(', ')

  const historyContext = priorHistory
    ? `\n\nPRIOR RUN HISTORY (do not re-diagnose already-fixed issues):\n${priorHistory}`
    : ''

  const systemPrompt = `You are a quality assurance engineer reviewing AI module test results for a private chef management system.
Your job is to write a clear, actionable fix report in plain English markdown.
Be direct and specific. Do not pad the report. Focus on the worst-performing modules.
Write in second person ("The allergen_risk module is missing..." not "It has been observed that...").

IMPORTANT: If the history below shows a module was previously failing and is now passing,
acknowledge the improvement. Do not repeat recommendations for issues that have already been fixed.
Only recommend fixes for modules that are CURRENTLY failing in this run.${historyContext}`

  const userPrompt = `Here are the results from the latest automated simulation run (${completedAt}):

Overall pass rate: ${Math.round(overallPassRate * 100)}%
Per-module: ${moduleTable}

Failing modules and sample failure reasons:
${failureSection || 'No failures recorded — all modules passed.'}

Write a fix report in markdown with these sections:
1. ## Summary (2-3 sentences: overall health, which modules need attention, note any improvements vs prior runs)
2. ## Failures & Root Causes (one subsection per CURRENTLY failing module — what's going wrong and why)
3. ## Prompt Fix Recommendations (specific changes to make to each failing module's prompt)
4. ## What's Working Well (briefly note passing modules, call out any that recently improved)

Keep the entire report under 600 words. Be concrete and actionable.
Do not recommend fixes for modules that are currently passing.`

  let reportContent: string

  try {
    const response = await ollama.chat({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      options: { temperature: 0.3 },
    })

    reportContent = response.message.content.trim()
  } catch (err) {
    console.warn('[sim-report] Ollama unavailable for report generation:', err)
    reportContent = `# Simulation Report — ${completedAt}

*Report generation requires Ollama. Start Ollama to enable AI-generated fix recommendations.*

## Raw Results

Overall pass rate: ${Math.round(overallPassRate * 100)}%

${moduleTable}
`
  }

  // Write the latest report (always overwritten — history file is the record)
  const fullReport = `# ChefFlow AI Simulation Report
*Auto-generated — last run: ${completedAt}*
*Run ID: ${input.runId}*

---

${reportContent}

---
*This report shows the latest run only. Full history: docs/simulation-history.md*
`

  try {
    await writeFile(REPORT_PATH, fullReport, 'utf-8')
    console.log('[sim-report] Fix report written to docs/simulation-report.md')
  } catch (err) {
    console.error('[sim-report] Failed to write report file:', err)
  }

  // Append compact entry to history (non-blocking after report is written)
  await appendHistoryEntry(input)
}
