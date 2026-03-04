import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const repoRoot = process.cwd()
const scriptPath = path.join(repoRoot, 'scripts', 'render-chef-template-pack.mjs')
const examplePath = path.join(repoRoot, 'docs', 'PDFref', 'templates', 'template-pack.example.json')

async function loadScript() {
  return import(pathToFileURL(scriptPath).href)
}

function readExampleInput() {
  return JSON.parse(fs.readFileSync(examplePath, 'utf8'))
}

test('renderTemplatePack generates core packet plus optional closeout', async () => {
  const script = await loadScript()
  const input = readExampleInput()

  const result = script.renderTemplatePack(input, { includeCloseout: true })
  assert.equal(result.files.length, 5)
  assert.equal(result.warnings.length, 0)

  const fileNames = result.files.map((f: { name: string }) => f.name)
  assert.deepEqual(fileNames, [
    '01-menu-sheet.md',
    '02-grocery-list.md',
    '03-prep-service-sheet.md',
    '04-packing-list.md',
    '05-closeout-sheet.md',
  ])

  const packing = result.files.find((f: { name: string }) => f.name === '04-packing-list.md')
  assert.ok(packing)
  assert.match(packing.content, /# PACKING LIST \(TRANSPORT\)/)
})

test('renderTemplatePack enforces one-page guardrails by truncating oversized arrays', async () => {
  const script = await loadScript()
  const input = readExampleInput()

  const oversized = structuredClone(input)

  oversized.menu.courses = Array.from({ length: 6 }).map((_, idx) => ({
    course_label: `Course ${idx + 1}`,
    title: `Dish ${idx + 1}`,
    foh_description: 'Generic description',
    components: Array.from({ length: 10 }).map((__, cIdx) => ({
      name: `Component ${cIdx + 1}`,
      method: 'method',
      where_done: 'both',
    })),
  }))

  oversized.grocery.stops = Array.from({ length: 6 }).map((_, idx) => ({
    name: `Store ${idx + 1}`,
    items: Array.from({ length: 20 }).map((__, iIdx) => ({
      section: 'PRODUCE',
      item: `Item ${iIdx + 1}`,
      qty: '1',
      course: 'Course 1',
      backup: 'Alt',
    })),
  }))

  const result = script.renderTemplatePack(oversized, { includeCloseout: false })
  assert.equal(result.files.length, 4)
  assert.ok(result.warnings.length > 0)
  assert.ok(result.warnings.some((w: string) => w.includes('menu.courses')))
  assert.ok(result.warnings.some((w: string) => w.includes('grocery.stops')))

  const grocery = result.files.find((f: { name: string }) => f.name === '02-grocery-list.md')
  assert.ok(grocery)
  assert.match(grocery.content, /## STOP 4 - Store 4/)
  assert.doesNotMatch(grocery.content, /## STOP 5 - Store 5/)
})

test('writeTemplatePack writes markdown files to output directory', async () => {
  const script = await loadScript()
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chef-pack-'))

  try {
    const result = script.writeTemplatePack(examplePath, tmpDir, { includeCloseout: true })
    assert.equal(result.files.length, 5)

    const expected = [
      '01-menu-sheet.md',
      '02-grocery-list.md',
      '03-prep-service-sheet.md',
      '04-packing-list.md',
      '05-closeout-sheet.md',
    ]

    for (const file of expected) {
      const fullPath = path.join(tmpDir, file)
      assert.equal(fs.existsSync(fullPath), true)
      const content = fs.readFileSync(fullPath, 'utf8')
      assert.ok(content.length > 0)
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
})
