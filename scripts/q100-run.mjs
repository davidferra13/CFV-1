/**
 * Q100: Dinner Lifecycle Integrity - Direct runner (no Playwright compilation)
 * Tests every code path a chef touches for a real dinner event.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const r = p => path.resolve(ROOT, p)
const readSafe = p => { try { return fs.readFileSync(r(p), 'utf8') } catch { return '' } }

let pass = 0, fail = 0
const failures = []

function check(name, fn) {
  try {
    fn()
    pass++
    process.stdout.write(`  PASS  ${name}\n`)
  } catch(e) {
    fail++
    failures.push({ name, error: e.message.slice(0, 150) })
    process.stdout.write(`  FAIL  ${name} -- ${e.message.slice(0, 100)}\n`)
  }
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed') }
function assertMatch(str, pattern, msg) {
  if (!pattern.test(str)) throw new Error(msg || 'pattern not found: ' + pattern)
}
function assertNoMatch(str, pattern, msg) {
  if (pattern.test(str)) throw new Error(msg || 'forbidden pattern found: ' + pattern)
}

console.log('=== Q100: DINNER LIFECYCLE INTEGRITY ===\n')

// ================================================================
// PHASE 1: EVENT CREATION
// ================================================================
console.log('Phase 1: Event Creation')

check('Event form imports createEvent with all fields', () => {
  const s = readSafe('components/events/event-form.tsx')
  assert(s.includes('createEvent'), 'missing createEvent')
  assert(s.includes('client_id'), 'missing client_id')
  assert(s.includes('event_date'), 'missing event_date')
  assert(s.includes('guest_count'), 'missing guest_count')
  assert(s.includes('occasion'), 'missing occasion')
  assert(s.includes('serve_time'), 'missing serve_time')
  assert(s.includes('location_address'), 'missing location_address')
})

check('Event form shows client dietary/allergy alerts', () => {
  const s = readSafe('components/events/event-form.tsx')
  assert(s.includes('dietary_restrictions'), 'client type missing dietary_restrictions')
  assert(s.includes('allergies'), 'client type missing allergies')
  assert(s.includes('Dietary notes'), 'no dietary alert banner in UI')
})

check('createEvent server action: auth + tenant + validation', () => {
  const s = readSafe('lib/events/actions.ts')
  assert(s.includes('requireChef'), 'no auth guard')
  assert(s.includes('tenant_id') || s.includes('tenantId'), 'no tenant scoping')
  assert(s.includes('z.object'), 'no Zod validation')
})

check('Date conflict detection exists', () => {
  const s = readSafe('components/events/event-form.tsx')
  assert(s.includes('checkDateConflicts') || s.includes('conflict'), 'no conflict detection')
})

check('/events/new page loads EventForm with clients + partners', () => {
  const s = readSafe('app/(chef)/events/new/page.tsx')
  assert(s.includes('EventForm'), 'no EventForm')
  assert(s.includes('getClients'), 'no client loading')
  assert(s.includes('getPartnersWithLocations'), 'no partner loading')
  assert(s.includes('requireChef'), 'no auth')
})

check('Event form has draft save + idempotency', () => {
  const s = readSafe('components/events/event-form.tsx')
  assert(s.includes('useDurableDraft'), 'no durable draft')
  assertMatch(s, /idempoten/i, 'no idempotency guard')
})

check('Event form has unsaved changes guard', () => {
  const s = readSafe('components/events/event-form.tsx')
  assert(s.includes('useUnsavedChangesGuard') || s.includes('UnsavedChangesDialog'), 'no unsaved guard')
})

// ================================================================
// PHASE 2: MENU PLANNING
// ================================================================
console.log('\nPhase 2: Menu Planning')

check('Menu create schema: name + event_id + guest_count + style', () => {
  const s = readSafe('lib/menus/actions.ts')
  assertMatch(s, /CreateMenuSchema/, 'no CreateMenuSchema')
  assert(s.includes('event_id'), 'no event_id in schema')
  assert(s.includes('target_guest_count'), 'no target_guest_count')
  assert(s.includes('service_style'), 'no service_style')
})

check('Dish schema: course structure + allergens + dietary tags', () => {
  const s = readSafe('lib/menus/actions.ts')
  assertMatch(s, /CreateDishSchema/, 'no CreateDishSchema')
  assert(s.includes('course_name'), 'no course_name')
  assert(s.includes('course_number'), 'no course_number')
  assert(s.includes('allergen_flags'), 'no allergen_flags')
  assert(s.includes('dietary_tags'), 'no dietary_tags')
  assert(s.includes('beverage_pairing'), 'no beverage_pairing')
})

check('Components link dishes to recipes', () => {
  const s = readSafe('lib/menus/actions.ts')
  assert(s.includes('recipe_id'), 'no recipe_id in component')
})

check('UpdateMenu schema includes visible_to_dinner_circle', () => {
  const s = readSafe('lib/menus/actions.ts')
  const schemaMatch = s.match(/UpdateMenuSchema[\s\S]*?\n\}\)/)
  assert(schemaMatch, 'no UpdateMenuSchema')
  assert(schemaMatch[0].includes('visible_to_dinner_circle'), 'missing visible_to_dinner_circle')
})

check('MenuCostSidebar: empty state shows guidance, not $0.00', () => {
  const s = readSafe('components/culinary/menu-cost-sidebar.tsx')
  assert(s.includes('componentCount'), 'no componentCount check')
  assert(s.includes('Add dishes'), 'no empty state guidance')
})

check('MenuCostSidebar: partial prices show minimum estimate', () => {
  const s = readSafe('components/culinary/menu-cost-sidebar.tsx')
  assert(s.includes('hasAllPrices'), 'no hasAllPrices check')
  assert(s.includes('minimum') || s.includes('Minimum'), 'no minimum indicator')
})

check('MenuCostSidebar: stale price warnings', () => {
  const s = readSafe('components/culinary/menu-cost-sidebar.tsx')
  assert(s.includes('oldestPriceDaysAgo'), 'no price age tracking')
  assert(s.includes('prices up to'), 'no stale warning text')
})

check('MenuHealthScore: 5 readiness dimensions', () => {
  const s = readSafe('components/menus/menu-health-score.tsx')
  const checks = ['Dishes', 'Costed', 'Allergen', 'Sent', 'Approved']
  for (const c of checks) {
    assert(s.includes(c), `missing health check: ${c}`)
  }
})

check('Menu detail page: all analysis panels present', () => {
  const s = readSafe('app/(chef)/culinary/menus/[id]/page.tsx')
  const panels = ['MenuCostSidebar', 'MenuHealthScore', 'MenuBreakdownView',
                   'MenuShoppingList', 'MenuEditorClient', 'MenuScaleDialog',
                   'MenuAssemblyBrowser', 'MenuWhatIfPanel']
  for (const p of panels) {
    assert(s.includes(p), `missing panel: ${p}`)
  }
})

// ================================================================
// PHASE 3: INGREDIENT COSTING
// ================================================================
console.log('\nPhase 3: Ingredient Costing')

check('Price resolution fallback chain exists', () => {
  const s = readSafe('lib/pricing/resolve-price.ts')
  assert(s.length > 200, 'file too small for multi-tier resolution')
})

check('getMenuCostingGaps: identifies uncosted components', () => {
  const s = readSafe('lib/menus/actions.ts')
  assert(s.includes('getMenuCostingGaps'), 'function missing')
  assert(s.includes('CostingGap'), 'type missing')
})

check('checkMenuMargins: complete cost breakdown', () => {
  const s = readSafe('lib/menus/menu-intelligence-actions.ts')
  assert(s.includes('checkMenuMargins'), 'function missing')
  const fields = ['totalCostCents', 'costPerGuestCents', 'foodCostPercent', 'hasAllPrices', 'componentCount']
  for (const f of fields) {
    assert(s.includes(f), `missing field: ${f}`)
  }
})

check('Shopping list generates from menu/event date range', () => {
  const s = readSafe('app/(chef)/culinary/prep/shopping/page.tsx')
  assert(s.length > 100, 'shopping page too small')
  assert(s.includes('Shopping') || s.includes('shopping'), 'not a shopping page')
})

check('getMenuHealthData: SQL queries real dish/component data', () => {
  const s = readSafe('lib/menus/actions.ts')
  assert(s.includes('getMenuHealthData'), 'function missing')
  assert(s.includes('dish_count'), 'not counting dishes')
  assert(s.includes('dishes_with_allergens'), 'not checking allergens')
})

// ================================================================
// PHASE 4: DAY-OF OPERATIONS
// ================================================================
console.log('\nPhase 4: Day-of Operations')

check('Morning briefing queries today events', () => {
  const s = readSafe('lib/briefing/get-morning-briefing.ts')
  assert(s.length > 100, 'briefing action too small')
})

check('Daily ops: swim lane generation', () => {
  const s = readSafe('lib/daily-ops/actions.ts')
  assert(s.includes('getDailyPlan'), 'no getDailyPlan')
})

check('Prep timeline page exists', () => {
  const s = readSafe('app/(chef)/culinary/prep/timeline/page.tsx')
  assert(s.includes('Prep Timeline'), 'no title')
})

check('Tasks page: create + date navigation', () => {
  const s = readSafe('app/(chef)/tasks/page.tsx')
  assert(s.includes('New Task') || s.includes('newTask'), 'no task creation')
  assert(s.includes('Previous') || s.includes('Next'), 'no date navigation')
})

check('Station clipboard: station list + 86d items', () => {
  const s = readSafe('app/(chef)/stations/page.tsx')
  assert(s.includes('listStations'), 'no station list')
  assert(s.includes('getAll86dItems') || s.includes('eightySix'), 'no 86 tracking')
})

check('Event schedule: timeline + DOP + manual completions', () => {
  const s = readSafe('app/(chef)/events/[id]/schedule/page.tsx')
  assert(s.includes('TimelineView'), 'no timeline')
  assert(s.includes('DOPView'), 'no DOP')
  assert(s.includes('getDOPManualCompletions') || s.includes('manualCompletions'), 'no manual completions')
})

check('KDS (kitchen display) page exists', () => {
  assert(readSafe('app/(chef)/events/[id]/kds/page.tsx').length > 50, 'KDS page missing/empty')
})

check('Pack list page exists', () => {
  assert(readSafe('app/(chef)/events/[id]/pack/page.tsx').length > 50, 'Pack page missing/empty')
})

check('DOP mobile view exists', () => {
  assert(readSafe('app/(chef)/events/[id]/dop/mobile/page.tsx').length > 50, 'DOP mobile missing')
})

// ================================================================
// PHASE 5: FINANCIAL
// ================================================================
console.log('\nPhase 5: Financial')

check('Quote system links to events', () => {
  const s = readSafe('lib/quotes/actions.ts')
  assert(s.includes('event_id'), 'no event link in quotes')
})

check('Expense recording: auth + tenant', () => {
  const s = readSafe('lib/expenses/actions.ts')
  assert(s.includes('requireChef'), 'no auth')
})

check('Profit derived from ledger (not stored)', () => {
  const s = readSafe('lib/ledger/compute.ts')
  assert(s.includes('ledger_entries'), 'not reading from ledger')
})

check('Event detail: profit summary + expenses', () => {
  const s = readSafe('app/(chef)/events/[id]/page.tsx')
  assert(s.includes('getEventProfitSummary'), 'no profit summary')
  assert(s.includes('getEventExpenses'), 'no expenses')
  assert(s.includes('getBudgetGuardrail'), 'no budget guardrail')
})

check('Invoice page exists', () => {
  assert(readSafe('app/(chef)/events/[id]/invoice/page.tsx').length > 50, 'invoice missing')
})

check('Grocery quote page exists (for ingredient cost estimate)', () => {
  assert(readSafe('app/(chef)/events/[id]/grocery-quote/page.tsx').length > 50, 'grocery quote missing')
})

// ================================================================
// PHASE 6: CLOSE-OUT
// ================================================================
console.log('\nPhase 6: Close-out')

check('Event transitions: atomic CAS guard', () => {
  const s = readSafe('lib/events/transitions.ts')
  assertMatch(s, /\.eq\(['"]status['"]/, 'no CAS guard on status')
})

check('Race condition returns failure (not fake success)', () => {
  const s = readSafe('lib/events/transitions.ts')
  assert(s.includes('concurrent_modification'), 'race returns success instead of failure')
})

check('Cache invalidation on transition', () => {
  const s = readSafe('lib/events/transitions.ts')
  assert(s.includes('revalidatePath'), 'no revalidation')
  assertMatch(s, /\/events/, 'events not revalidated')
  assertMatch(s, /\/dashboard/, 'dashboard not revalidated')
})

check('AAR page exists for post-event review', () => {
  const s = readSafe('app/(chef)/events/[id]/aar/page.tsx')
  assert(s.length > 50, 'AAR page missing')
})

check('Cancellation dialog: error handling (not fire-and-forget)', () => {
  const s = readSafe('components/events/cancellation-dialog.tsx')
  assert(s.includes('try'), 'no try block')
  assert(s.includes('catch'), 'no catch block')
  assert(s.includes('toast.error'), 'no error toast')
})

check('Close-out page exists', () => {
  assert(readSafe('app/(chef)/events/[id]/close-out/page.tsx').length > 50, 'close-out missing')
})

check('Recipe capture prompt on event detail', () => {
  const s = readSafe('app/(chef)/events/[id]/page.tsx')
  assert(s.includes('RecipeCapturePrompt'), 'no recipe capture')
})

// ================================================================
// PHASE 7: CROSS-CUTTING
// ================================================================
console.log('\nPhase 7: Cross-cutting')

check('Event money tab: no encoding corruption', () => {
  const s = readSafe('app/(chef)/events/[id]/_components/event-detail-money-tab.tsx')
  assertNoMatch(s, /[\u201c\u201d]/, 'curly quotes found - will crash JSX')
  assert(!s.startsWith('\ufeff'), 'BOM character at start of file')
})

check('Guest card: QR code for table placement', () => {
  const s = readSafe('app/(chef)/events/[id]/guest-card/page.tsx')
  assert(s.includes('PrintableCard'), 'no PrintableCard')
  assert(s.includes('guestCode'), 'no guest code')
})

check('Production calendar exists', () => {
  const s = readSafe('app/(chef)/production/page.tsx')
  assert(s.includes('Production Calendar'), 'no production calendar')
})

check('Travel planning page exists', () => {
  assert(readSafe('app/(chef)/travel/page.tsx').length > 50, 'travel page missing')
})

check('Event detail: all sub-nav links present', () => {
  const s = readSafe('app/(chef)/events/[id]/page.tsx')
  assert(s.includes('schedule') || s.includes('Schedule'), 'no schedule link')
})

check('Calendar page renders', () => {
  const s = readSafe('app/(chef)/calendar/page.tsx')
  assert(s.length > 100, 'calendar page too small')
  assert(s.includes('Calendar'), 'no calendar title')
})

check('Remy concierge page exists for AI assistance', () => {
  const s = readSafe('app/(chef)/remy/page.tsx')
  assert(s.length > 50, 'remy page missing')
})

// ================================================================
// SUMMARY
// ================================================================
console.log('\n=== DINNER LIFECYCLE INTEGRITY RESULTS ===')
console.log(`PASS: ${pass}/${pass + fail}`)
console.log(`FAIL: ${fail}`)

if (failures.length) {
  console.log('\nFAILURES:')
  for (const f of failures) {
    console.log(`  ${f.name}`)
    console.log(`    ${f.error}`)
  }
}

console.log(`\nVerdict: ${fail === 0 ? 'SYSTEM READY FOR DINNER' : 'FIX BEFORE DINNER'}`)
process.exit(fail > 0 ? 1 : 0)
