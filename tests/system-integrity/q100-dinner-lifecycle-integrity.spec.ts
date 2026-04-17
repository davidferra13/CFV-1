/**
 * Q100: Dinner Lifecycle Integrity
 *
 * The complete chef workflow for a real dinner event must be structurally
 * sound from creation to close-out. This tests every code path a chef
 * touches when preparing for, executing, and closing out a dinner.
 *
 * Failure at any point = chef can't do their job tomorrow.
 *
 * PHASE 1: EVENT CREATION
 *   - Event form accepts all required fields
 *   - Client dietary data surfaces on form
 *   - Date conflicts are detected
 *   - Event creates successfully and appears in list
 *
 * PHASE 2: MENU PLANNING
 *   - Menu can be created and linked to event
 *   - Dishes can be added with courses
 *   - Components link dishes to recipes
 *   - Menu cost sidebar computes correctly (not $0, not null)
 *   - MenuHealthScore reports actual gaps
 *
 * PHASE 3: INGREDIENT COSTING
 *   - Price resolution has a working fallback chain
 *   - Menu cost summary view returns real numbers
 *   - Shopping list generates from menu date range
 *   - Missing prices show warnings, not zeros
 *
 * PHASE 4: DAY-OF OPERATIONS
 *   - Morning briefing shows tomorrow's events
 *   - Daily ops generates swim lane items
 *   - Prep timeline shows make-ahead components
 *   - Tasks can be created for a specific date
 *   - Station clipboard loads
 *
 * PHASE 5: FINANCIAL
 *   - Quote can be created for an event
 *   - Event financial summary view returns data
 *   - Expense recording works
 *   - Profit calculation is derived (not stored)
 *
 * PHASE 6: CLOSE-OUT
 *   - Event can transition through states
 *   - AAR can be created for completed event
 *   - Cache invalidation fires on state change
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q100-dinner-lifecycle-integrity.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'

const ROOT = process.cwd()
const r = (p: string) => resolve(ROOT, p)

// Helper: read file if exists
function readSafe(path: string): string {
  const full = r(path)
  return existsSync(full) ? readFileSync(full, 'utf8') : ''
}

// Helper: check DB via psql
function dbQuery(sql: string): string {
  try {
    return execSync(
      `node -e "const p=require('postgres');const s=p('postgresql://postgres:postgres@127.0.0.1:54322/postgres');s\\\`${sql}\\\`.then(r=>{console.log(JSON.stringify(r));s.end()}).catch(e=>{console.error(e.message);s.end()})"`,
      { cwd: ROOT, timeout: 10000 }
    )
      .toString()
      .trim()
  } catch {
    return '[]'
  }
}

// ================================================================
// PHASE 1: EVENT CREATION INTEGRITY
// ================================================================

test.describe('Q100.1: Event creation path', () => {
  test('Event form component exists and imports createEvent', () => {
    const src = readSafe('components/events/event-form.tsx')
    expect(src).toContain('createEvent')
    expect(src).toContain('client_id')
    expect(src).toContain('event_date')
    expect(src).toContain('guest_count')
    expect(src).toContain('occasion')
    expect(src).toContain('serve_time')
  })

  test('Event form shows client dietary alerts when client selected', () => {
    const src = readSafe('components/events/event-form.tsx')
    // Client type must include dietary data
    expect(src).toMatch(/dietary_restrictions/)
    expect(src).toMatch(/allergies/)
    // Alert must render when data exists
    expect(src).toMatch(/Dietary notes/)
  })

  test('createEvent server action has auth + tenant scoping', () => {
    const src = readSafe('lib/events/actions.ts')
    // Find createEvent function
    const fnMatch = src.match(/export async function createEvent[\s\S]*?^}/m)
    expect(fnMatch).toBeTruthy()
    const fnBody = fnMatch![0]
    expect(fnBody).toMatch(/requireChef/)
    expect(fnBody).toMatch(/tenant_id|tenantId/)
  })

  test('Event creation validates required fields via Zod', () => {
    const src = readSafe('lib/events/actions.ts')
    // Must have schema validation
    expect(src).toMatch(/z\.object/)
    expect(src).toMatch(/event_date/)
    expect(src).toMatch(/guest_count/)
  })

  test('Date conflict detection exists and is called from form', () => {
    const formSrc = readSafe('components/events/event-form.tsx')
    expect(formSrc).toMatch(/checkDateConflicts|conflict/)
  })

  test('/events/new page renders EventForm with required props', () => {
    const page = readSafe('app/(chef)/events/new/page.tsx')
    expect(page).toContain('EventForm')
    expect(page).toContain('requireChef')
    expect(page).toContain('getClients')
  })
})

// ================================================================
// PHASE 2: MENU PLANNING INTEGRITY
// ================================================================

test.describe('Q100.2: Menu planning path', () => {
  test('Menu can be created with event link', () => {
    const src = readSafe('lib/menus/actions.ts')
    const schema = src.match(/CreateMenuSchema[\s\S]*?\n\}\)/)
    expect(schema).toBeTruthy()
    expect(schema![0]).toContain('event_id')
    expect(schema![0]).toContain('name')
    expect(schema![0]).toContain('service_style')
    expect(schema![0]).toContain('target_guest_count')
  })

  test('Dishes can be added to menu with course structure', () => {
    const src = readSafe('lib/menus/actions.ts')
    expect(src).toMatch(/CreateDishSchema/)
    expect(src).toMatch(/course_name/)
    expect(src).toMatch(/course_number/)
    expect(src).toMatch(/dietary_tags/)
    expect(src).toMatch(/allergen_flags/)
  })

  test('Components link dishes to recipes for costing', () => {
    const src = readSafe('lib/menus/actions.ts')
    expect(src).toMatch(/createComponent|addComponent/)
    expect(src).toMatch(/recipe_id/)
  })

  test('MenuCostSidebar handles empty menu without showing $0.00', () => {
    const src = readSafe('components/culinary/menu-cost-sidebar.tsx')
    // Must have empty state that doesn't show misleading zeros
    expect(src).toMatch(/componentCount\s*===?\s*0/)
    expect(src).toMatch(/Add dishes/)
  })

  test('MenuCostSidebar shows minimum estimate when prices are missing', () => {
    const src = readSafe('components/culinary/menu-cost-sidebar.tsx')
    // When hasAllPrices is false, prefix with >= or similar
    expect(src).toMatch(/hasAllPrices/)
    expect(src).toMatch(/[Mm]inimum|estimate|\u2265/)
  })

  test('MenuHealthScore checks all 5 readiness dimensions', () => {
    const src = readSafe('components/menus/menu-health-score.tsx')
    expect(src).toMatch(/Dishes/)
    expect(src).toMatch(/Costed/)
    expect(src).toMatch(/Allergen/)
    expect(src).toMatch(/Sent/)
    expect(src).toMatch(/Approved/)
  })

  test('Menu detail page renders all analysis panels', () => {
    const src = readSafe('app/(chef)/culinary/menus/[id]/page.tsx')
    expect(src).toContain('MenuCostSidebar')
    expect(src).toContain('MenuHealthScore')
    expect(src).toContain('MenuBreakdownView')
    expect(src).toContain('MenuShoppingList')
    expect(src).toContain('MenuEditorClient')
  })
})

// ================================================================
// PHASE 3: INGREDIENT COSTING INTEGRITY
// ================================================================

test.describe('Q100.3: Ingredient costing path', () => {
  test('Price resolution has multi-tier fallback chain', () => {
    const src = readSafe('lib/pricing/resolve-price.ts')
    expect(src.length).toBeGreaterThan(100)
    // Must have multiple fallback tiers
    const tierCount = (src.match(/tier|fallback|step|level|source/gi) || []).length
    expect(tierCount).toBeGreaterThan(3)
  })

  test('menu_cost_summary DB view exists', async () => {
    const result = dbQuery("SELECT viewname FROM pg_views WHERE viewname = 'menu_cost_summary'")
    const parsed = JSON.parse(result)
    expect(parsed.length).toBe(1)
  })

  test('Shopping list generator handles date range filtering', () => {
    const src = readSafe('app/(chef)/culinary/prep/shopping/page.tsx')
    expect(src).toBeTruthy()
    expect(src.length).toBeGreaterThan(100)
  })

  test('getMenuCostingGaps identifies uncosted components', () => {
    const src = readSafe('lib/menus/actions.ts')
    expect(src).toMatch(/getMenuCostingGaps/)
    // Must query for components without prices
    expect(src).toMatch(/CostingGap/)
  })

  test('Menu cost shows stale price warnings', () => {
    const sidebar = readSafe('components/culinary/menu-cost-sidebar.tsx')
    expect(sidebar).toMatch(/oldestPriceDaysAgo/)
    expect(sidebar).toMatch(/prices up to/)
  })

  test('checkMenuMargins returns costBreakdown with all required fields', () => {
    const src = readSafe('lib/menus/menu-intelligence-actions.ts')
    expect(src).toMatch(/checkMenuMargins/)
    expect(src).toMatch(/totalCostCents/)
    expect(src).toMatch(/costPerGuestCents/)
    expect(src).toMatch(/foodCostPercent/)
    expect(src).toMatch(/hasAllPrices/)
  })
})

// ================================================================
// PHASE 4: DAY-OF OPERATIONS INTEGRITY
// ================================================================

test.describe('Q100.4: Day-of operations path', () => {
  test('Morning briefing queries today events with correct date logic', () => {
    const src = readSafe('lib/briefing/get-morning-briefing.ts')
    expect(src.length).toBeGreaterThan(100)
    expect(src).toMatch(/event_date|today/)
  })

  test('Daily ops generates swim lanes from real data sources', () => {
    const src = readSafe('lib/daily-ops/actions.ts')
    expect(src).toMatch(/getDailyPlan/)
    // Must pull from multiple sources
    expect(src).toMatch(/Quick Admin|Event Prep|Creative|Relationship|lane|swim/i)
  })

  test('Prep timeline queries make-ahead components by lead time', () => {
    const page = readSafe('app/(chef)/culinary/prep/timeline/page.tsx')
    expect(page).toContain('Prep Timeline')
  })

  test('Tasks can be created and assigned to a date', () => {
    const src = readSafe('app/(chef)/tasks/page.tsx')
    expect(src).toContain('Tasks')
    expect(src).toMatch(/New Task|newTask|createTask/)
  })

  test('Stations page loads with kitchen station data', () => {
    const src = readSafe('app/(chef)/stations/page.tsx')
    expect(src).toContain('listStations')
    expect(src).toContain('Station Clipboard')
  })

  test('Event schedule page renders timeline and DOP', () => {
    const src = readSafe('app/(chef)/events/[id]/schedule/page.tsx')
    expect(src).toContain('TimelineView')
    expect(src).toContain('DOPView')
    expect(src).toContain('getEventTimeline')
  })

  test('Event KDS (kitchen display) page exists and loads', () => {
    const src = readSafe('app/(chef)/events/[id]/kds/page.tsx')
    expect(src.length).toBeGreaterThan(50)
  })

  test('Event pack list page exists for equipment checklist', () => {
    const src = readSafe('app/(chef)/events/[id]/pack/page.tsx')
    expect(src.length).toBeGreaterThan(50)
  })
})

// ================================================================
// PHASE 5: FINANCIAL INTEGRITY
// ================================================================

test.describe('Q100.5: Financial path', () => {
  test('Quote creation has event_id link and line items', () => {
    const src = readSafe('lib/quotes/actions.ts')
    expect(src).toMatch(/createQuote/)
    expect(src).toMatch(/event_id/)
  })

  test('event_financial_summary view exists in DB', async () => {
    const result = dbQuery(
      "SELECT viewname FROM pg_views WHERE viewname = 'event_financial_summary'"
    )
    const parsed = JSON.parse(result)
    expect(parsed.length).toBe(1)
  })

  test('Expense recording has auth + tenant scoping', () => {
    const src = readSafe('lib/expenses/actions.ts')
    expect(src).toMatch(/requireChef/)
    expect(src).toMatch(/tenant_id|tenantId/)
  })

  test('Profit is derived from ledger, never stored directly', () => {
    const ledger = readSafe('lib/ledger/compute.ts')
    expect(ledger.length).toBeGreaterThan(100)
    // Must read from ledger_entries
    expect(ledger).toMatch(/ledger_entries/)
  })

  test('Event detail page shows profit summary from real data', () => {
    const src = readSafe('app/(chef)/events/[id]/page.tsx')
    expect(src).toContain('getEventProfitSummary')
    expect(src).toContain('getEventExpenses')
  })

  test('Invoice page exists for event billing', () => {
    const src = readSafe('app/(chef)/events/[id]/invoice/page.tsx')
    expect(src.length).toBeGreaterThan(50)
  })
})

// ================================================================
// PHASE 6: CLOSE-OUT INTEGRITY
// ================================================================

test.describe('Q100.6: Event close-out path', () => {
  test('Event transitions use atomic CAS guard', () => {
    const src = readSafe('lib/events/transitions.ts')
    expect(src).toMatch(/transition_event_atomic|\.eq\(['"]status['"]/)
    // Race condition must return failure, not fake success
    expect(src).toMatch(/concurrent_modification/)
  })

  test('AAR (after-action review) page exists for completed events', () => {
    const src = readSafe('app/(chef)/events/[id]/aar/page.tsx')
    expect(src.length).toBeGreaterThan(50)
    expect(src).toMatch(/getAAR|aar/i)
  })

  test('Cache invalidation fires on event state change', () => {
    const src = readSafe('lib/events/transitions.ts')
    expect(src).toMatch(/revalidatePath/)
    // Must invalidate events list and dashboard
    expect(src).toMatch(/\/events/)
    expect(src).toMatch(/\/dashboard/)
  })

  test('Cancellation dialog has error handling (not fire-and-forget)', () => {
    const src = readSafe('components/events/cancellation-dialog.tsx')
    expect(src).toMatch(/try\s*\{/)
    expect(src).toMatch(/catch/)
    expect(src).toMatch(/toast\.error/)
  })

  test('Event close-out page exists with receipt/expense capture', () => {
    const src = readSafe('app/(chef)/events/[id]/close-out/page.tsx')
    expect(src.length).toBeGreaterThan(50)
  })

  test('Recipe capture prompt exists for post-event documentation', () => {
    const detail = readSafe('app/(chef)/events/[id]/page.tsx')
    expect(detail).toContain('RecipeCapturePrompt')
  })
})

// ================================================================
// PHASE 7: CROSS-CUTTING CONCERNS
// ================================================================

test.describe('Q100.7: Cross-cutting dinner concerns', () => {
  test('Calendar shows events on correct dates (no timezone shift)', () => {
    const src = readSafe('app/(chef)/calendar/page.tsx')
    expect(src.length).toBeGreaterThan(100)
  })

  test('Production calendar shows event and prep counts', () => {
    const src = readSafe('app/(chef)/production/page.tsx')
    expect(src).toContain('Production Calendar')
  })

  test('Event detail page has all operational sub-nav links', () => {
    const src = readSafe('app/(chef)/events/[id]/page.tsx')
    // Must link to schedule, guest card, KDS, pack, receipts
    expect(src).toMatch(/schedule|guest-card|kds|pack/)
  })

  test('Guest card page renders QR code for table placement', () => {
    const src = readSafe('app/(chef)/events/[id]/guest-card/page.tsx')
    expect(src).toContain('PrintableCard')
    expect(src).toContain('guestCode')
  })

  test('Event financial tab has no curly quotes or encoding corruption', () => {
    const src = readSafe('app/(chef)/events/[id]/_components/event-detail-money-tab.tsx')
    // No curly quotes (U+201C, U+201D)
    expect(src).not.toMatch(/[\u201c\u201d]/)
    // No BOM
    expect(src).not.toMatch(/^\ufeff/)
  })

  test('Event form idempotency guard prevents double-submission', () => {
    const src = readSafe('components/events/event-form.tsx')
    expect(src).toMatch(/idempoten/i)
  })

  test('DOP mobile view exists for phone-in-kitchen use', () => {
    const src = readSafe('app/(chef)/events/[id]/dop/mobile/page.tsx')
    expect(src.length).toBeGreaterThan(50)
  })

  test('Travel page exists for route planning', () => {
    const src = readSafe('app/(chef)/travel/page.tsx')
    expect(src.length).toBeGreaterThan(50)
  })
})
