import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const target = join(root, 'lib', 'cannabis', 'notifications.ts')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [path] : []
  })
}

describe('Cannabis notification dispatch boundary', () => {
  it('is server-only and exports no client-callable Server Actions', () => {
    const source = readFileSync(target, 'utf8')
    assert.match(source, /^import ['"]server-only['"]\r?$/m)
    assert.doesNotMatch(source, /['"]use server['"]/)
    assert.match(source, /^export async function notifyCannabisAccessGranted/m)
  })

  it('has no direct import from a client component', () => {
    const files = ['app', 'components', 'lib'].flatMap(dir => sourceFiles(join(root, dir)))
    const clientImports = files.filter(file => {
      const source = readFileSync(file, 'utf8')
      return /^['"]use client['"]/.test(source.trimStart()) &&
        source.includes('@/lib/cannabis/notifications')
    })
    assert.deepEqual(clientImports, [])
  })
})
