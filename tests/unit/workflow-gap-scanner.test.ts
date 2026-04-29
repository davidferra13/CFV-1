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

test('workflow-gap-scanner reports dead hrefs, placeholder handlers, disabled buttons, and missing attribution', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chefflow-workflow-scan-'))
  const appDir = path.join(tempRoot, 'app')
  const componentDir = path.join(tempRoot, 'components')

  try {
    fs.mkdirSync(path.join(appDir, '(public)', 'marketplace-chefs'), { recursive: true })
    fs.mkdirSync(path.join(appDir, '(public)', 'signup'), { recursive: true })
    fs.mkdirSync(path.join(appDir, '(public)', 'for-operators'), { recursive: true })
    fs.mkdirSync(path.join(appDir, '(public)', 'book', '[slug]'), { recursive: true })
    fs.writeFileSync(
      path.join(appDir, '(public)', 'marketplace-chefs', 'page.tsx'),
      'export default function Page() { return null }\n'
    )
    fs.writeFileSync(
      path.join(appDir, '(public)', 'signup', 'page.tsx'),
      'export default function Page() { return null }\n'
    )
    fs.writeFileSync(
      path.join(appDir, '(public)', 'for-operators', 'page.tsx'),
      'export default function Page() { return null }\n'
    )
    fs.writeFileSync(
      path.join(appDir, '(public)', 'book', '[slug]', 'page.tsx'),
      'export default function Page() { return null }\n'
    )
    fs.mkdirSync(componentDir, { recursive: true })
    const sampleFile = path.join(componentDir, 'sample.tsx')
    fs.writeFileSync(
      sampleFile,
      [
        'export function Sample() {',
        '  return <div>',
        '    <a href="">Empty</a>',
        '    <a href="#">Hash</a>',
        '    <a href="javascript:void(0)">Void</a>',
        '    <a href="/missing-route">Missing</a>',
        '    <a href="/marketplace-chefs">Marketplace</a>',
        '    <a href="/signup">Signup</a>',
        '    <a href="/for-operators">Operators</a>',
        '    <a href="/book/private-chef">Book</a>',
        '    <button onClick={() => {}}>Noop</button>',
        '    <button onClick={undefined}>Undefined</button>',
        '    <button onClick={() => console.log("todo")}>Placeholder</button>',
        '    <button disabled>Locked</button>',
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
    assert.equal(parsed.findings.filter((finding) => finding.type === 'dead_href').length, 3)
    assert.ok(parsed.findings.some((finding) => finding.type === 'dead_internal_href'))
    assert.equal(
      parsed.findings.filter((finding) => finding.type === 'missing_public_attribution').length,
      4
    )
    assert.ok(parsed.findings.some((finding) => finding.type === 'empty_handler'))
    assert.ok(parsed.findings.some((finding) => finding.type === 'undefined_handler'))
    assert.ok(parsed.findings.some((finding) => finding.type === 'placeholder_handler'))
    assert.ok(parsed.findings.some((finding) => finding.type === 'unexplained_disabled_button'))
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('workflow-gap-scanner accepts mounted attributed links and explained disabled buttons', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chefflow-workflow-clean-'))
  const appDir = path.join(tempRoot, 'app')
  const componentDir = path.join(tempRoot, 'components')

  try {
    fs.mkdirSync(path.join(appDir, '(public)', 'marketplace-chefs'), { recursive: true })
    fs.mkdirSync(path.join(appDir, '(public)', 'signup'), { recursive: true })
    fs.mkdirSync(path.join(appDir, '(public)', 'for-operators'), { recursive: true })
    fs.mkdirSync(path.join(appDir, '(public)', 'book', '[slug]'), { recursive: true })
    fs.writeFileSync(
      path.join(appDir, '(public)', 'marketplace-chefs', 'page.tsx'),
      'export default function Page() { return null }\n'
    )
    fs.writeFileSync(
      path.join(appDir, '(public)', 'signup', 'page.tsx'),
      'export default function Page() { return null }\n'
    )
    fs.writeFileSync(
      path.join(appDir, '(public)', 'for-operators', 'page.tsx'),
      'export default function Page() { return null }\n'
    )
    fs.writeFileSync(
      path.join(appDir, '(public)', 'book', '[slug]', 'page.tsx'),
      'export default function Page() { return null }\n'
    )
    fs.mkdirSync(componentDir, { recursive: true })
    const sampleFile = path.join(componentDir, 'sample.tsx')
    fs.writeFileSync(
      sampleFile,
      [
        'export function Sample() {',
        '  return <div>',
        '    <a href="/marketplace-chefs?source_page=home">Marketplace</a>',
        '    <a href="/signup?source_page=home">Signup</a>',
        '    <a href="/for-operators?source_page=home">Operators</a>',
        '    <a href="/book/private-chef?source_page=home">Book</a>',
        '    <p>Select an event to continue.</p>',
        '    <button disabled>Continue</button>',
        '  </div>',
        '}',
      ].join('\n')
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

test('workflow-gap-scanner honors allowlisted intentional findings', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'chefflow-workflow-allowlist-'))
  const appDir = path.join(tempRoot, 'app')
  const componentDir = path.join(tempRoot, 'components')

  try {
    fs.mkdirSync(appDir, { recursive: true })
    fs.writeFileSync(
      path.join(appDir, 'page.tsx'),
      'export default function Page() { return null }\n'
    )
    fs.mkdirSync(componentDir, { recursive: true })
    const sampleFile = path.join(componentDir, 'sample.tsx')
    const allowlistFile = path.join(tempRoot, 'workflow-gap-allowlist.json')

    fs.writeFileSync(
      sampleFile,
      'export function Sample() { return <a href="#">Intentionally inert</a> }\n'
    )
    fs.writeFileSync(
      allowlistFile,
      JSON.stringify(
        [
          {
            type: 'dead_href',
            file: path.relative(repoRoot, sampleFile).replace(/\\/g, '/'),
            href: '#',
            reason: 'Intentional inert anchor in this fixture.',
          },
        ],
        null,
        2
      )
    )

    const output = runNode([
      'devtools/workflow-gap-scanner.mjs',
      '--app-dir',
      appDir,
      '--paths',
      sampleFile,
      '--allowlist',
      allowlistFile,
      '--json',
    ])
    const parsed = JSON.parse(output) as { ok: boolean; finding_count: number }

    assert.equal(parsed.ok, true)
    assert.equal(parsed.finding_count, 0)
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true })
  }
})
