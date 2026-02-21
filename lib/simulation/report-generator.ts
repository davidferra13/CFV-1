// Simulation Report Generator
// After each automated simulation run, this generates a plain-English fix report
// using Ollama — then writes it to docs/simulation-report.md.
//
// The report tells the developer/chef exactly what failed and how to fix the prompts.
// No private client data involved — all simulation data is synthetic.
// No 'use server' — plain server-side module.

import { Ollama } from 'ollama'
import { getOllamaConfig } from '@/lib/ai/providers'
import { writeFile } from 'fs/promises'
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

export async function generatePostRunReport(input: ReportInput): Promise<void> {
  const { baseUrl, model } = getOllamaConfig()
  const ollama = new Ollama({ host: baseUrl })

  const { overallPassRate, moduleBreakdown, topFailures, completedAt } = input

  // Build the prompt with concrete failure data
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

  const systemPrompt = `You are a quality assurance engineer reviewing AI module test results for a private chef management system.
Your job is to write a clear, actionable fix report in plain English markdown.
The report should tell the developer exactly what is failing and give specific, concrete suggestions to fix the AI prompts.
Be direct and specific. Do not pad the report. Focus on the worst-performing modules.
Write in second person ("The allergen_risk module is missing..." not "It has been observed that...").`

  const userPrompt = `Here are the results from the latest automated simulation run (${completedAt}):

Overall pass rate: ${Math.round(overallPassRate * 100)}%
Per-module: ${moduleTable}

Failing modules and sample failure reasons:
${failureSection || 'No failures recorded — all modules passed.'}

Write a fix report in markdown with these sections:
1. ## Summary (2-3 sentences: overall health, which modules need attention)
2. ## Failures & Root Causes (one subsection per failing module — what's going wrong and why)
3. ## Prompt Fix Recommendations (specific changes to make to each failing module's system prompt or evaluation rubric)
4. ## What's Working Well (briefly note passing modules)

Keep the entire report under 600 words. Be concrete and actionable.`

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
    // Write a minimal report without Ollama analysis
    reportContent = `# Simulation Report — ${completedAt}

*Report generation requires Ollama. Start Ollama to enable AI-generated fix recommendations.*

## Raw Results

Overall pass rate: ${Math.round(overallPassRate * 100)}%

${moduleTable}
`
  }

  // Prepend metadata header
  const fullReport = `# ChefFlow AI Simulation Report
*Auto-generated — last run: ${completedAt}*
*Run ID: ${input.runId}*

---

${reportContent}

---
*This report is overwritten after each simulation run. View history in the Simulation Lab at /dev/simulate.*
`

  // Write to docs/simulation-report.md (relative to project root)
  const reportPath = join(process.cwd(), 'docs', 'simulation-report.md')
  try {
    await writeFile(reportPath, fullReport, 'utf-8')
    console.log(`[sim-report] Fix report written to docs/simulation-report.md`)
  } catch (err) {
    console.error('[sim-report] Failed to write report file:', err)
  }
}
