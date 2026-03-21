import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { TOUR_CONFIGS } from '@/lib/onboarding/tour-config'

const REPO_ROOT = process.cwd()
const APP_ROOT = path.join(REPO_ROOT, 'app')
const SOURCE_ROOTS = ['app', 'components'].map((segment) => path.join(REPO_ROOT, segment))
const TOUR_SELECTOR_PATTERN = /^\[data-tour="([a-z0-9-]+)"\]$/

function walkFiles(root: string, predicate: (filePath: string) => boolean) {
  const results: string[] = []

  function visit(currentPath: string) {
    const entry = fs.statSync(currentPath)
    if (entry.isDirectory()) {
      for (const child of fs.readdirSync(currentPath)) {
        visit(path.join(currentPath, child))
      }
      return
    }

    if (predicate(currentPath)) results.push(currentPath)
  }

  visit(root)
  return results
}

function deriveRouteFromPageFile(filePath: string) {
  const relative = path.relative(APP_ROOT, filePath)
  const routeSegments = relative
    .split(path.sep)
    .slice(0, -1)
    .filter((segment) => !segment.startsWith('('))
  const route = `/${routeSegments.join('/')}`.replace(/\/+/g, '/')
  return route === '/' ? route : route.replace(/\/$/, '')
}

function listApplicationRoutes() {
  const pageFiles = walkFiles(APP_ROOT, (filePath) => path.basename(filePath) === 'page.tsx')
  return new Set(pageFiles.map(deriveRouteFromPageFile))
}

function collectSourceText() {
  const entries: Array<{ filePath: string; content: string }> = []

  for (const root of SOURCE_ROOTS) {
    const files = walkFiles(root, (filePath) => /\.(ts|tsx)$/.test(filePath))
    for (const filePath of files) {
      entries.push({
        filePath,
        content: fs.readFileSync(filePath, 'utf8'),
      })
    }
  }

  return entries
}

function normalizeSelectorTarget(target: string | string[]) {
  return Array.isArray(target) ? target : [target]
}

describe('onboarding tour contract', () => {
  it('points every configured route at a real application page', () => {
    const routes = listApplicationRoutes()

    for (const config of Object.values(TOUR_CONFIGS)) {
      for (const step of config.steps) {
        assert.equal(
          routes.has(step.route),
          true,
          `Tour step "${step.id}" references missing route "${step.route}"`
        )
      }
    }
  })

  it('uses only dedicated data-tour selectors for targets and prepare actions', () => {
    for (const config of Object.values(TOUR_CONFIGS)) {
      for (const step of config.steps) {
        for (const selector of normalizeSelectorTarget(step.target)) {
          assert.match(
            selector,
            TOUR_SELECTOR_PATTERN,
            `Tour step "${step.id}" must use a dedicated [data-tour=\"...\"] target selector`
          )
        }

        for (const action of step.prepare ?? []) {
          for (const selector of normalizeSelectorTarget(action.target)) {
            assert.match(
              selector,
              TOUR_SELECTOR_PATTERN,
              `Tour step "${step.id}" prepare action must use a dedicated [data-tour=\"...\"] selector`
            )
          }
        }
      }
    }
  })

  it('keeps every configured tour token anchored in one source file', () => {
    const sources = collectSourceText()
    const expectedTokens = new Set<string>()

    for (const config of Object.values(TOUR_CONFIGS)) {
      for (const step of config.steps) {
        for (const selector of normalizeSelectorTarget(step.target)) {
          const match = selector.match(TOUR_SELECTOR_PATTERN)
          assert.ok(match, `Invalid target selector for step "${step.id}"`)
          expectedTokens.add(match[1])
        }

        for (const action of step.prepare ?? []) {
          for (const selector of normalizeSelectorTarget(action.target)) {
            const match = selector.match(TOUR_SELECTOR_PATTERN)
            assert.ok(match, `Invalid prepare selector for step "${step.id}"`)
            expectedTokens.add(match[1])
          }
        }
      }
    }

    for (const token of expectedTokens) {
      const matches = sources.filter(({ content }) => content.includes(`data-tour="${token}"`))

      assert.ok(
        matches.length <= 1,
        `Tour token "${token}" must exist in at most one app/components source file, found ${matches.length}`
      )
    }
  })
})
