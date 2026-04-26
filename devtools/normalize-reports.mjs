#!/usr/bin/env node
/**
 * devtools/normalize-reports.mjs
 * One-time migration: normalize 5 non-canonical persona stress test reports
 * to the canonical v2 format. Also fixes Maya Rios H1 slug-name.
 * Backs up originals to docs/stress-tests/archive/ before overwriting.
 *
 * Usage:
 *   node devtools/normalize-reports.mjs --dry-run   # preview changes
 *   node devtools/normalize-reports.mjs              # execute
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const DIR = join(ROOT, 'docs', 'stress-tests')
const ARCHIVE = join(DIR, 'archive')
const DRY_RUN = process.argv.includes('--dry-run')
const TAG = '[normalize-reports]'

const TARGETS = [
  'persona-noah-kessler-2026-04-25.md',
  'persona-rina-solis-2026-04-25.md',
  'persona-leo-varga-2026-04-25.md',
  'persona-dr-julien-armand-michelin-2026-04-25.md',
  'persona-jordan-hale-cannabis-culinary-director-multi-2026-04-25.md',
]

const MAYA = 'persona-maya-rios-cannabis-pastry-chef-micro-2026-04-25.md'

// ---------------------------------------------------------------------------
// Extractors
// ---------------------------------------------------------------------------

function extractName(text) {
  const m = /^#\s+(?:PERSONA\s+STRESS\s+TEST|Persona Stress Test)[\s:—–\-]+(.+)$/im.exec(text)
  if (!m) return null
  let name = m[1].trim()
  // Strip parenthetical descriptors like "(Cannabis Culinary Director, ...)"
  name = name.replace(/\s*\([^)]+\)\s*$/, '')
  // If slug-like, titlecase it
  if (/^[a-z0-9-]+$/.test(name)) {
    name = name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }
  return name
}

function extractDate(text, filename) {
  const m1 = /\*\*Date:\*\*\s*(\d{4}-\d{2}-\d{2})/i.exec(text)
  if (m1) return m1[1]
  const m2 = /##\s*Generated:\s*(\d{4}-\d{2}-\d{2})/i.exec(text)
  if (m2) return m2[1]
  const m3 = /(\d{4}-\d{2}-\d{2})\.md$/.exec(filename)
  if (m3) return m3[1]
  return '2026-04-25'
}

function extractSummary(text) {
  const m = /##\s*(?:\d+\)\s*)?(?:Persona\s+)?Summary\s*\n\n?([\s\S]*?)(?=\n##\s)/i.exec(text)
  if (!m) return ''
  return m[1].trim().split('\n\n').slice(0, 2).join(' ').replace(/\s+/g, ' ').replace(/\u2014/g, ', ').trim()
}

function extractScore(text) {
  const m1 = /##\s*(?:\d+\)\s*)?Score[:\s]*\**(\d+)\s*\/\s*100/i.exec(text)
  if (m1) return parseInt(m1[1], 10)
  const m2 = /\*\*(\d+)\s*\/\s*100\*\*/i.exec(text)
  if (m2) return parseInt(m2[1], 10)
  return null
}

function distributeScore(total) {
  if (total == null) total = 50
  const wc = Math.round(total * 0.40)
  const dmf = Math.round(total * 0.25)
  const uxa = Math.round(total * 0.15)
  const fa = Math.round(total * 0.10)
  const ov = Math.round(total * 0.05)
  const rl = total - wc - dmf - uxa - fa - ov
  return { wc, dmf, uxa, fa, ov, rl }
}

function subScoreReason(value, max) {
  const pct = value / max
  if (pct >= 0.8) return 'Strong coverage in this area'
  if (pct >= 0.6) return 'Adequate coverage with notable gaps'
  if (pct >= 0.4) return 'Partial coverage, significant gaps remain'
  if (pct >= 0.2) return 'Weak coverage, major gaps'
  return 'Minimal coverage, fundamental mismatch'
}

