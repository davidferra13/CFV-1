import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEPENDENCY_IMPORTANCE_VALUES,
  getDependencyCatalog,
} from '../../lib/dependencies/catalog'

const secretLikePattern =
  /(sk_|pk_|rk_|whsec_|password|passwd|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|database_url|postgres:\/\/|postgresql:\/\/|https?:\/\/|localhost|127\.0\.0\.1|@[^ ]+\.[^ ]+)/i

function valuesForInspection(dependency: Record<string, unknown>) {
  return Object.values(dependency).filter((value): value is string => typeof value === 'string')
}

test('dependency catalog ids are unique', () => {
  const dependencies = getDependencyCatalog()
  const ids = dependencies.map((dependency) => dependency.id)

  assert.equal(new Set(ids).size, ids.length)
})

test('dependency catalog uses only valid importance values', () => {
  const dependencies = getDependencyCatalog()
  const allowed = new Set<string>(DEPENDENCY_IMPORTANCE_VALUES)

  for (const dependency of dependencies) {
    assert.ok(allowed.has(dependency.importance), `${dependency.id} has invalid importance`)
  }
})

test('dependency catalog does not expose secret-looking values', () => {
  const dependencies = getDependencyCatalog()

  for (const dependency of dependencies) {
    for (const value of valuesForInspection(dependency)) {
      assert.doesNotMatch(value, secretLikePattern, `${dependency.id} exposes unsafe text`)
    }
  }
})

test('dependency catalog includes at least one critical dependency', () => {
  const dependencies = getDependencyCatalog()

  assert.ok(
    dependencies.some((dependency) => dependency.importance === 'critical'),
    'expected at least one critical dependency'
  )
})
