import { chromium } from 'playwright'
import postgres from 'postgres'
import { encode } from 'next-auth/jwt'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve('.env.local') })

const sql = postgres('postgresql://postgres:postgres@127.0.0.1:54322/postgres')
const [user] = await sql`
  SELECT u.id, u.email, ur.role, ur.entity_id
  FROM auth.users u
  JOIN public.user_roles ur ON ur.auth_user_id = u.id
  WHERE u.email = 'davidferra13@gmail.com'
  LIMIT 1
`
console.log('User:', user.email, 'Role:', user.role)

const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
const cookieName = 'authjs.session-token'
const token = await encode({
  token: {
    userId: user.id,
    email: user.email,
    role: user.role,
    entityId: user.entity_id,
    tenantId: user.role === 'chef' ? user.entity_id : null,
  },
  secret,
  salt: cookieName,
})
await sql.end()

const allPages = [
  { name: '01-dashboard', url: '/dashboard' },
  { name: '02-inquiries', url: '/inquiries' },
  { name: '03-events', url: '/events' },
  { name: '04-clients', url: '/clients' },
  { name: '05-recipes', url: '/recipes' },
  { name: '06-recipes-import', url: '/recipes/import' },
  { name: '07-menus', url: '/menus' },
  { name: '08-menus-upload', url: '/menus/upload' },
  { name: '09-documents', url: '/documents' },
  { name: '10-finance', url: '/finance' },
  { name: '11-settings-pricing', url: '/settings/pricing' },
  { name: '12-calendar', url: '/calendar' },
]

// Use a SINGLE browser context for all pages (reuses compiled pages)
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await context.addCookies([{
  name: cookieName,
  value: token,
  domain: 'localhost',
  path: '/',
  httpOnly: true,
  sameSite: 'Lax',
  secure: false,
}])
const page = await context.newPage()

// Abort SSE connections so page "load" event fires
await page.route('**/api/realtime/**', route => route.abort())

for (const p of allPages) {
  try {
    console.log(`Loading ${p.name}...`)
    // Use domcontentloaded - SSE will never fire "load"
    await page.goto(`http://localhost:3100${p.url}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(4000) // let React hydrate + data load

    // Dismiss cookie banner if present
    try { await page.click('button:has-text("Accept")', { timeout: 500 }) } catch {}
    // Dismiss any modal/overlay
    try { await page.click('button:has-text("Skip")', { timeout: 500 }) } catch {}
    try { await page.click('button:has-text("Not now")', { timeout: 500 }) } catch {}

    await page.waitForTimeout(500)
    await page.screenshot({ path: `tests/screenshots/${p.name}.png`, fullPage: true })
    console.log(`OK: ${p.name} (${page.url()})`)
  } catch (err) {
    console.log(`FAIL: ${p.name} - ${err.message.slice(0, 150)}`)
    try { await page.screenshot({ path: `tests/screenshots/${p.name}-error.png` }) } catch {}
  }
}

await browser.close()
console.log('Done!')
