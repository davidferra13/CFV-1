import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'

const CLI = ['scripts/cheflow.mjs']

function runCli(args: string[]) {
  return spawnSync(process.execPath, [...CLI, ...args], {
    encoding: 'utf8',
  })
}

describe('ChefFlow CLI', () => {
  it('prints the umbrella command list', () => {
    const output = execFileSync(process.execPath, [...CLI, 'help'], {
      encoding: 'utf8',
    })

    assert.match(output, /ChefFlow CLI/)
    assert.match(output, /cockpit/)
    assert.match(output, /next/)
    assert.match(output, /push-check/)
    assert.match(output, /ai-gate/)
    assert.match(output, /closeout/)
    assert.match(output, /task/)
    assert.match(output, /risk/)
    assert.match(output, /review/)
    assert.match(output, /claim/)
  })

  it('explains command safety metadata', () => {
    const result = runCli(['explain', 'guard', '--json'])

    assert.equal(result.status, 0)
    const parsed = JSON.parse(result.stdout)
    assert.equal(parsed.ok, true)
    assert.equal(parsed.command, 'guard')
    assert.equal(parsed.mode, 'read-only')
  })

  it('blocks main pushes before execution', () => {
    const result = runCli(['guard', '--', 'git', 'push', 'origin', 'main', '--json'])

    assert.equal(result.status, 1)
    const parsed = JSON.parse(result.stdout)
    assert.equal(parsed.ok, false)
    assert.equal(parsed.blocked[0].id, 'push-main')
  })

  it('blocks restricted platform references before execution', () => {
    const restrictedName = ['ver', 'cel'].join('')
    const result = runCli(['policy', '--json', '--', 'recommend', restrictedName])

    assert.equal(result.status, 1)
    const parsed = JSON.parse(result.stdout)
    assert.equal(parsed.ok, false)
    assert.equal(parsed.restricted.findings[0].id, 'restricted-platform')
  })

  it('builds a migration plan with a strictly higher timestamp', () => {
    const result = runCli(['migrate', 'plan', '--json'])

    assert.equal(result.status, 0)
    const parsed = JSON.parse(result.stdout)
    assert.equal(parsed.directory, 'database/migrations')
    assert.match(parsed.nextTimestamp, /^\d{14}$/)
    if (parsed.highest) {
      assert.ok(Number(parsed.nextTimestamp) > parsed.highest)
    }
  })

  it('runs every read-only command center as JSON', () => {
    const commands = [
      ['status'],
      ['cockpit'],
      ['next', '--owned', 'scripts/cheflow.mjs,tests/unit/cheflow-cli.test.ts'],
      ['claims'],
      ['closeout'],
      ['task', 'start', '--prompt', 'Build CLI operator flow', '--owned', 'scripts/cheflow.mjs'],
      ['validate', '--files', 'scripts/cheflow.mjs,tests/unit/cheflow-cli.test.ts'],
      [
        'validate',
        'run',
        '--dry-run',
        '--files',
        'scripts/cheflow.mjs,tests/unit/cheflow-cli.test.ts',
      ],
      ['continuity'],
      ['evidence', '--owned', 'scripts/cheflow.mjs,tests/unit/cheflow-cli.test.ts'],
      ['evidence', 'diff', '--owned', 'scripts/cheflow.mjs,tests/unit/cheflow-cli.test.ts'],
      ['review', '--owned', 'scripts/cheflow.mjs,tests/unit/cheflow-cli.test.ts'],
      ['claim', 'conflicts', '--owned', 'scripts/cheflow.mjs'],
      ['db'],
      ['ledger'],
      ['event'],
      ['pricing'],
      ['ai'],
      ['persona'],
      ['agent'],
      ['qa'],
      ['ops'],
      ['docs'],
    ]

    for (const command of commands) {
      const result = runCli([...command, '--json'])

      assert.equal(result.status, 0, `${command.join(' ')} failed: ${result.stderr}`)
      assert.doesNotThrow(
        () => JSON.parse(result.stdout),
        `${command.join(' ')} did not print JSON`
      )
    }
  })

  it('selects focused validation for CLI changes', () => {
    const result = runCli([
      'validate',
      '--files',
      'scripts/cheflow.mjs,tests/unit/cheflow-cli.test.ts',
      '--json',
    ])

    assert.equal(result.status, 0)
    const parsed = JSON.parse(result.stdout)
    assert.ok(parsed.commands.includes('node --check scripts/cheflow.mjs'))
    assert.ok(parsed.commands.includes('node --test --import tsx tests/unit/cheflow-cli.test.ts'))
  })

  it('accepts file lists split into positional shell arguments', () => {
    const result = runCli([
      'validate',
      '--files',
      'scripts/cheflow.mjs',
      'tests/unit/cheflow-cli.test.ts',
      'package.json',
      '--json',
    ])

    assert.equal(result.status, 0)
    const parsed = JSON.parse(result.stdout)
    assert.deepEqual(parsed.files, [
      'scripts/cheflow.mjs',
      'tests/unit/cheflow-cli.test.ts',
      'package.json',
    ])
    assert.ok(parsed.commands.includes('node --check scripts/cheflow.mjs'))
  })

  it('prints push readiness blockers as structured data', () => {
    const result = runCli([
      'push-check',
      '--owned',
      'scripts/cheflow.mjs,tests/unit/cheflow-cli.test.ts',
      '--json',
    ])

    assert.doesNotThrow(() => JSON.parse(result.stdout))
    const parsed = JSON.parse(result.stdout)
    assert.ok(Array.isArray(parsed.blockers))
    assert.ok(Array.isArray(parsed.warnings))
    assert.equal(
      parsed.blockers.some((blocker: { id: string }) => blocker.id === 'dependency-truth'),
      false
    )
    assert.ok(parsed.validation.commands.length > 0)
  })

  it('prints severity-ranked risk reports even when the repo has existing risks', () => {
    const result = runCli([
      'risk',
      '--owned',
      'scripts/cheflow.mjs,tests/unit/cheflow-cli.test.ts',
      '--json',
    ])

    assert.doesNotThrow(() => JSON.parse(result.stdout))
    const parsed = JSON.parse(result.stdout)
    assert.ok(Array.isArray(parsed.findings))
    assert.ok(parsed.summary)
  })

  it('traces missing dependency references to import sites', () => {
    const result = runCli(['deps', 'trace', '--json'])

    assert.doesNotThrow(() => JSON.parse(result.stdout))
    const parsed = JSON.parse(result.stdout)
    assert.ok(Array.isArray(parsed.traces))
  })

  it('explains push blockers with operator guidance', () => {
    const result = runCli([
      'explain',
      'blockers',
      '--owned',
      'scripts/cheflow.mjs,tests/unit/cheflow-cli.test.ts',
      '--json',
    ])

    assert.doesNotThrow(() => JSON.parse(result.stdout))
    const parsed = JSON.parse(result.stdout)
    assert.equal(parsed.command, 'explain blockers')
    assert.ok(Array.isArray(parsed.blockers))
  })

  it('prints migration proposals without writing migration files', () => {
    const result = runCli(['migrate', 'propose', '--json'])

    assert.equal(result.status, 1)
    const parsed = JSON.parse(result.stdout)
    assert.equal(parsed.proposed.approvalRequired, true)
    assert.equal(parsed.proposed.findings[0].id, 'sql-file-required')
  })
})
