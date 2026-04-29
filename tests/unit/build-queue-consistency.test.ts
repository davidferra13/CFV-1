import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { auditBuildQueueConsistency } from '../../devtools/build-queue-consistency.mjs'

async function makeFixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'build-queue-consistency-'))
  await fs.mkdir(path.join(root, 'system', 'build-queue'), { recursive: true })
  await fs.mkdir(path.join(root, 'lib', 'build-queue'), { recursive: true })
  return root
}

async function writeFixtureFile(root: string, relativePath: string, contents = '# Queue Item\n') {
  const absolutePath = path.join(root, relativePath)
  await fs.mkdir(path.dirname(absolutePath), { recursive: true })
  await fs.writeFile(absolutePath, contents, 'utf8')
}

test('detects deleted tracked queue files and untracked queue files from fixture inputs', async () => {
  const root = await makeFixture()

  await writeFixtureFile(root, 'system/build-queue/001-alpha.md')
  await writeFixtureFile(root, 'system/build-queue/003-gamma.md')

  const report = await auditBuildQueueConsistency({
    rootDir: root,
    trackedQueueFiles: [
      'system/build-queue/001-alpha.md',
      'system/build-queue/002-beta.md',
    ],
  })

  assert.equal(report.ok, false)
  assert.deepEqual(report.issues.deletedTrackedQueueFiles, ['system/build-queue/002-beta.md'])
  assert.deepEqual(report.issues.untrackedQueueFiles, ['system/build-queue/003-gamma.md'])
})

test('detects duplicate numeric prefixes among current queue files', async () => {
  const root = await makeFixture()

  await writeFixtureFile(root, 'system/build-queue/001-alpha.md')
  await writeFixtureFile(root, 'system/build-queue/001-beta.md')
  await writeFixtureFile(root, 'system/build-queue/002-gamma.md')

  const report = await auditBuildQueueConsistency({
    rootDir: root,
    trackedQueueFiles: [
      'system/build-queue/001-alpha.md',
      'system/build-queue/001-beta.md',
      'system/build-queue/002-gamma.md',
    ],
  })

  assert.deepEqual(report.issues.duplicateNumericPrefixes, [
    {
      prefix: '001',
      files: ['system/build-queue/001-alpha.md', 'system/build-queue/001-beta.md'],
    },
  ])
})

test('detects stale capability registry queuePath references when registry exists', async () => {
  const root = await makeFixture()

  await writeFixtureFile(root, 'system/build-queue/001-present.md')
  await writeFixtureFile(
    root,
    'lib/build-queue/capability-registry.ts',
    `export const BUILD_CAPABILITY_REGISTRY = [
  { queuePath: 'system/build-queue/001-present.md' },
  {
    queuePath:
      'system/build-queue/002-missing.md',
  },
]
`
  )

  const report = await auditBuildQueueConsistency({
    rootDir: root,
    trackedQueueFiles: ['system/build-queue/001-present.md'],
  })

  assert.equal(report.registry.exists, true)
  assert.equal(report.registry.checkedReferences, 2)
  assert.deepEqual(report.issues.staleRegistryReferences, [
    {
      queuePath: 'system/build-queue/002-missing.md',
      registryFile: 'lib/build-queue/capability-registry.ts',
    },
  ])
})

test('prints JSON and only fails on drift when strict mode is enabled', async () => {
  const root = await makeFixture()

  await writeFixtureFile(root, 'system/build-queue/001-alpha.md')

  const scriptPath = path.join(process.cwd(), 'devtools', 'build-queue-consistency.mjs')
  const defaultResult = spawnSync(process.execPath, [scriptPath, '--root', root], {
    encoding: 'utf8',
    windowsHide: true,
  })
  const strictResult = spawnSync(process.execPath, [scriptPath, '--root', root, '--strict'], {
    encoding: 'utf8',
    windowsHide: true,
  })

  assert.equal(defaultResult.status, 0)
  assert.equal(JSON.parse(defaultResult.stdout).ok, false)
  assert.equal(strictResult.status, 1)
  assert.equal(JSON.parse(strictResult.stdout).ok, false)
})
