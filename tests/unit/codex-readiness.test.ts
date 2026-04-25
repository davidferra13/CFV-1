import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildMarkdownBrief,
  extractProgressBlock,
  extractUncheckedChecklistItems,
  parseGitStatusLines,
  selectExistingPackageScripts,
  summarizeGitignoreNoise,
  summarizeSyncStatus,
} from '../../scripts/lib/codex-readiness-core.mjs'

test('parseGitStatusLines groups porcelain status lines and sorts changed paths', () => {
  const result = parseGitStatusLines([
    ' M app/page.tsx',
    'A  scripts/new-tool.mjs',
    'D  docs/old.md',
    'R  docs/draft.md -> docs/final.md',
    '?? tmp-note.md',
  ])

  assert.deepEqual(result.statusCounts, {
    modified: 1,
    added: 1,
    deleted: 1,
    renamed: 1,
    untracked: 1,
  })
  assert.deepEqual(result.changedPaths, [
    'app/page.tsx',
    'docs/final.md',
    'docs/old.md',
    'scripts/new-tool.mjs',
    'tmp-note.md',
  ])
  assert.equal(result.entries[3].category, 'renamed')
})

test('extractUncheckedChecklistItems returns unchecked items with section context', () => {
  const markdown = [
    '# Blueprint',
    '## V1 Exit Criteria',
    '### Must-Have (Blocks Launch)',
    '- [x] Done item',
    '- [ ] At least 1 real chef has used it for 2+ weeks and provided feedback',
    '### Should-Have (Ship Without, Fix Fast)',
    '- [ ] Wave-1 operator survey launched and analyzed',
  ].join('\n')

  const items = extractUncheckedChecklistItems(markdown)

  assert.equal(items.length, 2)
  assert.equal(items[0].text, 'At least 1 real chef has used it for 2+ weeks and provided feedback')
  assert.deepEqual(items[0].headingPath, [
    'Blueprint',
    'V1 Exit Criteria',
    'Must-Have (Blocks Launch)',
  ])
  assert.equal(items[1].section, 'Should-Have (Ship Without, Fix Fast)')
})

test('extractProgressBlock parses progress percentages into stable keys', () => {
  const progress = extractProgressBlock(
    [
      '```',
      'BUILD COMPLETENESS    [=============================-] 95%',
      'VALIDATION            [===-------------------------] 10%',
      'LAUNCH READINESS      [======----------------------] 25%',
      '```',
    ].join('\n')
  )

  assert.equal(progress.buildCompleteness.percent, 95)
  assert.equal(progress.validation.percent, 10)
  assert.equal(progress.launchReadiness.label, 'Launch Readiness')
})

test('summarizeSyncStatus surfaces failed sync fields and attention markers', () => {
  const summary = summarizeSyncStatus({
    status: 'failed',
    last_error: 'timed out after 5400.0s',
    last_success_at: null,
    last_failure_at: '2026-04-24T14:17:27.634Z',
    last_elapsed_s: 5400,
    run_id: 'openclaw-full-1777034847611',
    summary: {
      failedStepNames: ['Pull catalog from Pi'],
      steps: [{ name: 'Refresh prices', status: 'failed' }],
    },
  })

  assert.equal(summary.status, 'failed')
  assert.equal(summary.lastError, 'timed out after 5400.0s')
  assert.equal(summary.elapsedSeconds, 5400)
  assert.deepEqual(summary.failedStepNames, ['Pull catalog from Pi', 'Refresh prices'])
  assert.deepEqual(summary.attentionRequired, [
    'sync status is failed',
    'sync last success is missing',
  ])
})

test('selectExistingPackageScripts keeps only desired scripts present in package.json', () => {
  const selected = selectExistingPackageScripts(
    {
      scripts: {
        typecheck: 'tsc --noEmit',
        'test:unit': 'node --test',
      },
    },
    ['typecheck', 'typecheck:scripts', 'test:unit']
  )

  assert.deepEqual(selected, [
    {
      name: 'typecheck',
      invocation: 'npm run typecheck',
      command: 'tsc --noEmit',
    },
    {
      name: 'test:unit',
      invocation: 'npm run test:unit',
      command: 'node --test',
    },
  ])
})

