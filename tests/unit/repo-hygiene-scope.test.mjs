import assert from 'node:assert/strict'
import test from 'node:test'
import * as guard from '../../scripts/repo-hygiene-guard.mjs'

const production = 'C:\\Users\\David\\Documents\\CFv1'
const feature = 'C:\\Users\\David\\Documents\\CFv1-worktrees\\history-import-career-replay-20261001'
const ownProcess = {
  ProcessId: 101,
  ParentProcessId: 900,
  Name: 'powershell.exe',
  CommandLine: 'powershell.exe -File "' + feature + '\\scripts\\chefflow-watchdog.ps1"',
}
const externalProcess = {
  ProcessId: 202,
  ParentProcessId: 900,
  Name: 'powershell.exe',
  CommandLine: 'powershell.exe -File "' + production + '\\scripts\\chefflow-watchdog.ps1"',
}
function action(root, extras = {}) {
  return {
    Execute: 'powershell.exe',
    Arguments: '-File "' + root + '\\scripts\\chefflow-watchdog.ps1"',
    WorkingDirectory: root,
    ...extras,
  }
}
function task(actions, extras = {}) {
  return {
    TaskName: 'ChefFlow-Watchdog',
    TaskPath: '\\',
    State: 'Ready',
    Actions: actions,
    ...extras,
  }
}
test('workspace ownership normalizes Windows case and slash direction', () => {
  assert.equal(
    guard.isWorkspaceOwnedPath(feature.toLowerCase().replaceAll('\\', '/') + '/', feature),
    true
  )
  assert.equal(guard.isWorkspaceOwnedPath(feature + '\\scripts\\writer.mjs', feature), true)
  assert.equal(
    guard.isWorkspaceOwnedPath(feature + '\\..\\another-feature\\writer.mjs', feature),
    false
  )
})
test('exact path boundaries exclude prefix siblings and arbitrary substrings', () => {
  assert.equal(guard.isWorkspaceOwnedPath(feature, production), false)
  assert.equal(guard.isWorkspaceOwnedPath(production + '-backup\\writer.mjs', production), false)
  assert.equal(guard.isWorkspaceOwnedPath('prefix=' + feature, feature), false)
  assert.equal(guard.isWorkspaceOwnedPath('relative/scripts/writer.mjs', feature), false)
})
test('production writers do not block an isolated worktree while owned writers do', () => {
  assert.equal(guard.processBelongsToWorkspace(externalProcess, feature), false)
  assert.equal(guard.processBelongsToWorkspace(ownProcess, feature), true)
})
test('a path inside a descriptive substring cannot claim an external writer', () => {
  const described = {
    ...externalProcess,
    CommandLine: externalProcess.CommandLine + ' --description="' + feature + '"',
  }
  assert.equal(guard.processBelongsToWorkspace(described, feature), false)
})
test('owned and external scheduled actions are classified independently', () => {
  assert.equal(
    guard.scheduledTaskWorkspaceScope(task([action(production)]), feature).scope,
    'external'
  )
  const owned = guard.scheduledTaskWorkspaceScope(task([action(feature)]), feature)
  assert.equal(owned.scope, 'owned')
  assert.equal(owned.canDisable, true)
})
test('all actions must belong to the worktree before a task can be disabled', () => {
  const mixed = guard.scheduledTaskWorkspaceScope(
    task([action(feature), action(production)]),
    feature
  )
  assert.equal(mixed.scope, 'mixed')
  assert.equal(mixed.blocks, true)
  assert.equal(mixed.canDisable, false)
  assert.equal(
    guard.scheduledTaskWorkspaceScope(task([action(production), action(production)]), feature)
      .blocks,
    false
  )
  assert.equal(
    guard.scheduledTaskWorkspaceScope(task([action(feature), action(feature)]), feature).canDisable,
    true
  )
})
test('a current working directory can attribute relative script arguments', () => {
  assert.equal(
    guard.scheduledTaskWorkspaceScope(
      task([action(feature, { Arguments: '-File scripts/chefflow-watchdog.ps1' })]),
      feature
    ).scope,
    'owned'
  )
})
test('missing or unparseable named-task metadata fails closed without a disable target', () => {
  for (const scheduled of [
    task(null),
    task([]),
    task([action(feature, { Arguments: '-File "unterminated' })]),
    task([action(feature), { Execute: null, Arguments: null }]),
    task([action(feature)], { TaskPath: null }),
  ]) {
    const result = guard.scheduledTaskWorkspaceScope(scheduled, feature)
    assert.equal(result.blocks, true)
    assert.equal(result.canDisable, false)
  }
})
test('system executable installation paths do not make an owned action mixed', () => {
  const scheduled = task([
    action(feature, { Execute: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe' }),
  ])
  assert.equal(guard.scheduledTaskWorkspaceScope(scheduled, feature).scope, 'owned')
})
test('nested PowerShell command arguments retain exact workspace path ownership', () => {
  const scheduled = task([
    {
      Execute: 'powershell.exe',
      Arguments:
        "-Command \"& { Set-Location 'C:/Users/David/Documents/CFv1'; node 'C:/Users/David/Documents/CFv1/scripts/chefflow-watchdog.ps1' }\"",
      WorkingDirectory: null,
    },
  ])
  assert.equal(guard.scheduledTaskWorkspaceScope(scheduled, feature).scope, 'external')
})
test('unrelated scheduled task names are never treated as owned writer targets', () => {
  const result = guard.scheduledTaskWorkspaceScope(
    task([action(feature)], { TaskName: 'Unrelated-Family-Task' }),
    feature
  )
  assert.equal(result.blocks, false)
  assert.equal(result.canDisable, false)
})
test('stop selection never touches external writers or a shared PM2 parent', async () => {
  const commands = []
  const stopped = await guard.stopWriterProcesses([ownProcess, externalProcess], {
    platform: 'win32',
    root: feature,
    query: async () => [ownProcess],
    execute: async (_command, args) => {
      commands.push(args.join(' '))
      return { stdout: '' }
    },
  })
  assert.deepEqual(stopped, [101])
  assert.equal(commands.length, 1)
  assert.ok(commands[0].includes('Stop-Process -Id 101'))
  assert.ok(!commands[0].includes('900'))
})
test('a reused PID whose live command moved outside the workspace cannot be stopped', async () => {
  let stops = 0
  const stopped = await guard.stopWriterProcesses([ownProcess], {
    platform: 'win32',
    root: feature,
    query: async () => [{ ...externalProcess, ProcessId: ownProcess.ProcessId }],
    execute: async () => {
      stops++
      return { stdout: '' }
    },
  })
  assert.deepEqual(stopped, [])
  assert.equal(stops, 0)
})
test('a shared process that names writers in both worktrees blocks but cannot be stopped', async () => {
  const shared = {
    ...ownProcess,
    CommandLine:
      "powershell.exe -Command \"& { 'C:/Users/David/Documents/CFv1-worktrees/history-import-career-replay-20261001/scripts/chefflow-watchdog.ps1'; 'C:/Users/David/Documents/CFv1/scripts/chefflow-watchdog.ps1' }\"",
  }
  assert.equal(guard.processBelongsToWorkspace(shared, feature), true)
  let stops = 0
  const stopped = await guard.stopWriterProcesses([shared], {
    platform: 'win32',
    root: feature,
    query: async () => [shared],
    execute: async () => {
      stops++
      return { stdout: '' }
    },
  })
  assert.deepEqual(stopped, [])
  assert.equal(stops, 0)
})
test('task fixes target only wholly owned actions and exact task folder', async () => {
  const commands = []
  const owned = task([action(feature)])
  const disabled = await guard.disableScheduledTasks(
    [owned, task([action(production)]), task([action(feature), action(production)]), task(null)],
    {
      platform: 'win32',
      root: feature,
      query: async () => [owned],
      execute: async (_command, args) => {
        commands.push(args.join(' '))
        return { stdout: '' }
      },
    }
  )
  assert.deepEqual(disabled, ['ChefFlow-Watchdog'])
  assert.equal(commands.length, 1)
  assert.ok(commands[0].includes("-TaskPath '\\'"))
})

test('relative scripts are resolved before scheduled tasks can be disabled', () => {
  for (const scheduled of [
    task([action(feature, { Execute: '../production-live/writer.ps1', Arguments: '' })]),
    task([action(feature, { Arguments: '-File ..\\production-live\\writer.ps1' })]),
  ]) {
    const result = guard.scheduledTaskWorkspaceScope(scheduled, feature)
    assert.equal(result.scope, 'mixed')
    assert.equal(result.blocks, true)
    assert.equal(result.canDisable, false)
  }
  assert.equal(
    guard.scheduledTaskWorkspaceScope(
      task([action(feature, { Execute: './scripts/writer.ps1', Arguments: '' })]),
      feature
    ).canDisable,
    true
  )
})
test('relative and unparseable matching writers block without being stoppable', async () => {
  const unknown = {
    ...ownProcess,
    CommandLine: 'powershell.exe -File scripts/chefflow-watchdog.ps1',
  }
  const malformed = { ...ownProcess, CommandLine: 'powershell.exe -File "chefflow-watchdog.ps1' }
  for (const item of [unknown, malformed]) {
    assert.deepEqual(guard.writerProcessWorkspaceScope(item, feature), {
      scope: 'unknown',
      blocks: true,
      canStop: false,
    })
  }
  assert.deepEqual(
    await guard.getWriterProcesses({
      platform: 'win32',
      root: feature,
      query: async () => [externalProcess, unknown, ownProcess],
    }),
    [unknown, ownProcess]
  )
  let stops = 0
  assert.deepEqual(
    await guard.stopWriterProcesses([unknown], {
      platform: 'win32',
      root: feature,
      query: async () => [unknown],
      execute: async () => {
        stops++
      },
    }),
    []
  )
  assert.equal(stops, 0)
})
test('PowerShell inspection accepts explicit empty results and rejects blank or malformed output', async () => {
  for (const stdout of ['', 'null', '[]', '{}', '{"records":null}', 'not JSON']) {
    await assert.rejects(
      guard.powershellJson('Get-CimInstance Win32_Process', {
        execute: async () => ({ stdout }),
      }),
      /inspection/i
    )
  }
  let command
  assert.deepEqual(
    await guard.powershellJson('Get-CimInstance Win32_Process', {
      execute: async (_exe, args) => {
        command = args.at(-1)
        return { stdout: '{"records":[]}' }
      },
    }),
    []
  )
  assert.ok(command.includes("$ErrorActionPreference = 'Stop'"))
  assert.deepEqual(
    await guard.powershellJson('Get-CimInstance Win32_Process', {
      execute: async () => ({ stdout: '{"records":[{"ProcessId":101}]}' }),
    }),
    [{ ProcessId: 101 }]
  )
})
test('CIM and task inspection errors remain blockers rather than empty results', async () => {
  const failure = new Error('CLR resource startup failure')
  await assert.rejects(
    guard.powershellJson('Get-CimInstance Win32_Process', {
      execute: async () => {
        throw failure
      },
    }),
    /inspection.*CLR resource startup failure/i
  )
  const query = async () => {
    throw failure
  }
  await assert.rejects(guard.getWriterProcesses({ platform: 'win32', query }), failure)
  await assert.rejects(guard.getScheduledTasks({ platform: 'win32', query }), failure)
  let script
  assert.deepEqual(
    await guard.getScheduledTasks({
      platform: 'win32',
      query: async (value) => {
        script = value
        return []
      },
    }),
    []
  )
  assert.ok(script.includes('Get-ScheduledTask -ErrorAction Stop'))
  assert.ok(!script.includes('SilentlyContinue'))
})

test('a working directory alone cannot authorize disabling an unresolved command', () => {
  for (const Arguments of [null, '', '-EncodedCommand ZQB4AGkAdAA=']) {
    const result = guard.scheduledTaskWorkspaceScope(
      task([action(feature, { Arguments })]),
      feature
    )
    assert.equal(result.scope, 'unknown')
    assert.equal(result.blocks, true)
    assert.equal(result.canDisable, false)
  }
  const externalExecutable = guard.scheduledTaskWorkspaceScope(
    task([action(feature, { Execute: production + '\\writer.exe' })]),
    feature
  )
  assert.equal(externalExecutable.scope, 'mixed')
  assert.equal(externalExecutable.canDisable, false)
})

test('Windows script hosts prove an absolute production wrapper belongs outside the worktree', () => {
  const wrapper = (root) =>
    task([
      {
        Execute: 'wscript.exe',
        WorkingDirectory: root,
        Arguments: '"' + root + '\\scripts\\watchdog-hidden.vbs"',
      },
    ])
  assert.equal(guard.scheduledTaskWorkspaceScope(wrapper(production), feature).scope, 'external')
  assert.equal(guard.scheduledTaskWorkspaceScope(wrapper(production), feature).blocks, false)
  assert.equal(guard.scheduledTaskWorkspaceScope(wrapper(feature), feature).canDisable, true)
})
