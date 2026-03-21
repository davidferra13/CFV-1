import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function readJson(filePath: string) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

test('tsconfig only permits the stable Next type tree in the base config', () => {
  const tsconfig = readJson('tsconfig.json')
  const include = Array.isArray(tsconfig.include) ? tsconfig.include : []
  const nextTypeIncludes = include.filter(
    (value: string) => value.includes('/types/') && value.endsWith('**/*.ts')
  )

  assert.ok(!include.includes('.next-dev/types/**/*.ts'))
  assert.ok(!include.includes('.next-dev*/types/**/*.ts'))
  assert.ok(!include.some((value: string) => value.includes('.next-full-build-probe-')))
  assert.ok(!include.some((value: string) => value.includes('.next-local-')))
  assert.ok(!include.some((value: string) => value.includes('.next-verify-')))
  assert.ok(!include.includes('**/*.ts'))
  assert.ok(!include.includes('**/*.tsx'))
  assert.deepEqual(
    nextTypeIncludes,
    include.includes('.next/types/**/*.ts') ? ['.next/types/**/*.ts'] : []
  )
  assert.equal(tsconfig.compilerOptions?.baseUrl, '.')
})

test('package typecheck command uses the release typecheck launcher', () => {
  const packageJson = readJson('package.json')
  const launcher = readFileSync('scripts/run-release-typecheck.mjs', 'utf8')

  assert.equal(packageJson.scripts.typecheck, 'node scripts/run-release-typecheck.mjs')
  assert.ok(
    launcher.includes("const args = ['scripts/run-typecheck.mjs', '-p', 'tsconfig.typecheck.json']")
  )
  assert.ok(launcher.includes('console.log(`[typecheck] running ${seconds}s`)'))
})

test('package build command uses the heap-aware build wrapper', () => {
  const packageJson = readJson('package.json')
  assert.equal(packageJson.scripts.build, 'node scripts/run-next-build.mjs')
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

  assert.ok(!launcher.includes('npx tsc --noEmit --skipLibCheck'))
  assert.ok(launcher.includes('node scripts/run-typecheck.mjs -p tsconfig.ci.json'))
})

test('typecheck wrapper invalidates build info when config files change', () => {
  const wrapper = readFileSync('scripts/run-typecheck.mjs', 'utf8')

  assert.ok(wrapper.includes('configStat.mtimeMs > buildInfoStat.mtimeMs'))
  assert.ok(wrapper.includes("const rootTsconfigPath = path.resolve(projectDir, 'tsconfig.json')"))
  assert.ok(wrapper.includes("for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK'])"))
  assert.ok(wrapper.includes("setTimeout(() => stopChild('SIGKILL'), 5_000).unref()"))
})

test('build wrapper propagates heap settings through NODE_OPTIONS', () => {
  const wrapper = readFileSync('scripts/run-next-build.mjs', 'utf8')

  assert.ok(wrapper.includes('NEXT_BUILD_MAX_OLD_SPACE_SIZE'))
  assert.ok(wrapper.includes("existingOptions.includes('--max-old-space-size=')"))
  assert.ok(wrapper.includes('NODE_OPTIONS: nodeOptions'))
  assert.ok(wrapper.includes('NEXT_TSCONFIG_PATH: tempTsconfigPath'))
  assert.ok(wrapper.includes("const tempTsconfigPath = resolve('.next-build.tsconfig.json')"))
  assert.ok(wrapper.includes("spawn(process.execPath, [nextCliPath, 'build', ...forwardedArgs]"))
})

test('generated Next types stay out of tsconfig while typedRoutes remains disabled', () => {
  const nextConfig = readFileSync('next.config.js', 'utf8')

  assert.ok(!nextConfig.includes('typedRoutes'))
  assert.ok(
    nextConfig.includes("tsconfigPath: process.env.NEXT_TSCONFIG_PATH || 'tsconfig.next.json'")
  )
})

test('next build tsconfig only references the stable production type tree', () => {
  const tsconfigNext = readJson('tsconfig.next.json')
  const include = Array.isArray(tsconfigNext.include) ? tsconfigNext.include : []

  assert.ok(include.includes('.next/types/**/*.ts'))
  // .next-dev/types is allowed in the next build tsconfig for dev type generation
  assert.ok(!include.some((value: string) => value.includes('.next-runtime-probe-')))
  assert.ok(!include.some((value: string) => value.includes('.next-web-beta-')))
  assert.ok(!include.some((value: string) => value.includes('.next-verify-')))
})
