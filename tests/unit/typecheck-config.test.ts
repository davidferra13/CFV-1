import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function readJson(filePath: string) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

test('tsconfig avoids generated Next type trees in the base typecheck config', () => {
  const tsconfig = readJson('tsconfig.json')
  const include = Array.isArray(tsconfig.include) ? tsconfig.include : []

  assert.ok(!include.includes('.next/types/**/*.ts'))
  assert.ok(!include.includes('.next-dev/types/**/*.ts'))
  assert.ok(!include.includes('.next-dev*/types/**/*.ts'))
  assert.ok(!include.includes('**/*.ts'))
  assert.ok(!include.includes('**/*.tsx'))
})

test('package typecheck command uses the cache-safe wrapper', () => {
  const packageJson = readJson('package.json')
  assert.equal(packageJson.scripts.typecheck, 'node scripts/run-typecheck.mjs -p tsconfig.ci.json')
})

test('ci typecheck config stays scoped to release-relevant runtime files', () => {
  const tsconfigCi = readJson('tsconfig.ci.json')
  const include = Array.isArray(tsconfigCi.include) ? tsconfigCi.include : []

  assert.ok(!include.includes('*.ts'))
  assert.ok(!include.includes('*.tsx'))
  assert.ok(!include.includes('**/*.ts'))
  assert.ok(!include.includes('**/*.tsx'))
  assert.ok(!include.includes('.next/types/**/*.ts'))
  assert.ok(!include.includes('.next-dev/types/**/*.ts'))
  assert.ok(!include.includes('scripts/**/*.ts'))
  assert.ok(!include.includes('scripts/**/*.tsx'))
  assert.ok(include.includes('app/**/*.ts'))
  assert.ok(include.includes('components/**/*.tsx'))
  assert.ok(include.includes('lib/**/*.ts'))
  assert.ok(include.includes('middleware.ts'))
})

test('launcher typecheck paths consistently use the ci wrapper', () => {
  const launcher = readFileSync('scripts/launcher/server.mjs', 'utf8')

  assert.ok(!launcher.includes("npx tsc --noEmit --skipLibCheck"))
  assert.ok(launcher.includes('node scripts/run-typecheck.mjs -p tsconfig.ci.json'))
})

test('typecheck wrapper invalidates build info when config files change', () => {
  const wrapper = readFileSync('scripts/run-typecheck.mjs', 'utf8')

  assert.ok(wrapper.includes('configStat.mtimeMs > buildInfoStat.mtimeMs'))
  assert.ok(wrapper.includes("const rootTsconfigPath = path.resolve(projectDir, 'tsconfig.json')"))
  assert.ok(wrapper.includes("for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK'])"))
  assert.ok(wrapper.includes("setTimeout(() => stopChild('SIGKILL'), 5_000).unref()"))
})

test('generated Next types stay out of tsconfig while typedRoutes remains disabled', () => {
  const nextConfig = readFileSync('next.config.js', 'utf8')

  assert.ok(!nextConfig.includes('typedRoutes'))
})
