#!/usr/bin/env node
import path from 'node:path'
import {
  nowStamp,
  parseArgs,
  readJson,
  readStdin,
  readText,
  reportsRoot,
  slugify,
  writeJson,
} from './agent-skill-utils.mjs'

const args = parseArgs()
const brief = args.brief ? readJson(args.brief, null) : null
let answer = ''

if (args.answer) {
  answer = readText(args.answer)
} else {
  answer = readStdin()
}

if (!answer.trim()) {
  console.error('Missing answer text. Pass --answer path or pipe answer text on stdin.')
  process.exit(1)
}

const lowerAnswer = answer.toLowerCase()
const issues = []
const passes = []

function addCheck(ok, pass, issue) {
  if (ok) passes.push(pass)
  else issues.push(issue)
}

const labels = [
  'CODEBASE VERIFIED',
  'REAL USER EVIDENCE',
  'PERSONA SIMULATION',
  'PUBLIC MARKET RESEARCH',
  'DEVELOPER INTENT',
  'INFERENCE',
  'UNKNOWN',
]

const requiredLabels = brief?.provenance_labels || labels
const labelHits = requiredLabels.filter((label) => lowerAnswer.includes(label.toLowerCase()))
addCheck(
  labelHits.length >= Math.min(3, requiredLabels.length),
  `Provenance labels present: ${labelHits.join(', ')}`,
  'Answer does not include enough provenance labels.',
)

if (brief?.audience_lenses?.length) {
  const hits = brief.audience_lenses.filter((lens) => lowerAnswer.includes(String(lens).toLowerCase()))
  addCheck(
    hits.length > 0,
    `Audience lenses mentioned: ${hits.join(', ')}`,
    `Answer does not mention selected audience lenses: ${brief.audience_lenses.join(', ')}.`,
  )
}

if (brief?.evidence_threshold) {
  addCheck(
    lowerAnswer.includes('evidence') || lowerAnswer.includes('verified') || lowerAnswer.includes('unknown'),
    'Answer discusses evidence or unknowns.',
    'Answer does not visibly enforce the evidence threshold.',
  )
}

const riskyValidationWords = ['validated', 'proven', 'real users want', 'market wants']
const hasRiskyValidationClaim = riskyValidationWords.some((term) => lowerAnswer.includes(term))
const hasRealUserLabel = lowerAnswer.includes('real user evidence')
addCheck(
  !hasRiskyValidationClaim || hasRealUserLabel,
  'No unsupported validation language detected.',
  'Answer uses validation language without an explicit real user evidence label.',
)

const hasUnknown = lowerAnswer.includes('unknown') || lowerAnswer.includes('not checked') || lowerAnswer.includes('missing')
addCheck(
  hasUnknown || !brief,
  'Unknowns or missing evidence are named.',
  'Answer does not name unknowns or missing evidence.',
)

const score = Math.max(0, 100 - issues.length * 20)
const result = {
  generated_at: new Date().toISOString(),
  brief_path: args.brief || null,
  original_question: brief?.original_question || null,
  optimized_question: brief?.optimized_question || null,
  score,
  status: score >= 80 ? 'pass' : score >= 60 ? 'warn' : 'fail',
  passes,
  issues,
}

if (args.write || args.report) {
  const outFile = path.join(
    reportsRoot,
    'question-outcomes',
    `${nowStamp()}-${slugify(brief?.original_question || 'answer')}.json`,
  )
  writeJson(outFile, result)
  result.report_path = outFile.replace(/\\/g, '/')
}

console.log(JSON.stringify(result, null, 2))
