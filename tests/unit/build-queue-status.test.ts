import test from 'node:test'
import assert from 'node:assert/strict'

import {
  parseBuildQueueFrontmatter,
  parseBuildQueueMarkdown,
  summarizeBuildQueueStatuses,
} from '@/lib/build-queue/queue-status'

test('parseBuildQueueMarkdown defaults missing status to pending', () => {
  const item = parseBuildQueueMarkdown(
    'system/build-queue/100-default-status.md',
    `---
priority: "high"
category: "ops"
source: "Planner"
confidence: "medium"
---
# Default Status
`
  )

  assert.equal(item.status, 'pending')
  assert.equal(item.priority, 'high')
  assert.equal(item.category, 'ops')
  assert.equal(item.source, 'Planner')
  assert.equal(item.confidence, 'medium')
  assert.equal(item.title, 'Default Status')
  assert.equal(item.path, 'system/build-queue/100-default-status.md')
})

test('parseBuildQueueMarkdown preserves built status', () => {
  const item = parseBuildQueueMarkdown(
    'system/build-queue/101-built.md',
    `---
status: "built"
priority: "low"
---
# Built Queue Item
`
  )

  assert.equal(item.status, 'built')
  assert.equal(item.title, 'Built Queue Item')
})

test('parseBuildQueueMarkdown normalizes in-progress status variants', () => {
  const hyphenated = parseBuildQueueMarkdown(
    'system/build-queue/102-in-progress.md',
    `---
status: "in_progress"
---
# In Progress Queue Item
`
  )

  const spaced = parseBuildQueueMarkdown(
    'system/build-queue/103-in-progress.md',
    `---
status: "in progress"
---
# In Progress Queue Item
`
  )

  assert.equal(hyphenated.status, 'in-progress')
  assert.equal(spaced.status, 'in-progress')
})

test('summarizeBuildQueueStatuses counts core statuses and other statuses', () => {
  const summary = summarizeBuildQueueStatuses([
    { status: 'pending' },
    { status: undefined },
    { status: 'in_progress' },
    { status: 'in-progress' },
    { status: 'built' },
    { status: 'blocked' },
  ])

  assert.deepEqual(summary, {
    total: 6,
    pending: 2,
    inProgress: 2,
    built: 1,
    other: 1,
  })
})

test('parseBuildQueueFrontmatter returns data and markdown body', () => {
  const parsed = parseBuildQueueFrontmatter(`---
status: "pending"
title: "Frontmatter Title"
---
# Body Title
`)

  assert.deepEqual(parsed.data, {
    status: 'pending',
    title: 'Frontmatter Title',
  })
  assert.equal(parsed.body, '# Body Title\n')
})
