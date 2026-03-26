import { chromium } from 'playwright'
import postgres from 'postgres'
import { encode } from 'next-auth/jwt'
import dotenv from 'dotenv'
import { resolve } from 'path'
import { mkdirSync } from 'fs'

dotenv.config({ path: resolve('.env.local') })

const DIR = 'tests/screenshots/walkthrough'
mkdirSync(DIR, { recursive: true })

// Use prod via HTTPS (required for __Secure- cookies)
const BASE = process.env.BASE_URL || 'https://app.cheflowhq.com'
const IS_PROD = BASE.includes('cheflowhq.com')
const COOKIE_DOMAIN = IS_PROD ? '.cheflowhq.com' : 'localhost'

console.log(`Target: ${BASE} (${IS_PROD ? 'production' : 'dev'} mode)`)

// Mint JWT token directly
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
const cookieName = IS_PROD ? '__Secure-authjs.session-token' : 'authjs.session-token'
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
console.log(`Token ready (cookie: ${cookieName})`)

const allPages = [
  // Core
  { name: '001-dashboard', url: '/dashboard' },
  { name: '002-inbox', url: '/inbox' },
  { name: '003-daily', url: '/daily' },
  { name: '004-queue', url: '/queue' },
  { name: '005-notifications', url: '/notifications' },
  { name: '006-activity', url: '/activity' },
  { name: '007-briefing', url: '/briefing' },

  // Inquiries
  { name: '010-inquiries', url: '/inquiries' },
  { name: '011-inquiries-new', url: '/inquiries/new' },

  // Events
  { name: '020-events', url: '/events' },
  { name: '021-events-board', url: '/events/board' },
  { name: '022-events-upcoming', url: '/events/upcoming' },
  { name: '023-events-completed', url: '/events/completed' },
  { name: '024-events-cancelled', url: '/events/cancelled' },
  { name: '025-events-awaiting-deposit', url: '/events/awaiting-deposit' },
  { name: '026-events-new', url: '/events/new' },

  // Clients
  { name: '030-clients', url: '/clients' },
  { name: '031-clients-new', url: '/clients/new' },
  { name: '032-clients-active', url: '/clients/active' },
  { name: '033-clients-inactive', url: '/clients/inactive' },
  { name: '034-clients-vip', url: '/clients/vip' },
  { name: '035-clients-segments', url: '/clients/segments' },
  { name: '036-clients-duplicates', url: '/clients/duplicates' },
  { name: '037-clients-insights', url: '/clients/insights' },
  { name: '038-clients-communication', url: '/clients/communication' },
  { name: '039-clients-loyalty', url: '/clients/loyalty' },
  { name: '040-clients-preferences', url: '/clients/preferences' },
  { name: '041-clients-gift-cards', url: '/clients/gift-cards' },
  { name: '042-clients-presence', url: '/clients/presence' },
  { name: '043-clients-recurring', url: '/clients/recurring' },

  // Recipes & Culinary
  { name: '050-recipes', url: '/recipes' },
  { name: '051-recipes-new', url: '/recipes/new' },
  { name: '052-recipes-import', url: '/recipes/import' },
  { name: '053-recipes-ingredients', url: '/recipes/ingredients' },
  { name: '054-recipes-photos', url: '/recipes/photos' },
  { name: '055-recipes-dump', url: '/recipes/dump' },
  { name: '056-culinary', url: '/culinary' },
  { name: '057-culinary-board', url: '/culinary-board' },
  { name: '058-culinary-menus', url: '/culinary/menus' },
  { name: '059-culinary-ingredients', url: '/culinary/ingredients' },
  { name: '060-culinary-prep', url: '/culinary/prep' },
  { name: '061-culinary-components', url: '/culinary/components' },
  { name: '062-culinary-costing', url: '/culinary/costing' },
  { name: '063-culinary-dish-index', url: '/culinary/dish-index' },
  { name: '064-culinary-my-kitchen', url: '/culinary/my-kitchen' },
  { name: '065-culinary-vendors', url: '/culinary/vendors' },
  { name: '066-culinary-substitutions', url: '/culinary/substitutions' },

  // Menus
  { name: '070-menus', url: '/menus' },
  { name: '071-menus-new', url: '/menus/new' },
  { name: '072-menus-dishes', url: '/menus/dishes' },
  { name: '073-menus-tasting', url: '/menus/tasting' },
  { name: '074-menus-upload', url: '/menus/upload' },

  // Quotes & Proposals
  { name: '080-quotes', url: '/quotes' },
  { name: '081-quotes-new', url: '/quotes/new' },
  { name: '082-quotes-draft', url: '/quotes/draft' },
  { name: '083-proposals', url: '/proposals' },

  // Finance
  { name: '090-finance', url: '/finance' },
  { name: '091-finance-overview', url: '/finance/overview' },
  { name: '092-finance-ledger', url: '/finance/ledger' },
  { name: '093-finance-invoices', url: '/finance/invoices' },
  { name: '094-finance-payments', url: '/finance/payments' },
  { name: '095-finance-expenses', url: '/finance/expenses' },
  { name: '096-finance-payroll', url: '/finance/payroll' },
  { name: '097-finance-reporting', url: '/finance/reporting' },
  { name: '098-finance-tax', url: '/finance/tax' },
  { name: '099-finance-cash-flow', url: '/finance/cash-flow' },
  { name: '100-finance-forecast', url: '/finance/forecast' },
  { name: '101-finance-goals', url: '/finance/goals' },
  { name: '102-finance-disputes', url: '/finance/disputes' },
  { name: '103-finance-bank-feed', url: '/finance/bank-feed' },
  { name: '104-finance-plate-costs', url: '/finance/plate-costs' },
  { name: '105-finance-retainers', url: '/finance/retainers' },
  { name: '106-finance-sales-tax', url: '/finance/sales-tax' },
  { name: '107-finance-contractors', url: '/finance/contractors' },
  { name: '108-finance-recurring', url: '/finance/recurring' },
  { name: '109-finance-year-end', url: '/finance/year-end' },
  { name: '110-finance-payouts', url: '/finance/payouts' },

  // Calendar
  { name: '120-calendar', url: '/calendar' },
  { name: '121-calendar-week', url: '/calendar/week' },
  { name: '122-calendar-day', url: '/calendar/day' },

  // Staff
  { name: '130-staff', url: '/staff' },
  { name: '131-staff-schedule', url: '/staff/schedule' },
  { name: '132-staff-availability', url: '/staff/availability' },
  { name: '133-staff-performance', url: '/staff/performance' },
  { name: '134-staff-labor', url: '/staff/labor' },

  // Inventory
  { name: '140-inventory', url: '/inventory' },
  { name: '141-inventory-ingredients', url: '/inventory/ingredients' },
  { name: '142-inventory-counts', url: '/inventory/counts' },
  { name: '143-inventory-purchase-orders', url: '/inventory/purchase-orders' },
  { name: '144-inventory-waste', url: '/inventory/waste' },
  { name: '145-inventory-vendor-invoices', url: '/inventory/vendor-invoices' },
  { name: '146-vendors', url: '/vendors' },

  // Commerce
  { name: '150-commerce', url: '/commerce' },
  { name: '151-commerce-products', url: '/commerce/products' },
  { name: '152-commerce-orders', url: '/commerce/orders' },
  { name: '153-commerce-register', url: '/commerce/register' },
  { name: '154-commerce-sales', url: '/commerce/sales' },

  // Marketing & Social
  { name: '160-marketing', url: '/marketing' },
  { name: '161-marketing-templates', url: '/marketing/templates' },
  { name: '162-marketing-push-dinners', url: '/marketing/push-dinners' },
  { name: '163-social-hub', url: '/social/hub-overview' },
  { name: '164-social-planner', url: '/social/planner' },
  { name: '165-social-vault', url: '/social/vault' },

  // Leads & Prospecting
  { name: '170-leads', url: '/leads' },
  { name: '171-prospecting', url: '/prospecting' },
  { name: '172-prospecting-pipeline', url: '/prospecting/pipeline' },

  // Analytics & Intelligence
  { name: '180-analytics', url: '/analytics' },
  { name: '181-analytics-funnel', url: '/analytics/funnel' },
  { name: '182-analytics-client-ltv', url: '/analytics/client-ltv' },
  { name: '183-insights', url: '/insights' },
  { name: '184-intelligence', url: '/intelligence' },

  // Documents & Contracts
  { name: '190-documents', url: '/documents' },
  { name: '191-contracts', url: '/contracts' },
  { name: '192-receipts', url: '/receipts' },

  // Partners & Network
  { name: '200-partners', url: '/partners' },
  { name: '201-network', url: '/network' },
  { name: '202-circles', url: '/circles' },

  // Calls & Chat
  { name: '210-calls', url: '/calls' },
  { name: '211-chat', url: '/chat' },

  // Feedback & Reviews
  { name: '220-feedback', url: '/feedback' },
  { name: '221-reviews', url: '/reviews' },
  { name: '222-testimonials', url: '/testimonials' },

  // Operations
  { name: '230-operations', url: '/operations' },
  { name: '231-stations', url: '/stations' },
  { name: '232-stations-daily-ops', url: '/stations/daily-ops' },

  // Goals & Tasks
  { name: '240-goals', url: '/goals' },
  { name: '241-tasks', url: '/tasks' },

  // Special
  { name: '250-remy', url: '/remy' },
  { name: '251-aar', url: '/aar' },
  { name: '252-availability', url: '/availability' },
  { name: '253-rate-card', url: '/rate-card' },
  { name: '254-meal-prep', url: '/meal-prep' },
  { name: '255-production', url: '/production' },
  { name: '256-nutrition', url: '/nutrition' },

  // Import
  { name: '260-import', url: '/import' },
  { name: '261-import-csv', url: '/import/csv' },

  // Community
  { name: '270-community-templates', url: '/community/templates' },

  // Settings
  { name: '300-settings', url: '/settings' },
  { name: '301-settings-profile', url: '/settings/my-profile' },
  { name: '302-settings-public-profile', url: '/settings/public-profile' },
  { name: '303-settings-appearance', url: '/settings/appearance' },
  { name: '304-settings-billing', url: '/settings/billing' },
  { name: '305-settings-stripe-connect', url: '/settings/stripe-connect' },
  { name: '306-settings-notifications', url: '/settings/notifications' },
  { name: '307-settings-ai-privacy', url: '/settings/ai-privacy' },
  { name: '308-settings-remy', url: '/settings/remy' },
  { name: '309-settings-embed', url: '/settings/embed' },
  { name: '310-settings-contracts', url: '/settings/contracts' },
  { name: '311-settings-event-types', url: '/settings/event-types' },
  { name: '312-settings-pricing', url: '/settings/pricing' },
  { name: '313-settings-automations', url: '/settings/automations' },
  { name: '314-settings-integrations', url: '/settings/integrations' },
  { name: '315-settings-compliance', url: '/settings/compliance' },
  { name: '316-settings-protection', url: '/settings/protection' },
  { name: '317-settings-navigation', url: '/settings/navigation' },
  { name: '318-settings-dashboard', url: '/settings/dashboard' },
  { name: '319-settings-culinary-profile', url: '/settings/culinary-profile' },
  { name: '320-settings-my-services', url: '/settings/my-services' },
  { name: '321-settings-portfolio', url: '/settings/portfolio' },
  { name: '322-settings-professional', url: '/settings/professional' },
  { name: '323-settings-templates', url: '/settings/templates' },
  { name: '324-settings-custom-fields', url: '/settings/custom-fields' },
  { name: '325-settings-menu-engine', url: '/settings/menu-engine' },
  { name: '326-settings-health', url: '/settings/health' },
  { name: '327-settings-journal', url: '/settings/journal' },
  { name: '328-settings-api-keys', url: '/settings/api-keys' },
  { name: '329-settings-devices', url: '/settings/devices' },
]

