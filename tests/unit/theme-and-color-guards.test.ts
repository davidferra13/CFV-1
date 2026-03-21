import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

function read(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8')
}

function walk(relativeDir: string): string[] {
  const root = path.join(process.cwd(), relativeDir)
  if (!existsSync(root)) return []

  const entries = readdirSync(root, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const relativePath = path.posix.join(relativeDir.replace(/\\/g, '/'), entry.name)
    if (entry.isDirectory()) return walk(relativePath)
    return [relativePath]
  })
}

const COLOR_AUDIT_ROOTS = ['app', 'components', 'lib', 'pages']
const BLUE_UTILITY_ALLOWLIST = new Set([
  'components/social/event-post-composer.tsx',
  'components/social/social-connections-manager.tsx',
  'lib/communication/channel-meta.ts',
])
const BLUE_UTILITY_PATTERN = /[A-Za-z:-]*(?:blue|sky|cyan|indigo)-[0-9]{2,3}(?:\/[0-9]{1,3})?/g

test('theme foundation stays light-first and shared at the app root', () => {
  const tailwindConfig = read('tailwind.config.ts')
  const rootLayout = read('app/layout.tsx')
  const themeProvider = read('components/ui/app-theme-provider.tsx')
  const globals = read('app/globals.css')
  const chefLayout = read('app/(chef)/layout.tsx')
  const embedPage = read('app/embed/inquiry/[chefId]/page.tsx')

  assert.match(tailwindConfig, /darkMode:\s*'class'/)
  assert.match(rootLayout, /<AppThemeProvider>/)
  assert.match(themeProvider, /defaultTheme="light"/)
  assert.match(themeProvider, /enableSystem=\{false\}/)
  assert.match(themeProvider, /storageKey="chefflow-theme"/)
  assert.match(themeProvider, /forceLightTheme = pathname\?\.startsWith\('\/embed'\)/)
  assert.match(globals, /:root\s*\{/)
  assert.match(globals, /\.dark\s*\{/)
  assert.doesNotMatch(globals, /html\.dark\s*\{/)
  assert.doesNotMatch(chefLayout, /ThemeProvider/)
  assert.match(embedPage, /className=\{theme === 'dark' \? 'dark' : undefined\}/)
})

test('theme toggles remain wired into every route shell', () => {
  const authLayout = read('app/auth/layout.tsx')
  const publicHeader = read('components/navigation/public-header.tsx')
  const clientNav = read('components/navigation/client-nav.tsx')
  const chefNav = read('components/navigation/chef-nav.tsx')
  const chefMobileNav = read('components/navigation/chef-mobile-nav.tsx')
  const staffNav = read('components/staff/staff-nav.tsx')
  const adminLayout = read('app/(admin)/layout.tsx')
  const appearancePage = read('app/(chef)/settings/appearance/page.tsx')

  assert.match(authLayout, /ThemeToggle/)
  assert.match(publicHeader, /ThemeToggle/)
  assert.match(clientNav, /ThemeToggle/)
  assert.match(chefNav, /ThemeToggle/)
  assert.match(chefMobileNav, /ThemeToggle/)
  assert.match(staffNav, /ThemeToggle/)
  assert.match(adminLayout, /ChefSidebar/)
  assert.match(adminLayout, /ChefMobileNav/)
  assert.match(appearancePage, /appearance-theme-toggle/)
})

test('generic blue-family utilities stay confined to explicit brand allowlist files', () => {
  const offenders: string[] = []

  for (const root of COLOR_AUDIT_ROOTS) {
    for (const relativePath of walk(root)) {
      if (!/\.(ts|tsx|js|jsx)$/.test(relativePath)) continue
      if (BLUE_UTILITY_ALLOWLIST.has(relativePath)) continue

      const matches = Array.from(new Set(read(relativePath).match(BLUE_UTILITY_PATTERN) ?? []))
      if (matches.length > 0) {
        offenders.push(`${relativePath}: ${matches.join(', ')}`)
      }
    }
  }

  assert.deepEqual(offenders, [])
})
