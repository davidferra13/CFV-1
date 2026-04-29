import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..')

describe('Remy command dispatch architecture', () => {
  it('keeps core task dispatch table-driven instead of switch-driven', () => {
    const source = readFileSync(join(ROOT, 'lib/ai/command-orchestrator.ts'), 'utf8')

    assert.match(source, /const CORE_COMMAND_TASK_EXECUTORS/)
    assert.match(source, /executeCoreCommandTask\(task, \{/)
    assert.doesNotMatch(source, /switch \(task\.taskType\)/)
  })

  it('keeps important aliases in the core command registry', () => {
    const source = readFileSync(join(ROOT, 'lib/ai/command-orchestrator.ts'), 'utf8')

    for (const taskType of [
      'client.search',
      'email.followup',
      'client.dietary_restrictions',
      'email.status',
      'navigation.goto',
    ]) {
      assert.match(source, new RegExp(`'${taskType}'\\s*:`))
    }
  })
})