console.log(`Processing ${allPages.length} pages...`)

// Use a single browser but fresh pages to avoid memory bloat
const browser = await chromium.launch({ headless: true })
let ok = 0, fail = 0, redirect = 0

for (const p of allPages) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.addCookies([{
    name: cookieName,
    value: token,
    domain: COOKIE_DOMAIN,
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
    secure: IS_PROD,
  }])
  const page = await context.newPage()

  try {
    const resp = await page.goto(`${BASE}${p.url}`, { timeout: 30000 })
    await page.waitForTimeout(3000)

    const finalUrl = page.url()
    if (finalUrl.includes('sign-in') || finalUrl.includes('auth/signin')) {
      redirect++
      console.log(`REDIRECT: ${p.name} -> sign-in`)
      await page.screenshot({ path: `${DIR}/${p.name}-redirect.png`, fullPage: true })
    } else {
      ok++
      await page.screenshot({ path: `${DIR}/${p.name}.png`, fullPage: true })
      console.log(`OK: ${p.name}`)
    }
  } catch (err) {
    fail++
    console.log(`FAIL: ${p.name} - ${err.message.slice(0, 120)}`)
    try { await page.screenshot({ path: `${DIR}/${p.name}-error.png` }) } catch {}
  }

  await context.close()
  // Small pause to let server breathe
  await new Promise(r => setTimeout(r, 500))
}

await browser.close()
console.log(`\nDone! ${ok} OK, ${fail} FAIL, ${redirect} REDIRECT out of ${allPages.length} pages.`)
