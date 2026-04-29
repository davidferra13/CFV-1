#!/usr/bin/env node
import path from 'node:path'
import {
  guidanceInboxRoot,
  nowStamp,
  parseArgs,
  readStdin,
  shortHash,
  slugify,
  writeJson,
} from './agent-skill-utils.mjs'

const categories = [
  {
    name: 'hard-stop',
    terms: ['never', 'hard stop', 'must not', 'forbidden', 'approval'],
    route: 'AGENTS.md or the smallest safety skill',
  },
  {
    name: 'agent-behavior',
    terms: ['codex should', 'always', 'from now on', 'self-heal', 'skill', 'omninet'],
    route: 'skill-garden',
  },
  {
    name: 'workflow',
    terms: ['workflow', 'process', 'steps', 'checklist', 'closeout', 'handoff'],
    route: 'specific workflow skill or new skill',
  },
  {
    name: 'persona-material',
    terms: ['persona', 'chef', 'client', 'guest', 'vendor', 'staff'],
    route: 'persona-dump',
  },
  {
    name: 'product-gap',
    terms: ['feature', 'gap', 'missing', 'should build', 'user needs'],
    route: 'findings-triage before build work',
  },
]

function splitSegments(text) {
  return text
    .split(/\n(?=#{1,6}\s+|\d+\.\s+|[-*]\s+|CHUNK\s+\d+|---+\s*$)/gim)
    .map((part) => part.trim())
    .filter(Boolean)
}

function classify(segment) {
  const lower = segment.toLowerCase()
  const scored = categories.map((category) => ({
    ...category,
    score: category.terms.reduce((sum, term) => sum + (lower.includes(term) ? 1 : 0), 0),
  }))
  scored.sort((a, b) => b.score - a.score)
  return scored[0].score ? scored[0] : { name: 'uncategorized', route: 'manual review', score: 0 }
}

const args = parseArgs()
const source = args.source || 'external-guidance'
const text = (args.text || readStdin()).trim()

if (!text) {
  console.error('Provide guidance text through stdin or --text.')
  process.exit(1)
}

const segments = splitSegments(text)
const items = segments.map((segment, index) => {
  const classification = classify(segment)
  const firstLine = segment.split(/\r?\n/)[0].replace(/^[-*#\d.\s]+/, '').trim()
  return {
    id: `${slugify(source)}-${String(index + 1).padStart(3, '0')}-${shortHash(segment)}`,
    source,
    title: firstLine.slice(0, 120) || `Guidance ${index + 1}`,
    category: classification.name,
    route: classification.route,
    confidence: classification.score,
    excerpt: segment.slice(0, 1200),
  }
})

const stamp = nowStamp()
const outFile = path.join(guidanceInboxRoot, `${stamp}-${slugify(source)}.json`)
writeJson(outFile, {
  source,
  created_at: new Date().toISOString(),
  total_segments: items.length,
  items,
})

for (const item of items) {
  console.log(`${item.category} -> ${item.route}: ${item.title}`)
}
console.log(`\nWrote ${items.length} guidance item(s) to ${outFile.replace(/\\/g, '/')}`)

