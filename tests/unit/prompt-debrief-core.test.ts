import test from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzePromptDebrief,
  formatPromptDebrief,
} from '../../scripts/lib/prompt-debrief-core.mjs'

test('analyzePromptDebrief detects proof signals and prompt misses', () => {
  const analysis = analyzePromptDebrief({
    prompt: 'COPY-PASTE PROMPT\nBuild the queue item.',
    report: `
Changed files:
- app/(chef)/settings/page.tsx

Verification:
- npm test PASS

Runtime proof:
- Hard refresh complete. Browser console clean.

Proof-pack status:
- finish-check PASS

Security:
- tenant scope and auth checked.
`,
  })

  assert.equal(analysis.passedSignals, 5)
  assert.equal(analysis.outcomeScore, 90)
  assert.ok(analysis.promptMisses.some((miss) => /acceptance criteria/i.test(miss)))

  const report = formatPromptDebrief(analysis)
  assert.match(report, /Outcome Signals/)
  assert.match(report, /Signal coverage: 5\/6/)
  assert.match(report, /Outcome score: 90\/100/)
  assert.match(report, /Future Prompt Additions/)
})
