import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPromptArchive } from '../../scripts/lib/prompt-archive-core.mjs'

test('buildPromptArchive creates deterministic docs and run archive paths', () => {
  const archive = buildPromptArchive({
    title: 'Restore Light Default Theme',
    date: '2026-05-15',
    runId: 'RUN-123',
    source: 'tmp/prompt.md',
    prompt: 'COPY-PASTE PROMPT\nBuild the theme.',
  })

  assert.equal(archive.slug, 'restore-light-default-theme')
  assert.equal(archive.docsPath, 'docs/prompts/generated/2026-05-15-restore-light-default-theme.md')
  assert.equal(archive.runPath, '.agents/build-queue/runs/RUN-123/prompt.md')
  assert.match(archive.content, /run_id: "RUN-123"/)
  assert.match(archive.content, /COPY-PASTE PROMPT/)
})