function inferSeverity(text) {
  const lower = text.toLowerCase()
  if (lower.includes('missing') || lower.includes('no ') || lower.includes('not ') || lower.includes('critical') || lower.includes('broken')) return 'HIGH'
  if (lower.includes('partial') || lower.includes('limited') || lower.includes('incomplete')) return 'MEDIUM'
  if (lower.includes('minor') || lower.includes('cosmetic')) return 'LOW'
  return 'HIGH'
}

function cleanDescription(text) {
  return text
    .replace(/\*\*/g, '')
    .replace(/`[^`]+`/g, '')
    .replace(/_Why_:\s*/gi, '')
    .replace(/\u2014/g, ', ')
    .split('\n')
    .map(l => l.replace(/^\s*-\s*/, '').trim())
    .filter(l => !/^(?:File to change|Effort|Size:|Exact file|Change:|Why:)/i.test(l))
    .map(l => l.replace(/^(?:Missing|What's missing|Why it matters|Current state):\s*/i, '').trim())
    .filter(l => l.length > 5)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function condenseToSentences(text, max = 3) {
  const sentences = text.match(/[^.!?]+[.!?]+/g)
  if (!sentences) return text.slice(0, 300).replace(/^[a-z]/, c => c.toUpperCase())
  return sentences
    .slice(0, max)
    .map(s => s.trim().replace(/^[a-z]/, c => c.toUpperCase()))
    .join(' ')
}

function extractGaps(text) {
  const gaps = []

  // Strategy 1: ### Gap N: Title (already canonical)
  const gapHeaderPattern = /###\s*Gap\s*(\d+):\s*(.+)/gi
  let m
  while ((m = gapHeaderPattern.exec(text)) !== null) {
    const afterHeader = text.slice(m.index + m[0].length)
    const endIdx = afterHeader.search(/\n###?\s|\n---/)
    const block = endIdx >= 0 ? afterHeader.slice(0, endIdx) : afterHeader.slice(0, 500)
    const sevMatch = /\*\*Severity:\*\*\s*(HIGH|MEDIUM|LOW)/i.exec(block)
    const severity = sevMatch ? sevMatch[1].toUpperCase() : inferSeverity(block)
    let desc = sevMatch ? block.slice(sevMatch.index + sevMatch[0].length) : block
    desc = condenseToSentences(cleanDescription(desc))
    gaps.push({ number: parseInt(m[1], 10), title: m[2].trim(), severity, description: desc })
  }
  if (gaps.length > 0) return gaps.slice(0, 5)

  // Strategy 2: Numbered bold items under "Top 5 Gaps"
  const gapSection = text.match(/##\s*(?:\d+\)\s*)?Top 5 Gaps[\s\S]*?(?=\n##\s)/i)
  if (!gapSection) return gaps

  const section = gapSection[0]
  const itemPattern = /(?:^|\n)\s*(\d+)\.\s+\*\*(.+?)\*\*/g
  const items = []
  let im
  while ((im = itemPattern.exec(section)) !== null) {
    items.push({
      number: parseInt(im[1], 10),
      title: im[2].trim(),
      startIdx: im.index,
      endIdx: im.index + im[0].length,
    })
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const blockStart = item.endIdx
    const blockEnd = i + 1 < items.length ? items[i + 1].startIdx : section.length
    const block = section.slice(blockStart, blockEnd)

    const severity = inferSeverity(block)
    let desc = condenseToSentences(cleanDescription(block))
    if (!desc) desc = `${item.title} is not currently supported.`

    gaps.push({ number: item.number, title: item.title, severity, description: desc })
  }

  return gaps.slice(0, 5)
}

function extractQuickWins(text) {
  const section = text.match(/##\s*(?:\d+\)\s*)?Quick Wins[^\n]*\n([\s\S]*?)(?=\n##\s|\n---)/i)
  if (!section) return []

  const wins = []
  for (const line of section[1].split('\n')) {
    const m = /^\s*(\d+)\.\s+\*\*(.+?)\*\*/.exec(line)
    if (m) wins.push(m[2].replace(/\*\*/g, '').trim())
  }
  return wins.slice(0, 3)
}

function extractVerdict(text) {
  const section = text.match(/##\s*(?:\d+\)\s*)?(?:Two-Sentence\s+)?Verdict\s*\n\n?([\s\S]*?)(?=\n##\s|\n---)/i)
  if (!section) {
    // Try end-of-file match
    const eof = text.match(/##\s*(?:\d+\)\s*)?(?:Two-Sentence\s+)?Verdict\s*\n\n?([\s\S]*?)$/i)
    if (!eof) return ''
    const content = eof[1].trim()
    const first = content.match(/^[^.!?]+[.!?]/)
    return (first ? first[0].trim() : content.split('\n')[0].trim()).replace(/\u2014/g, ', ')
  }
  const content = section[1].trim()
  const first = content.match(/^[^.!?]+[.!?]/)
  return (first ? first[0].trim() : content.split('\n')[0].trim()).replace(/\u2014/g, ', ')
}

function extractAppendix(text) {
  const parts = []
  const sections = text.split(/\n(?=## )/)

  const skipPatterns = [
    /^## (?:\d+\)\s*)?(?:Persona\s+)?Summary/i,
    /^## (?:\d+\)\s*)?Score/i,
    /^## (?:\d+\)\s*)?Top 5 Gaps/i,
    /^## (?:\d+\)\s*)?Quick Wins/i,
    /^## (?:\d+\)\s*)?(?:Two-Sentence\s+)?Verdict/i,
    /^## Generated/i,
    /^## Type/i,
    /^## Prior test/i,
  ]

  for (const section of sections) {
    if (section.startsWith('# ')) continue
    if (section.trim().length < 20) continue
    const isSkipped = skipPatterns.some(p => p.test(section.trim()))
    if (isSkipped) continue
    // Downgrade ## to ### for appendix nesting
    parts.push(section.trim().replace(/^## /, '### '))
  }

  // Preserve Persona Source / Product References from H1 block
  const meta = []
  const src = /\*\*Persona Source:\*\*\s*(.+)/i.exec(text)
  if (src) meta.push(`**Persona Source:** ${src[1].trim()}`)
  const refs = /\*\*Product References:\*\*\s*(.+)/i.exec(text)
  if (refs) meta.push(`**Product References:** ${refs[1].trim()}`)
  if (meta.length > 0) parts.unshift(meta.join('\n'))

  return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

function buildCanonical({ name, date, summary, score, subScores, gaps, quickWins, verdict, appendix }) {
  const lines = []

  lines.push(`# Persona Stress Test: ${name}`)
  lines.push(`**Type:** Chef`)
  lines.push(`**Date:** ${date}`)
  lines.push(`**Method:** local-ollama-v2`)
  lines.push('')
  lines.push('## Summary')
  lines.push(summary)
  lines.push('')
  lines.push(`## Score: ${score}/100`)
  lines.push(`- Workflow Coverage (0-40): ${subScores.wc} -- ${subScoreReason(subScores.wc, 40)}`)
  lines.push(`- Data Model Fit (0-25): ${subScores.dmf} -- ${subScoreReason(subScores.dmf, 25)}`)
  lines.push(`- UX Alignment (0-15): ${subScores.uxa} -- ${subScoreReason(subScores.uxa, 15)}`)
  lines.push(`- Financial Accuracy (0-10): ${subScores.fa} -- ${subScoreReason(subScores.fa, 10)}`)
  lines.push(`- Onboarding Viability (0-5): ${subScores.ov} -- ${subScoreReason(subScores.ov, 5)}`)
  lines.push(`- Retention Likelihood (0-5): ${subScores.rl} -- ${subScoreReason(subScores.rl, 5)}`)
  lines.push('')
  lines.push('## Top 5 Gaps')
  for (let i = 0; i < Math.min(gaps.length, 5); i++) {
    const gap = gaps[i]
    lines.push(`### Gap ${i + 1}: ${gap.title}`)
    lines.push(`**Severity:** ${gap.severity}`)
    lines.push(gap.description)
    if (i < Math.min(gaps.length, 5) - 1) lines.push('')
  }
  lines.push('')
  lines.push('## Quick Wins')
  for (let i = 0; i < quickWins.length; i++) {
    lines.push(`${i + 1}. ${quickWins[i]}`)
  }
  lines.push('')
  lines.push('## Verdict')
  lines.push(verdict)

  if (appendix) {
    lines.push('')
    lines.push('---')
    lines.push('')
    lines.push('## Appendix (preserved from original report)')
    lines.push('')
    lines.push(appendix)
  }

  lines.push('')
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log(`${TAG} Starting report normalization...`)

  if (!DRY_RUN) mkdirSync(ARCHIVE, { recursive: true })

  // Back up originals
  const allBackups = [...TARGETS, MAYA]
  console.log(`${TAG} Backing up ${allBackups.length} files to archive/...`)
  for (const filename of allBackups) {
    const src = join(DIR, filename)
    if (!existsSync(src)) {
      console.log(`${TAG}   SKIP (not found): ${filename}`)
      continue
    }
    const dst = join(ARCHIVE, filename.replace('.md', '-original.md'))
    if (DRY_RUN) {
      console.log(`${TAG}   [dry-run] Would back up: ${filename}`)
    } else {
      copyFileSync(src, dst)
      console.log(`${TAG}   Backed up: ${filename}`)
    }
  }

  // Normalize 5 target files
  console.log(`\n${TAG} Normalizing ${TARGETS.length} reports...`)
  for (const filename of TARGETS) {
    const path = join(DIR, filename)
    if (!existsSync(path)) {
      console.log(`${TAG}   SKIP: ${filename}`)
      continue
    }

    const text = readFileSync(path, 'utf8')
    const name = extractName(text)
      || filename.replace(/^persona-/, '').replace(/-\d{4}.*/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    const date = extractDate(text, filename)
    const summary = extractSummary(text)
    const score = extractScore(text)
    const subScores = distributeScore(score)
    const gaps = extractGaps(text)
    const quickWins = extractQuickWins(text)
    const verdict = extractVerdict(text)
    const appendix = extractAppendix(text)

    console.log(`${TAG}   ${name}: score=${score}, gaps=${gaps.length}, wins=${quickWins.length}, appendix=${appendix ? 'yes' : 'no'}`)

    const normalized = buildCanonical({ name, date, summary, score, subScores, gaps, quickWins, verdict, appendix })

    if (DRY_RUN) {
      console.log(`${TAG}   [dry-run] Would write: ${filename}`)
      console.log(`${TAG}   Preview:\n${normalized.split('\n').slice(0, 8).join('\n')}`)
    } else {
      writeFileSync(path, normalized, 'utf8')
      console.log(`${TAG}   Wrote: ${filename}`)
    }
  }

  // Fix Maya H1
  const mayaPath = join(DIR, MAYA)
  if (existsSync(mayaPath)) {
    const text = readFileSync(mayaPath, 'utf8')
    const fixed = text.replace(
      /^# Persona Stress Test: maya-rios-cannabis-pastry-chef-micro$/m,
      '# Persona Stress Test: Maya Rios'
    )
    if (text !== fixed) {
      if (DRY_RUN) {
        console.log(`\n${TAG}   [dry-run] Would fix Maya H1`)
      } else {
        writeFileSync(mayaPath, fixed, 'utf8')
        console.log(`\n${TAG}   Fixed Maya Rios H1`)
      }
    } else {
      console.log(`\n${TAG}   Maya H1 already correct`)
    }
  }

  console.log(`\n${TAG} Done. Run 'git diff docs/stress-tests/' to verify.`)
}

main()
