import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

const repoRoot = process.cwd()
const nodeBin = process.execPath

function runNode(args: string[]) {
  return execFileSync(nodeBin, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    windowsHide: true,
  })
}

function runNodeAllowFailure(args: string[]) {
  try {
    return {
      ok: true,
      stdout: runNode(args),
    }
  } catch (error) {
    const err = error as { stdout?: Buffer | string }
    return {
      ok: false,
      stdout: String(err.stdout || ''),
    }
  }
}

test('workflow-gap-scanner reports dead hrefs, empty handlers, and missing attribution', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chefflow-workflow-scan-'))
  const appDir = path.join(tempRoot, 'app')
  const componentDir = path.join(tempRoot, 'components')

  try {
    fs.mkdirSync(path.join(appDir, '(public)', 'marketplace-chefs'), { recursive: true })
    fs.writeFileSync(
      path.join(appDir, '(public)', 'marketplace-chefs', 'page.tsx'),
      'export default function Page() { return null }\n'
    )
    fs.mkdirSync(componentDir, { recursive: true })
    const sampleFile = path.join(componentDir, 'sample.tsx')
    fs.writeFileSync(
      sampleFile,
      [
        'export function Sample() {',
        '  return <div>',
        '    <a href="/missing-route">Missing</a>',
        '    <a href="/marketplace-chefs">Marketplace</a>',
        '    <button onClick={() => {}}>Noop</button>',
        '  </div>',
        '}',
      ].join('\n')
    )

    const result = runNodeAllowFailure([
      'devtools/workflow-gap-scanner.mjs',
      '--app-dir',
      appDir,
      '--paths',
      sampleFile,
      '--json',
    ])
    const parsed = JSON.parse(result.stdout) as {
      ok: boolean
      findings: Array<{ type: string }>
    }

    assert.equal(result.ok, false)
    assert.equal(parsed.ok, false)
    assert.ok(parsed.findings.some((finding) => finding.type === 'dead_internal_href'))
    assert.ok(parsed.findings.some((finding) => finding.type === 'missing_public_attribution'))
    assert.ok(parsed.findings.some((finding) => finding.type === 'empty_handler'))
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('workflow-gap-scanner accepts mounted attributed links', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chefflow-workflow-clean-'))
  const appDir = path.join(tempRoot, 'app')
  const componentDir = path.join(tempRoot, 'components')

  try {
    fs.mkdirSync(path.join(appDir, '(public)', 'marketplace-chefs'), { recursive: true })
    fs.writeFileSync(
      path.join(appDir, '(public)', 'marketplace-chefs', 'page.tsx'),
      'export default function Page() { return null }\n'
    )
    fs.mkdirSync(componentDir, { recursive: true })
    const sampleFile = path.join(componentDir, 'sample.tsx')
    fs.writeFileSync(
      sampleFile,
      'export function Sample() { return <a href="/marketplace-chefs?source_page=home">Marketplace</a> }\n'
    )

    const output = runNode([
      'devtools/workflow-gap-scanner.mjs',
      '--app-dir',
      appDir,
      '--paths',
      sampleFile,
      '--json',
    ])
    const parsed = JSON.parse(output) as { ok: boolean; finding_count: number }

    assert.equal(parsed.ok, true)
    assert.equal(parsed.finding_count, 0)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})
