import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildRepairTemplate,
  detectPromptMode,
  formatPromptLintReport,
  lintPrompt,
} from '../../scripts/lib/prompt-lint-core.mjs'

const strongFirePrompt = `
COPY-PASTE PROMPT

Raw idea:
Restore light default theme.

Objective:
Build the fired queue item.

Canonical context to read first:
- AGENTS.md
- .claude/skills/omninet/SKILL.md
- docs/.codex-workspace-brief.md
- .agents/build-queue/run-lifecycle.md

Before coding:
- Run git status --short.
- Check build-queue active, in-flight, blocked, and domain-plan status.
- Preserve unrelated dirty work. Do not overwrite unrelated dirty work.
- Define file ownership boundaries and non-overlapping lanes.
- Inspect current code before relying on stale docs. Do not invent files.

Build requirements:
- Enforce permissions server-side.
- Include auth, tenant scoping, route-policy, and requireAdmin checks where relevant.
- Do not start implementation unless explicitly authorized by queue fire.

Finish gate:
- Run focused tests and typecheck.
- Check runtime and browser console.
- Capture Runtime proof.
- Create proof-pack evidence.
- Run finish-check.

Final report:
- Run ID.
- in-flight queue items.
- context-pack status.
- wave plan.
`

test('detectPromptMode identifies fire-ready prompts', () => {
  assert.equal(detectPromptMode(strongFirePrompt), 'fire')
})

test('lintPrompt passes a strong fire-ready ChefFlow prompt', () => {
  const result = lintPrompt(strongFirePrompt, { mode: 'fire' })

  assert.equal(result.passed, true)
  assert.equal(result.score, 100)
  assert.equal(result.missing.length, 0)
})

test('lintPrompt fails vague prompts and explains missing safeguards', () => {
  const result = lintPrompt('Build the theme system and make it look good.', {
    mode: 'fire',
  })

  assert.equal(result.passed, false)
  assert.ok(result.score < 20)
  assert.ok(result.missing.some((check) => check.id === 'rawRequest'))
  assert.ok(result.missing.some((check) => check.id === 'proofGate'))
})

test('formatPromptLintReport returns a readable pass/fail report', () => {
  const result = lintPrompt('Build the theme system and make it look good.')
  const report = formatPromptLintReport(result)

  assert.match(report, /Prompt lint: FAIL/)
  assert.match(report, /Missing or weak:/)
  assert.match(report, /Raw request preserved/)
})

test('buildRepairTemplate returns a copy-paste-ready repaired prompt', () => {
  const result = lintPrompt('Build the thing.', { mode: 'fire' })
  const repair = buildRepairTemplate(result, {
    mode: 'fire',
    originalPrompt: 'Build the thing.',
  })

  assert.match(repair, /^COPY-PASTE PROMPT/)
  assert.match(repair, /Build the thing\./)
  assert.match(repair, /AGENTS\.md/)
  assert.match(repair, /git status --short/)
  assert.match(repair, /finish-check/)
  assert.match(repair, /requireAdmin/)
})
