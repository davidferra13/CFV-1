import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildCollisionPreflight,
  buildPromptManifest,
  buildSecurityAppendix,
  extractFileReferences,
  formatCollisionPreflight,
  formatVerificationRecommendation,
  inferSecuritySurface,
  parseGitStatusPaths,
  recommendVerification,
} from '../../scripts/lib/prompt-workflow-core.mjs'

test('extractFileReferences finds repo paths in prompt text', () => {
  const files = extractFileReferences(
    'Touch app/(chef)/settings/page.tsx and lib/auth/route-policy.ts.'
  )

  assert.deepEqual(files, ['app/(chef)/settings/page.tsx', 'lib/auth/route-policy.ts'])
})

test('buildCollisionPreflight reports dirty and queue file overlap', () => {
  const preflight = buildCollisionPreflight({
    prompt: 'Update app/(chef)/settings/page.tsx and components/theme/theme-toggle.tsx.',
    gitStatus: ' M app/(chef)/settings/page.tsx\n M package.json',
    queueItems: [
      {
        content: 'Also needs components/theme/theme-toggle.tsx',
      },
    ],
  })

  assert.equal(preflight.risk, 'high')
  assert.deepEqual(preflight.dirtyCollisions, ['app/(chef)/settings/page.tsx'])
  assert.deepEqual(preflight.queueCollisions, ['components/theme/theme-toggle.tsx'])
  assert.match(formatCollisionPreflight(preflight), /Do not let parallel agents edit/)
})

test('recommendVerification maps files to focused commands and runtime checks', () => {
  const recommendation = recommendVerification({
    files: ['app/(chef)/settings/page.tsx', 'lib/auth/route-policy.ts', 'scripts/prompt-lint.mjs'],
  })

  assert.ok(recommendation.commands.includes('npm run typecheck'))
  assert.ok(
    recommendation.commands.some((command) => command.includes('middleware.routing.test.ts'))
  )
  assert.ok(recommendation.commands.includes('node --check "scripts/prompt-lint.mjs"'))
  assert.match(formatVerificationRecommendation(recommendation), /browser console/)
})

test('security appendix detects protected surfaces and emits ChefFlow invariants', () => {
  const surface = inferSecuritySurface('Add an app/api route with tenant_id and admin access.')
  const appendix = buildSecurityAppendix('Add an app/api route with tenant_id and admin access.')

  assert.equal(surface.needsSecurity, true)
  assert.equal(surface.apiRoute, true)
  assert.equal(surface.admin, true)
  assert.match(appendix.appendix, /requireAdmin/)
  assert.match(appendix.appendix, /tenant_id/)
})

test('buildPromptManifest links prompt lifecycle artifacts', () => {
  const manifest = buildPromptManifest({
    runId: 'RUN-1',
    rawIdea: 'restore theme',
    promptPath: 'docs/prompts/generated/theme.md',
    lintScore: 100,
    contextPackPath: '.agents/build-queue/runs/RUN-1/context-pack.md',
    queueIds: ['BQ-1'],
    finalReportPath: '.agents/build-queue/runs/RUN-1/final-report.md',
    debriefPath: 'docs/prompts/generated/theme-debrief.md',
    generatedAt: '2026-05-15T00:00:00.000Z',
  })

  assert.match(manifest, /Run ID: RUN-1/)
  assert.match(manifest, /Prompt lint score: 100/)
  assert.match(manifest, /BQ-1/)
  assert.match(manifest, /finish-check/)
})

test('parseGitStatusPaths strips porcelain status prefixes', () => {
  assert.deepEqual(parseGitStatusPaths(' M package.json\n?? scripts/foo.mjs'), [
    'package.json',
    'scripts/foo.mjs',
  ])
})
