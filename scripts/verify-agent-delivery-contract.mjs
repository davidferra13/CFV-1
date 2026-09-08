import { readFileSync } from 'node:fs'

const requirements = [
  ['AGENTS.md', 'Never require a second prompt containing "fire the queue", "commit", "push", "publish", or "deploy".'],
  ['CLAUDE.md', '@docs/autonomous-delivery-contract.md'],
  ['CLAUDE.md', '**SHIP THE RESULT.**'],
  ['.agents/rules/autonomous-delivery.md', 'Always-On Autonomous Delivery'],
  ['docs/autonomous-delivery-contract.md', 'Do not wait for David to separately say'],
  ['docs/definition-of-done.md', '## Delivery Closure'],
  ['scripts/install-global-agent-delivery-policy.ps1', 'BEGIN DAVID AUTONOMOUS DELIVERY V1'],
  ['.claude/hooks/context-load-guard.sh', 'install-global-agent-delivery-policy.ps1'],
]

const forbidden = [
  ['AGENTS.md', 'Do not start feature work from casual phrasing like "build this"'],
  ['AGENTS.md', 'Implementation is allowed only when the user explicitly says one of'],
  ['CLAUDE.md', 'Push to GitHub at session end.'],
]

const failures = []

for (const [path, phrase] of requirements) {
  let content
  try {
    content = readFileSync(path, 'utf8')
  } catch (error) {
    failures.push(`${path}: missing or unreadable (${error.message})`)
    continue
  }

  if (!content.includes(phrase)) {
    failures.push(`${path}: missing required delivery rule: ${phrase}`)
  }
}

for (const [path, phrase] of forbidden) {
  const content = readFileSync(path, 'utf8')
  if (content.includes(phrase)) {
    failures.push(`${path}: obsolete manual-gate rule remains: ${phrase}`)
  }
}

if (failures.length > 0) {
  console.error('Autonomous delivery contract verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Autonomous delivery contract verified.')
