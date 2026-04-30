#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import {
  parseArgs,
  readJson,
  readStdin,
  slugify,
  writeText,
} from './agent-skill-utils.mjs'

const args = parseArgs()
const briefPath = args.brief || args.file || null
const prompt = String(args.prompt || args.p || args._.join(' ') || '').trim()

function loadBrief() {
  if (briefPath) return readJson(briefPath, null)
  if (prompt) {
    return JSON.parse(
      execFileSync('node', ['devtools/research-brief-generator.mjs', '--prompt', prompt], {
        encoding: 'utf8',
      }),
    )
  }
  if (!process.stdin.isTTY) return JSON.parse(readStdin())
  return null
}

const brief = loadBrief()
if (!brief) {
  console.error('Missing brief. Pass --brief path, --prompt "question", or pipe brief JSON.')
  process.exit(1)
}

const date = new Date().toISOString().slice(0, 10)
const title = slugify(brief.original_question || brief.optimized_question || 'research-brief')
const destination = args.output || args.out || path.join('docs', 'research', `${title}.md`)

const lines = [
  `# Research: ${brief.original_question || brief.optimized_question}`,
  '',
  `> **Date:** ${date}`,
  `> **Question:** ${brief.optimized_question || brief.original_question}`,
  '> **Status:** scaffold',
  '',
  '## Origin Context',
  '',
  brief.original_question || '[original question missing]',
  '',
  '## Research Brief',
  '',
  `- Type: ${brief.question_type || 'unknown'}`,
  `- Primary skill: ${brief.primary_skill || 'unknown'}`,
  `- Sidecar skills: ${(brief.sidecar_skills || []).join(', ') || 'none'}`,
  `- Audience lenses: ${(brief.audience_lenses || []).join(', ') || 'none'}`,
  `- Evidence threshold: ${brief.evidence_threshold || 'unknown'}`,
  `- Claim limit: ${brief.claim_limit || 'unknown'}`,
  '',
  '## Source Plan',
  '',
  ...(brief.required_sources || []).map((source) => `- ${source}`),
  '',
  '## Stop Conditions',
  '',
  ...(brief.stop_conditions || []).map((condition) => `- ${condition}`),
  '',
  '## Summary',
  '',
  '[Not researched yet. Replace this only after checking the required sources.]',
  '',
  '## Detailed Findings',
  '',
  '[Add file-cited findings here. Do not add claims without evidence.]',
  '',
  '## Evidence Map',
  '',
  '- REAL USER EVIDENCE: not checked',
  '- CODEBASE EVIDENCE: not checked',
  '- PERSONA EVIDENCE: not checked',
  '- PUBLIC MARKET EVIDENCE: not checked',
  '- DEVELOPER INTENT: present if this brief came from a direct request',
  '- INFERENCE: none yet',
  '- UNKNOWN: research not completed',
  '',
  '## Provenance',
  '',
  ...(brief.provenance_labels || []).map((label) => `- ${label}: not checked`),
  '',
  '## Gaps and Unknowns',
  '',
  '- Research has not been performed yet.',
  '',
  '## Recommendations',
  '',
  '- No recommendation until evidence is checked.',
  '',
]

const markdown = lines.join('\n')

if (args.write) {
  writeText(destination, markdown)
  console.log(`Wrote report scaffold: ${destination.replace(/\\/g, '/')}`)
} else {
  console.log(markdown)
}
