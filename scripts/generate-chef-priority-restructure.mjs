import fs from 'fs'
import path from 'path'

const cwd = process.cwd()
const sourceReport = path.join(cwd, 'reports', 'chef-nav-full-expanded-2026-04-23.md')
const reportOut = path.join(cwd, 'docs', 'specs', 'chef-portal-priority-restructure-2026-04-23.md')
const csvOut = path.join(cwd, 'reports', 'chef-route-priority-decision-table-2026-04-23.csv')

const audit = fs.readFileSync(sourceReport, 'utf8')

function sectionAfter(title, beforeTitle) {
  const start = audit.indexOf(title)
  if (start < 0) return ''
  const contentStart = start + title.length
  const end = beforeTitle ? audit.indexOf(beforeTitle, contentStart) : -1
  return audit.slice(contentStart, end < 0 ? undefined : end)
}

const pathRe =
  /(^|[\s(>:-])\/(?!\/)[A-Za-z0-9._~%!$&'()*+,;=:@\[\]-]+(?:\/[A-Za-z0-9._~%!$&'()*+,;=:@\[\]-]+)*(?:\?[A-Za-z0-9._~%!$&'()*+,;=:@\[\]-]+)?/gm

function normalizeRoute(href) {
  return href.trim().split('?')[0].replace(/\/$/, '') || '/'
}

function extractPaths(markdown) {
  const found = new Set()
  let match
  while ((match = pathRe.exec(markdown))) {
    const href = match[0].replace(/^[\s(>:-]/, '')
    found.add(normalizeRoute(href))
  }
  return found
}

function linesInSection(title, beforeTitle) {
  return sectionAfter(title, beforeTitle)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

const fullNavSection = sectionAfter('## Full Expanded Configured Nav', '## Dynamic Chef Routes')
const navRoutes = extractPaths(fullNavSection)
const unexposedRoutes = extractPaths(
  sectionAfter('## Static Chef Page Routes Not Direct Sidebar Hrefs', '## Full Expanded Configured Nav')
)
const dynamicRoutes = extractPaths(sectionAfter('## Dynamic Chef Routes'))
const hiddenRoutes = extractPaths(
  sectionAfter('## Hidden Entries Defined In Config', '## Admin Only Entries Defined In Config')
)
const adminOnlyRoutes = extractPaths(
  sectionAfter('## Admin Only Entries Defined In Config', '## Duplicate Hrefs In Config')
)

const duplicateLines = linesInSection('## Duplicate Hrefs In Config', '## Static Chef Page Routes').filter(
  (line) => line.startsWith('- /')
)
const duplicateCounts = new Map(
  duplicateLines.map((line) => {
    const [, route, count] = line.match(/^- (\/[^:]+): (\d+)/) ?? []
    return [route, Number(count)]
  })
)

const routes = new Set()
for (const route of navRoutes) {
  if (route !== '/social/compose') routes.add(route)
}
for (const route of unexposedRoutes) routes.add(route)
for (const route of dynamicRoutes) routes.add(route)

const routeList = [...routes].sort((a, b) => a.localeCompare(b))

function workflowFor(route) {
  if (route === '/dashboard' || route === '/briefing' || route === '/daily' || route === '/queue') {
    return 'opening_app_and_daily_triage'
  }
  if (
    route.startsWith('/inquiries') ||
    route.startsWith('/leads') ||
    route.startsWith('/marketplace') ||
    route.startsWith('/wix-submissions') ||
    route.startsWith('/calls') ||
    route.startsWith('/prospecting') ||
    route.startsWith('/availability')
  ) {
    return 'lead_inquiry_pipeline'
  }
  if (
    route.startsWith('/clients') ||
    route.startsWith('/guests') ||
    route.startsWith('/partners') ||
    route.startsWith('/loyalty') ||
    route.startsWith('/network') ||
    route.startsWith('/community') ||
    route.startsWith('/circles')
  ) {
    return 'client_relationship_repeat'
  }
  if (route.startsWith('/proposals') || route.startsWith('/quotes') || route.startsWith('/contracts')) {
    return 'proposal_quote_contract'
  }
  if (
    route.startsWith('/events') ||
    route.startsWith('/calendar') ||
    route.startsWith('/production') ||
    route.startsWith('/waitlist') ||
    route.startsWith('/aar') ||
    route.startsWith('/travel')
  ) {
    return 'booked_event_management'
  }
  if (
    route.startsWith('/menus') ||
    route.startsWith('/recipes') ||
    route.startsWith('/culinary/menus') ||
    route.startsWith('/culinary/recipes') ||
    route.startsWith('/culinary/components') ||
    route.startsWith('/culinary/dish-index') ||
    route.startsWith('/culinary-board') ||
    route.startsWith('/culinary/my-kitchen') ||
    route.startsWith('/nutrition')
  ) {
    return 'menu_recipe_building'
  }
  if (
    route.startsWith('/culinary/costing') ||
    route.startsWith('/culinary/price-catalog') ||
    route.startsWith('/food-cost') ||
    route.startsWith('/prices') ||
    route.startsWith('/rate-card') ||
    route.startsWith('/inventory/food-cost') ||
    route.startsWith('/finance/plate-costs')
  ) {
    return 'costing_pricing_margin'
  }
  if (
    route.startsWith('/culinary/prep') ||
    route.startsWith('/inventory') ||
    route.startsWith('/vendors') ||
    route.startsWith('/culinary/vendors') ||
    route.startsWith('/culinary/supplier-calls')
  ) {
    return 'prep_shopping_supply_chain'
  }
  if (
    route.startsWith('/stations') ||
    route.startsWith('/kitchen') ||
    route.startsWith('/staff') ||
    route.startsWith('/team') ||
    route.startsWith('/tasks') ||
    route.startsWith('/schedule') ||
    route.startsWith('/scheduling') ||
    route.startsWith('/operations') ||
    route.startsWith('/meal-prep')
  ) {
    return 'day_of_execution_operations'
  }
  if (
    route.startsWith('/finance') ||
    route.startsWith('/expenses') ||
    route.startsWith('/receipts') ||
    route.startsWith('/payments') ||
    route.startsWith('/commerce')
  ) {
    return 'payment_finance_reconciliation'
  }
  if (
    route.startsWith('/feedback') ||
    route.startsWith('/reviews') ||
    route.startsWith('/testimonials') ||
    route.startsWith('/social') ||
    route.startsWith('/marketing') ||
    route.startsWith('/content') ||
    route.startsWith('/portfolio') ||
    route.startsWith('/reputation')
  ) {
    return 'follow_up_marketing_rebooking'
  }
  if (route.startsWith('/analytics') || route.startsWith('/insights') || route.startsWith('/reports') || route.startsWith('/goals') || route.startsWith('/intelligence')) {
    return 'long_term_review'
  }
  if (route.startsWith('/settings') || route.startsWith('/onboarding') || route.startsWith('/features') || route.startsWith('/commands') || route.startsWith('/remy') || route.startsWith('/activity') || route.startsWith('/import') || route.startsWith('/help') || route.startsWith('/dev')) {
    return 'settings_admin_tools'
  }
  if (route.startsWith('/cannabis')) return 'specialized_cannabis_workflow'
  if (route.startsWith('/safety') || route.startsWith('/charity')) return 'risk_compliance_edge'
  if (route === '/inbox' || route === '/chat' || route === '/notifications') return 'client_communication'
  if (route === '/documents') return 'proposal_quote_contract'
  return 'needs_verification'
}

function priorityFor(route, workflow) {
  if (
    [
      '/dashboard',
      '/briefing',
      '/daily',
      '/queue',
      '/inbox',
      '/clients/communication/follow-ups',
      '/events',
      '/calendar',
      '/inquiries',
      '/culinary/prep',
      '/culinary/prep/shopping',
      '/finance/overview/outstanding-payments',
      '/finance/invoices/overdue',
      '/expenses/new',
      '/receipts',
    ].includes(route)
  ) {
    return 'NOW'
  }
  if (['/clients', '/culinary', '/finance', '/inquiries'].includes(route)) return 'NEXT'
  if (
    route.startsWith('/events/[id]/execution') ||
    route.startsWith('/events/[id]/kds') ||
    route.startsWith('/events/[id]/dop') ||
    route.startsWith('/events/[id]/prep-plan') ||
    route.startsWith('/events/[id]/procurement') ||
    route.startsWith('/events/[id]/pack') ||
    route.startsWith('/events/[id]/schedule') ||
    route.startsWith('/events/[id]/billing') ||
    route.startsWith('/inbox/triage') ||
    route.startsWith('/inquiries/awaiting')
  ) {
    return 'NOW'
  }
  if (
    [
      'lead_inquiry_pipeline',
      'booked_event_management',
      'proposal_quote_contract',
      'menu_recipe_building',
      'costing_pricing_margin',
      'prep_shopping_supply_chain',
      'day_of_execution_operations',
      'payment_finance_reconciliation',
      'client_communication',
    ].includes(workflow)
  ) {
    return 'NEXT'
  }
  if (
    [
      'client_relationship_repeat',
      'follow_up_marketing_rebooking',
      'long_term_review',
      'specialized_cannabis_workflow',
    ].includes(workflow)
  ) {
    return 'LATER'
  }
  return 'RARE'
}

function canonicalEntry(route, workflow) {
  if (route === '/dashboard') return '/dashboard'
  if (route === '/clients') return '/clients'
  if (route === '/culinary') return '/culinary'
  if (route === '/events') return '/events'
  if (route === '/finance') return '/finance'
  if (route === '/inquiries') return '/inquiries'
  if (route === '/briefing' || route === '/daily' || route === '/queue') return '/dashboard'
  if (route === '/chef/cannabis/handbook') return '/cannabis/handbook'
  if (route === '/chef/cannabis/rsvps') return '/cannabis/rsvps'
  if (route === '/financials') return '/finance'
  if (route === '/prices') return '/culinary/price-catalog'
  if (route === '/schedule') return '/calendar'
  if (route === '/growth') return '/analytics/benchmarks'
  if (route === '/circles') return '/community'
  if (route === '/inbox' || route === '/chat' || route === '/notifications') return '/inbox'
  if (workflow === 'lead_inquiry_pipeline') return '/inquiries'
  if (workflow === 'booked_event_management') return '/events'
  if (workflow === 'proposal_quote_contract') return route.startsWith('/quotes') ? '/quotes' : route.startsWith('/proposals') ? '/proposals' : '/events'
  if (workflow === 'menu_recipe_building') return '/culinary'
  if (workflow === 'costing_pricing_margin') return '/culinary/costing'
  if (workflow === 'prep_shopping_supply_chain') return route.startsWith('/vendors') ? '/inventory/procurement' : '/culinary/prep'
  if (workflow === 'day_of_execution_operations') return '/daily'
  if (workflow === 'payment_finance_reconciliation') return '/finance'
  if (workflow === 'client_relationship_repeat') return '/clients'
  if (workflow === 'follow_up_marketing_rebooking') return '/clients/communication/follow-ups'
  if (workflow === 'long_term_review') return '/analytics/benchmarks'
  if (workflow === 'settings_admin_tools') return route.startsWith('/settings') ? '/settings' : '/features'
  if (workflow === 'specialized_cannabis_workflow') return '/cannabis/hub'
  if (workflow === 'risk_compliance_edge') return '/settings/protection'
  return '/features'
}

function decisionFor(route, workflow, priority) {
  if (['/dashboard', '/inbox', '/inquiries', '/events', '/culinary', '/clients', '/finance'].includes(route)) {
    return 'keep'
  }
  if (route === '/chef/cannabis/handbook' || route === '/chef/cannabis/rsvps') return 'redirect'
  if (route === '/financials') return 'redirect'
  if (route === '/prices') return 'merge'
  if (route === '/schedule') return 'merge'
  if (route === '/growth' || route === '/circles') return 'merge'
  if (route.startsWith('/dev/')) return 'hidden'
  if (route.startsWith('/settings') || route.startsWith('/onboarding')) return 'hidden'
  if (dynamicRoutes.has(route)) return 'hidden'
  if (hiddenRoutes.has(route) || adminOnlyRoutes.has(route)) return 'hidden'
  if (unexposedRoutes.has(route) && priority !== 'NOW') return 'hidden'
  if (priority === 'NOW' || priority === 'NEXT') return 'keep'
  return 'hidden'
}

function reasonFor(route, currentStatus, workflow, priority, decision, canonical) {
  if (route === '/social/compose/[eventId]') {
    return 'Actual compose route is event-scoped; standalone /social/compose was broken and must not be a nav target.'
  }
  if (decision === 'redirect') return `Duplicate or legacy path; canonical entry is ${canonical}.`
  if (decision === 'merge') return `Feature remains available but should resolve inside ${canonical} rather than competing globally.`
  if (decision === 'hidden' && dynamicRoutes.has(route)) return `Dynamic route requires an existing object and belongs behind ${canonical}.`
  if (decision === 'hidden' && currentStatus.includes('unexposed')) return `Existing static route is valid but not first-moment work; keep contextual under ${canonical}.`
  if (decision === 'hidden' && workflow === 'settings_admin_tools') return 'Configuration, setup, import, help, or diagnostic surface; accessible from settings, features, or command only.'
  if (decision === 'hidden' && workflow === 'specialized_cannabis_workflow') return 'Specialized cannabis workflow; reveal only when cannabis module/context is active.'
  if (decision === 'hidden' && workflow === 'long_term_review') return `Long-horizon review surface; keep under ${canonical} and out of NOW work.`
  if (decision === 'hidden' && workflow === 'client_relationship_repeat') return `Relationship/repeat feature; keep under ${canonical} unless current client context makes it relevant.`
  if (decision === 'hidden' && workflow === 'risk_compliance_edge') return `Risk or compliance edge case; keep under ${canonical} unless an alert makes it urgent.`
  if (decision === 'keep' && priority === 'NOW') return 'Time-sensitive daily work with high consequence if missed.'
  if (decision === 'keep') return `Core workflow route once the chef enters ${canonical}.`
  return 'Needs verification before any higher visibility is granted.'
}

const rows = routeList.map((route) => {
  const workflow = workflowFor(route)
  const priority = priorityFor(route, workflow)
  const canonical = canonicalEntry(route, workflow)
  const statusParts = []
  if (navRoutes.has(route)) statusParts.push('static_nav')
  if (unexposedRoutes.has(route)) statusParts.push('static_unexposed')
  if (dynamicRoutes.has(route)) statusParts.push('dynamic_contextual')
  if (hiddenRoutes.has(route)) statusParts.push('hidden_nav')
  if (adminOnlyRoutes.has(route)) statusParts.push('admin_only_nav')
  if (duplicateCounts.has(route)) statusParts.push(`duplicate_href_x${duplicateCounts.get(route)}`)
  const currentStatus = statusParts.join('+') || 'needs_verification'
  const decision = decisionFor(route, workflow, priority)
  return {
    route,
    current_status: currentStatus,
    workflow,
    priority_class: priority,
    decision,
    canonical_entry_point: canonical,
    reason: reasonFor(route, currentStatus, workflow, priority, decision, canonical),
  }
})

function csvCell(value) {
  return `"${String(value).replace(/"/g, '""')}"`
}

fs.writeFileSync(
  csvOut,
  [
    ['route', 'current_status', 'workflow', 'priority_class', 'decision', 'canonical_entry_point', 'reason']
      .map(csvCell)
      .join(','),
    ...rows.map((row) =>
      [
        row.route,
        row.current_status,
        row.workflow,
        row.priority_class,
        row.decision,
        row.canonical_entry_point,
        row.reason,
      ]
        .map(csvCell)
        .join(',')
    ),
  ].join('\n'),
  'utf8'
)

const priorityCounts = rows.reduce((acc, row) => {
  acc[row.priority_class] = (acc[row.priority_class] ?? 0) + 1
  return acc
}, {})
const decisionCounts = rows.reduce((acc, row) => {
  acc[row.decision] = (acc[row.decision] ?? 0) + 1
  return acc
}, {})

const duplicateResolution = [
  ['/calendar', '/events', 'merge', 'Calendar is a view of booked-event time, not a separate global workflow.'],
  ['/clients', '/clients', 'merge', 'Directory is canonical; action bar, sidebar, mobile, and command should point to one Clients owner.'],
  ['/clients/new', '/clients/new', 'merge', 'Create menu owns add-client creation; client hub may expose it contextually only.'],
  ['/culinary', '/culinary', 'merge', 'Culinary hub owns menu, recipe, costing, prep, and shopping entry.'],
  ['/culinary/prep', '/culinary/prep', 'merge', 'Prep is contextual from event/Culinary, with NOW promotion only when deadlines exist.'],
  ['/culinary/prep/shopping', '/culinary/prep/shopping', 'merge', 'Shopping is contextual from prep/event and conditionally NOW when shopping is due.'],
  ['/daily', '/dashboard', 'merge', 'Daily Ops is a Today mode, not a separate persistent top-level competitor.'],
  ['/dashboard', '/dashboard', 'merge', 'Today is canonical app opening surface.'],
  ['/documents', '/events', 'merge', 'Documents belong to event/proposal context.'],
  ['/events', '/events', 'merge', 'Events is canonical booked-work hub.'],
  ['/events/new', '/events/new', 'merge', 'Create menu owns new-event creation; Events hub may expose it contextually.'],
  ['/expenses/new', '/expenses/new', 'merge', 'Create menu owns quick expense; finance/event closeout expose contextually.'],
  ['/finance', '/finance', 'merge', 'Money hub owns finance visibility; dashboard shows only urgent money exceptions.'],
  ['/import', '/import', 'hidden', 'Import is a tool, not a daily workflow.'],
  ['/inbox', '/inbox', 'merge', 'Inbox is canonical communication triage.'],
  ['/inquiries/new', '/inquiries/new', 'merge', 'Create menu owns new inquiry; pipeline exposes contextually.'],
  ['/intelligence', '/analytics/benchmarks', 'merge', 'Intelligence belongs under long-term review.'],
  ['/inventory', '/inventory', 'merge', 'Inventory belongs under prep/shopping/supply chain.'],
  ['/marketplace', '/inquiries', 'merge', 'Marketplace lead capture should land in the same inquiry pipeline.'],
  ['/meal-prep', '/daily', 'merge', 'Meal prep is operational context, not global core.'],
  ['/menus/new', '/menus/new', 'merge', 'Create menu owns new menu; Culinary exposes contextually.'],
  ['/menus/upload', '/menus/upload', 'merge', 'Upload is a Culinary import action.'],
  ['/quotes/new', '/quotes/new', 'merge', 'Create menu owns new quote; pipeline exposes contextually.'],
  ['/receipts', '/receipts', 'merge', 'Receipt upload is finance/closeout context.'],
  ['/recipes/new', '/recipes/new', 'merge', 'Create menu owns new recipe; Culinary exposes contextually.'],
  ['/recipes/photos', '/recipes/photos', 'merge', 'Photo upload is a recipe context action.'],
  ['/reviews', '/clients/communication/follow-ups', 'merge', 'Reviews are post-event follow-up, not a top-level competitor.'],
  ['/social/planner', '/clients/communication/follow-ups', 'merge', 'Social planner is follow-up/marketing context.'],
  ['/wix-submissions', '/inquiries', 'merge', 'Wix submissions are incoming lead/inquiry material.'],
]

function markdownTable(headers, data) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...data.map((row) => `| ${row.map((cell) => String(cell).replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n')
}

const routeTable = markdownTable(
  ['route', 'current_status', 'workflow', 'priority_class', 'decision', 'canonical_entry_point', 'reason'],
  rows.map((row) => [
    row.route,
    row.current_status,
    row.workflow,
    row.priority_class,
    row.decision,
    row.canonical_entry_point,
    row.reason,
  ])
)

const report = `# Chef Portal Priority Restructure

Generated: 2026-04-23

Source constraints:
- Verified audit counts: 562 chef routes, 474 static, 88 dynamic.
- Verified navigation exposure: 399 unique nav hrefs, 435 base nav items, 478 shell surfaces, 440 command-palette reachable routes.
- Verified gaps: 76 static routes not directly exposed, 88 dynamic routes contextual only, 9 hidden nav routes, 34 base duplicate hrefs, 52 shell duplicate hrefs, 54 shell-plus-command duplicate hrefs.
- Verified broken route: /social/compose is not a page; actual route is /social/compose/[eventId].

This is a priority correction plan, not a feature reduction plan.

## A. Executive Finding

The chef portal is overloaded because the shell exposes too many equal-weight entry points for work that does not have equal urgency. The current system makes dashboard, inbox, events, clients, culinary, finance, operations, create actions, mobile tabs, command palette shortcuts, hidden links, and settings shortcuts compete at the same moment.

The under-prioritized work is the work that creates direct operational loss when missed: active events, fresh inquiries and client replies, prep deadlines, shopping requirements, service-day execution, overdue invoices, and closeout/follow-up. These should be NOW or one click from NOW, not buried among analytics, marketing, community, setup, and edge modules.

The unnecessary competition is concentrated in /clients, /finance, /dashboard, /inbox, /events, /calendar, and /culinary/prep/shopping. Those are real workflows, but each currently appears from multiple shell surfaces as if every entry point is equally important.

## B. Chef Priority Hierarchy

1. Active service risk: today's event, execution view, staff/station state, safety, pack, schedule, KDS, DOP mobile.
2. Client communication risk: inbox, inquiry replies, client replies, unread threads, follow-ups due.
3. Prep and shopping risk: prep timeline, shopping list, procurement, inventory gaps, supplier/vendor calls.
4. Revenue risk: quotes/proposals awaiting action, deposits, overdue invoices, failed payments, event margin.
5. Booked-event planning: event detail, calendar, menu approval, documents, travel, guest state.
6. Menu and costing creation: menus, recipes, costing, price catalog, plate cost, rate card.
7. Relationship/repeat value: clients, loyalty, reviews, referrals, partners, community.
8. Long-horizon review and configuration: analytics, goals, reports, settings, onboarding, imports, integrations, dev tools.

## C. Moment-Based Interface Model

| Moment | Visible immediately | Accessible next | Hidden |
| --- | --- | --- | --- |
| Opening the app | Today command center, urgent inbox, active events, prep/shopping due, payments due | Events, Inbox, Pipeline, Culinary, Clients, Money | Analytics, marketing, settings directories, dev tools, module-specific edge clusters |
| Handling leads/inquiries | Inbox, Inquiries, client reply status, quote/proposal next action | Leads, calls, marketplace, Wix submissions, client creation | Analytics, inventory, settings, community, dev tools |
| Managing booked events | Event list/detail, calendar, prep status, documents, money status | Staff, travel, guest cards, menu approval, safety, procurement | Marketing, long-term analytics, account settings |
| Building menus | Menus, recipes, dishes, client preferences, event context | Templates, uploads, substitutions, scaling, nutrition | Finance reports, social tools, admin/dev settings |
| Costing | Costing workspace, price catalog, rate card, plate cost, event margin | Store prices, vendor comparison, receipt scanner, food-cost analysis | Social, community, profile settings |
| Prep planning | Prep workspace, event prep plan, timeline, task queue | Inventory, suppliers, staff, schedule | Analytics, marketing, onboarding |
| Shopping | Shopping list, procurement, inventory gaps, vendor comparison | Purchase orders, receipts, store prices, supplier calls | Settings, community, reports |
| Day-of execution | Daily Ops, active event, KDS, DOP mobile, stations, staff, safety | Pack, schedule, split billing, incident reporting | Marketing, analytics, onboarding, profile edits |
| Payment + follow-up | Invoice/payment state, expenses, receipts, closeout, feedback request | Reviews, testimonials, social planner, loyalty/referral touchpoint | Prep planning for unrelated events, dev/admin tools |
| Long-term review/settings | Analytics, reports, goals, settings, modules | Imports, integrations, profile, compliance, onboarding | NOW shell unless there is an urgent alert |

## D. Final Top-Level Nav Structure

Global top-level items:

1. Today -> /dashboard
2. Inbox -> /inbox
3. Pipeline -> /inquiries
4. Events -> /events
5. Culinary -> /culinary
6. Clients -> /clients
7. Money -> /finance

Bottom or utility only:
- All Features -> /features
- Settings -> /settings
- Command/search remains available but must rank by current context, not alphabetically by feature sprawl.

Conditional NOW surfaces:
- Day Ops appears in Today/mobile when an event is today or prep/service work is due.
- Shopping appears when a prep plan has shopping requirements.
- Costing appears when menu/event cost is incomplete or stale.
- Payments appear when deposit, invoice, failed payment, or closeout action is due.

## E. Route Decision Table

Complete CSV: reports/chef-route-priority-decision-table-2026-04-23.csv

${routeTable}

## F. Duplication Resolution Report

Base duplicate hrefs verified in the expanded inventory: 34 cases. The report exposes 29 concrete duplicate href families in the base config; the broader verified shell counts are 52 across shell surfaces and 54 when command shortcuts are included. The resolution rule is one canonical owner per href. Other surfaces may link only as contextual accelerators, never as independent competing primary entries.

${markdownTable(['duplicate_href', 'canonical_entry_point', 'resolution', 'reason'], duplicateResolution)}

Additional shell/command duplicates:
- Action bar, standalone top, mobile tabs, create menu, footer, and command palette must reuse the same canonical owner above.
- Command palette may keep reachability, but ranking must demote LATER/RARE routes unless the current workflow context makes them relevant.
- Mobile tabs may personalize among canonical owners, but should not introduce a second canonical route for the same workflow.

Broken route resolution:
- Remove the hidden standalone nav target /social/compose.
- Keep /social/compose/[eventId] as contextual from an event.
- Canonical fallback for social content planning is /social/planner under follow-up/marketing context.

## G. Homepage Definition

The homepage/default chef view is an operational command center, not a feature directory.

Belongs on Today:
- Active event card: next event, time, venue, client, service status, schedule, pack, safety, KDS/DOP when relevant.
- Communication triage: unread client replies, inquiry SLA, reply-due threads.
- Prep and shopping: prep blocks due, shopping list due, missing ingredients, vendor/supplier calls.
- Money risk: deposit due, overdue invoice, failed payment, event margin warning, receipts needing attachment.
- Next best action: one primary action from the lifecycle, derived from state.

Removed from Today:
- Static feature lists.
- Long-tail settings, profile setup, module catalogs, analytics grids, marketing tools, community tools, and developer diagnostics.

Conditional:
- Costing appears only when a menu/event has stale or missing costs.
- Shopping appears only when active prep requires procurement.
- Day Ops appears only for today/tomorrow service windows or active station work.
- Follow-up appears only after completed service, unpaid invoices, or review/testimonial windows.

Real-time state drivers:
- Event date/time and status.
- Inquiry/client-message freshness.
- Prep block deadlines.
- Shopping/procurement completeness.
- Invoice/payment state.
- Receipt/expense closeout state.
- Post-event follow-up due windows.

## H. High-Risk Misprioritization Report

| Risk | Current symptom | Required correction |
| --- | --- | --- |
| Service-day work loses to feature sprawl | Day Ops, stations, schedule, prep, shopping, and event detail compete with every module | Today must promote active event execution state above all static features |
| Lead response is too easy to miss | Inquiries, leads, marketplace, Wix submissions, calls, and inbox are split | Pipeline and Inbox must collapse lead/client communication into a single urgent queue |
| Shopping is treated as a feature, not a deadline | /culinary/prep/shopping is duplicated but not context-driven | Promote shopping only when a prep plan requires it; otherwise keep under Culinary/Prep |
| Finance is over-broad | Finance hub, reports, invoices, expenses, payouts, tax, payroll, ledgers all compete | Show only money exceptions globally; keep reports/tax/payroll in LATER/RARE |
| Settings and onboarding leak into working memory | Dozens of settings routes are available from shortcuts | Settings remain searchable, not global work |
| Specialized clusters look like core work | cannabis, dev tools, circles, growth, supplier calls, prices are poorly integrated | Keep capability; gate by module/context and map to lifecycle |
| Dynamic routes could be mistaken for nav destinations | 88 dynamic routes require existing records | Never put dynamic templates in global nav; surface from parent records only |
| Broken social compose target | /social/compose does not resolve | Removed standalone target; use /social/compose/[eventId] from event context |

## Build-Time Accounting

| Metric | Verified value |
| --- | --- |
| Total chef routes | 562 |
| Static chef routes | 474 |
| Dynamic chef routes | 88 |
| Unique nav hrefs | 399 |
| Static routes not directly exposed | 76 |
| Dynamic routes directly navigable | 0 |
| Hidden nav routes | 9 |
| Parsed route decisions in this document | ${rows.length} |
| Priority counts | NOW ${priorityCounts.NOW ?? 0}, NEXT ${priorityCounts.NEXT ?? 0}, LATER ${priorityCounts.LATER ?? 0}, RARE ${priorityCounts.RARE ?? 0} |
| Decision counts | keep ${decisionCounts.keep ?? 0}, merge ${decisionCounts.merge ?? 0}, redirect ${decisionCounts.redirect ?? 0}, hidden ${decisionCounts.hidden ?? 0}, remove ${decisionCounts.remove ?? 0} |
`

fs.mkdirSync(path.dirname(reportOut), { recursive: true })
fs.mkdirSync(path.dirname(csvOut), { recursive: true })
fs.writeFileSync(reportOut, report, 'utf8')

console.log(`wrote ${path.relative(cwd, reportOut)}`)
console.log(`wrote ${path.relative(cwd, csvOut)}`)
console.log(`route decisions: ${rows.length}`)