test('summarizeGitignoreNoise groups ignored generated artifacts relevant to Codex', () => {
  const noise = summarizeGitignoreNoise(
    [
      '/.next/',
      '/playwright-report/',
      '*.log',
      'backups/',
      'screenshots/',
      'tmp/',
      '/src-tauri/target/',
      '/data/email-references/privatechefmanager-yhangry/',
    ].join('\n')
  )

  assert.deepEqual(
    noise.map((item) => item.category),
    [
      'Next build outputs',
      'Playwright outputs',
      'logs',
      'backups',
      'screenshots',
      'temp directories',
      'Tauri build output',
      'local data and private exports',
    ]
  )
  assert.deepEqual(noise[0].patterns, ['/.next/'])
})

test('buildMarkdownBrief emits required sections in order and stays concise', () => {
  const markdown = buildMarkdownBrief({
    generatedAt: '2026-04-24T18:00:00.000Z',
    productTruth: {
      operatorFirst: true,
      source: 'docs/project-definition-and-scope.md',
    },
    launch: {
      progress: {
        buildCompleteness: { label: 'Build Completeness', percent: 95 },
        validation: { label: 'Validation', percent: 10 },
        launchReadiness: { label: 'Launch Readiness', percent: 25 },
      },
      uncheckedItems: [
        {
          text: 'Public booking page tested end-to-end by a non-developer',
          section: 'Must-Have (Blocks Launch)',
          lineNumber: 201,
        },
      ],
    },
    workspace: {
      branch: 'main',
      statusCounts: {
        modified: 2,
        added: 1,
        deleted: 0,
        renamed: 0,
        untracked: 1,
      },
      changedPathsSample: ['docs/product-blueprint.md'],
      changedPathsRemaining: 4,
    },
    operationalHealth: {
      sync: {
        status: 'failed',
        lastError: 'timed out after 5400.0s',
        lastSuccessAt: null,
        lastFailureAt: '2026-04-24T14:17:27.634Z',
        elapsedSeconds: 5400,
        runId: 'openclaw-full-1777034847611',
        failedStepNames: ['Pull catalog from Pi'],
      },
      liveOpsGuardian: {
        runId: 'live-ops-1',
        ranAt: '2026-04-24T18:15:49.0960193Z',
        changedPathCount: 397,
        newChangesDetected: true,
      },
      attentionRequired: ['sync status is failed'],
    },
    verificationCommands: [
      {
        name: 'typecheck',
        invocation: 'npm run typecheck',
        command: 'node scripts/run-release-typecheck.mjs',
      },
    ],
    artifactNoise: [
      {
        category: 'Next build outputs',
        patterns: ['/.next/'],
      },
    ],
    recommendation: {
      title: 'Prioritize launch validation and operational health',
      rationale: 'Validation and sync health are the current bottlenecks.',
      evidence: ['docs/product-blueprint.md:197', 'docs/sync-status.json:7'],
    },
    warnings: [],
  })

  const sections = [
    '## Product Truth',
    '## Launch Blockers',
    '## Workspace State',
    '## Operational Health',
    '## Verification Commands',
    '## Artifact Noise',
    '## Recommended Next Agent Task',
  ]

  let previousIndex = -1
  for (const section of sections) {
    const index = markdown.indexOf(section)
    assert.ok(index > previousIndex, `${section} should appear after the previous section`)
    previousIndex = index
  }

  assert.match(markdown, /does not add user-facing OpenAI/)
  assert.match(markdown, /timed out after 5400\.0s/)
  assert.match(markdown, /Public booking page tested end-to-end by a non-developer/)
  assert.match(markdown, /npm run typecheck/)
  assert.ok(markdown.split(/\r?\n/).length <= 250)
})
