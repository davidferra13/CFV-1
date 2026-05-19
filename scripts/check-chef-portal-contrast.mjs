import { readFileSync } from 'node:fs'
import { relative } from 'node:path'

const ROOT = process.cwd()

const TARGETS = [
  'components/ui/badge.tsx',
  'components/ui/button.tsx',
  'components/ui/status-badge.tsx',
  'components/events/event-status-badge.tsx',
  'components/rail/rail-item-row.tsx',
  'components/rail/rail-intel-card.tsx',
  'components/discovery/universal-rail.tsx',
  'app/(chef)/events/[id]/ops/ops-hub-view.tsx',
  'app/(chef)/events/[id]/_components/event-detail-tickets-tab.tsx',
  'app/(chef)/events/[id]/pack/page.tsx',
  'app/globals.css',
]

const RISKY_PATTERNS = [
  {
    name: 'fixed white text in event/ticket surfaces',
    pattern: /\btext-white\b/,
    allow: (file, line) =>
      file.endsWith('button.tsx') ||
      file.endsWith('contrast-contract.ts') ||
      /focus:text-white|color:\s*#ffffff|color:\s*#fff|text-white !important/.test(line),
  },
  {
    name: 'same-ramp dark status pair',
    pattern: /\bbg-(red|amber|yellow|orange|emerald|green|brand)-9[05]0(?:\/\d+)?[^'"]*\btext-\1-[789]00\b/,
  },
  {
    name: 'low-contrast amber/orange CTA',
    pattern: /\bbg-(amber|orange)-6\d0[^'"]*\btext-white\b/,
  },
  {
    name: 'fixed white card wrapper',
    pattern: /\bbg-white\b/,
    allow: (file) => file.endsWith('globals.css'),
  },
]

const violations = []

for (const target of TARGETS) {
  let text
  try {
    text = readFileSync(target, 'utf8')
  } catch {
    continue
  }

  const lines = text.split(/\r?\n/)
  lines.forEach((line, index) => {
    for (const rule of RISKY_PATTERNS) {
      if (!rule.pattern.test(line)) continue
      if (rule.allow?.(target, line)) continue
      violations.push({
        file: relative(ROOT, target),
        line: index + 1,
        rule: rule.name,
        text: line.trim(),
      })
    }
  })
}

if (violations.length > 0) {
  console.error('Chef portal contrast gate failed:')
  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.line} ${violation.rule}: ${violation.text.slice(0, 180)}`
    )
  }
  process.exitCode = 1
} else {
  console.log(`Chef portal contrast gate passed (${TARGETS.length} targets scanned).`)
}
