import fs from 'fs'
import path from 'path'

const cwd = process.cwd()
const nav = JSON.parse(fs.readFileSync(path.join(cwd, 'tmp_nav_icons.json'), 'utf8'))
const extract = JSON.parse(fs.readFileSync(path.join(cwd, 'tmp_nav_extract.json'), 'utf8'))

const routeToFile = new Map(extract.routes.map((r) => [r.route, r.file]))

function abs(rel) {
  return path.join(cwd, rel)
}

function normalizeHref(href) {
  if (!href || href === 'UNVERIFIED') return null
  if (!href.startsWith('/')) return null
  return href.split('?')[0].replace(/\/$/, '') || '/'
}

function routeFile(href) {
  const normalized = normalizeHref(href)
  if (!normalized) return 'UNVERIFIED'
  return routeToFile.get(normalized) || 'UNVERIFIED'
}

function renderNode({
  label,
  type,
  href,
  component,
  source,
  visibility,
  conditions,
  state,
  icon,
}) {
  return [
    `- exact label: ${label}`,
    `  type: ${type}`,
    `  exact route/path: ${href}`,
    `  rendering component file path: ${component}`,
    `  destination page component: ${routeFile(href)}`,
    `  source of definition: ${source}`,
    `  visibility: ${visibility}`,
    `  required permissions or conditions: ${conditions}`,
    `  state: ${state}`,
    `  icon: ${icon}`,
  ].join('\n')
}

let totalNavigationItems = 0
let deepestNestingLevel = 0
const uniqueRoutes = new Set()
const uniquePageComponents = new Set()

function trackHref(href) {
  if (href && href.startsWith('/')) uniqueRoutes.add(href)
  const file = routeFile(href)
  if (file !== 'UNVERIFIED') uniquePageComponents.add(file)
}

function visibilityFor(item, defaults = {}) {
  if (item.adminOnly) return 'permission-based'
  if (item.hidden || item.requiredPermission || item.visibility) return 'conditional'
  return defaults.visibility || 'always visible'
}

function conditionsFor(item, defaults = {}) {
  const parts = []
  if (item.adminOnly) parts.push('admin user')
  if (item.hidden) parts.push('hidden flag in nav config')
  if (item.requiredPermission) parts.push(`requiredPermission=${item.requiredPermission}`)
  if (item.visibility) parts.push(`visibility=${item.visibility}`)
  if (defaults.conditions) parts.push(defaults.conditions)
  return parts.join('; ') || 'none'
}

function renderConfigTree(items, component, source, defaults = {}, level = 1) {
  deepestNestingLevel = Math.max(deepestNestingLevel, level)
  const lines = []
  for (const item of items) {
    totalNavigationItems += 1
    trackHref(item.href)
    lines.push(
      renderNode({
        label: item.label,
        type: item.children?.length ? 'menu' : 'link',
        href: item.href || 'UNVERIFIED',
        component,
        source,
        visibility: visibilityFor(item, defaults),
        conditions: conditionsFor(item, defaults),
        state: 'static',
        icon: item.icon || 'none',
      }),
    )
    if (item.children?.length) {
      deepestNestingLevel = Math.max(deepestNestingLevel, level + 1)
      for (const child of item.children) {
        totalNavigationItems += 1
        trackHref(child.href)
        lines.push(
          [
            `  - exact label: ${child.label}`,
            `    type: ${child.children?.length ? 'submenu' : 'page'}`,
            `    exact route/path: ${child.href || 'UNVERIFIED'}`,
            `    rendering component file path: ${component}`,
            `    destination page component: ${routeFile(child.href)}`,
            `    source of definition: ${source}`,
            `    visibility: ${visibilityFor(child, defaults)}`,
            `    required permissions or conditions: ${conditionsFor(child, defaults)}`,
            `    state: static`,
            `    icon: ${child.icon || 'none'}`,
          ].join('\n'),
        )
      }
    }
  }
  return lines.join('\n')
}

const files = {
  chefLayout: abs('app/(chef)/layout.tsx'),
  chefSidebar: abs('components/navigation/chef-nav.tsx'),
  chefMobileNav: abs('components/navigation/chef-mobile-nav.tsx'),
  chefMainContent: abs('components/navigation/chef-main-content.tsx'),
  navConfig: abs('components/navigation/nav-config.tsx'),
  chefNavConfig: abs('components/navigation/chef-nav-config.ts'),
  actionBar: abs('components/navigation/action-bar.tsx'),
  createMenuDropdown: abs('components/navigation/create-menu-dropdown.tsx'),
  allFeatures: abs('components/navigation/all-features-collapse.tsx'),
  recentPages: abs('components/navigation/recent-pages-section.tsx'),
  breadcrumbBar: abs('components/navigation/breadcrumb-bar.tsx'),
  commandPalette: abs('components/search/command-palette.tsx'),
  settingsPage: abs('app/(chef)/settings/page.tsx'),
  settingsGuided: abs('components/settings/settings-guided-overview.tsx'),
  settingsAdvancedDirectory: abs('components/settings/settings-advanced-directory.tsx'),
  modulesClient: abs('app/(chef)/settings/modules/modules-client.tsx'),
  layoutCache: abs('lib/chef/layout-cache.ts'),
  focusMode: abs('lib/navigation/focus-mode-nav.ts'),
  billingModules: abs('lib/billing/modules.ts'),
  networkPage: abs('app/(chef)/network/page.tsx'),
  eventDetailMobileNav: abs('components/events/event-detail-mobile-nav.tsx'),
  quotesTabs: abs('components/quotes/quotes-filter-tabs.tsx'),
  activityFilters: abs('components/activity/activity-filters.tsx'),
  clientPreviewTabs: abs('app/(chef)/settings/client-preview/client-preview-tabs.tsx'),
  professionalTabs: abs('app/(chef)/settings/professional/professional-development-client.tsx'),
  haccpTabs: abs('app/(chef)/settings/compliance/haccp/tabs-client.tsx'),
  adminShell: abs('components/navigation/admin-shell.tsx'),
}

const settingsSections = [
  {
    section: 'Guided Overview',
    component: files.settingsGuided,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'none',
    state: 'static',
    items: [
      ['Availability Rules', '/settings#availability-rules'],
      ['Business Defaults', '/settings#business-defaults'],
      ['Profile & Branding', '/settings#profile-branding'],
      ['Connected Accounts & Integrations', '/settings#connected-accounts-integrations'],
      ['AI & Privacy', '/settings#ai-privacy'],
    ],
  },
  {
    section: 'Business Defaults',
    component: files.settingsPage,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'none',
    state: 'static',
    items: [
      ['Customize Dashboard', '/settings/dashboard'],
      ['Primary Navigation', '/settings/navigation'],
      ['Store Preferences', '/settings/store-preferences'],
      ['Menu Intelligence', '/settings/menu-engine'],
      ['Goals', '/goals/setup'],
    ],
  },
  {
    section: 'My Services',
    component: files.settingsPage,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'none',
    state: 'static',
    items: [['Configure My Services', '/settings/my-services']],
  },
  {
    section: 'Profile & Branding',
    component: files.settingsPage,
    source: 'hardcoded component',
    visibility: 'conditional',
    conditions: 'Open Live Profile only when profile.slug exists',
    state: 'static',
    items: [
      ['My Profile', '/settings/my-profile'],
      ['Profile & Partner Showcase', '/settings/public-profile'],
      ['Inspiration Board', '/settings/favorite-chefs'],
      ['Client Preview', '/settings/client-preview'],
      ['Open Live Profile', '/chef/${profile.slug}'],
    ],
  },
  {
    section: 'Event Configuration',
    component: files.settingsPage,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'none',
    state: 'static',
    items: [
      ['Event Types & Labels', '/settings/event-types'],
      ['Custom Fields', '/settings/custom-fields'],
    ],
  },
  {
    section: 'Print & Documents',
    component: files.settingsPage,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'none',
    state: 'static',
    items: [['Print Preferences', '/settings/print']],
  },
  {
    section: 'Payments & Billing',
    component: files.settingsPage,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'none',
    state: 'static',
    items: [
      ['Stripe Payouts', '/settings/stripe-connect'],
      ['Support ChefFlow', '/settings/billing'],
      ['Modules', '/settings/modules'],
      ['Digital Wallets', '/settings/payment-methods'],
    ],
  },
  {
    section: 'Communication & Workflow',
    component: files.settingsPage,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'none',
    state: 'static',
    items: [
      ['Response Templates', '/settings/templates'],
      ['Front-of-House Menu Templates', '/settings/menu-templates'],
      ['Automations', '/settings/automations'],
      ['Seasonal Palettes', '/settings/repertoire'],
      ['Chef Journal', '/settings/journal'],
    ],
  },
  {
    section: 'Notifications & Alerts',
    component: files.settingsPage,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'none',
    state: 'static',
    items: [['Notification Channels', '/settings/notifications']],
  },
  {
    section: 'Connected Accounts & Integrations',
    component: files.settingsPage,
    source: 'hardcoded component',
    visibility: 'conditional',
    conditions: 'Zapier & Webhooks only when developerToolsEnabled',
    state: 'static',
    items: [
      ['Website Widget', '/settings/embed'],
      ['Manage Integrations', '/settings/integrations'],
      ['Calendar Sync (iCal)', '/settings/calendar-sync'],
      ['Zapier & Webhooks', '/settings/zapier'],
    ],
  },
  {
    section: 'AI & Privacy',
    component: files.settingsPage,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'none',
    state: 'static',
    items: [
      ['AI Trust Center', '/settings/ai-privacy'],
      ['Culinary Profile', '/settings/culinary-profile'],
      ['Remy Control Center', '/settings/remy'],
    ],
  },
  {
    section: 'Client Reviews',
    component: files.settingsPage,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'none',
    state: 'static',
    items: [
      ['Yelp Reviews', '/settings/yelp'],
      ['View All Reviews', '/reviews'],
    ],
  },
  {
    section: 'Appearance',
    component: files.settingsPage,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'none',
    state: 'static',
    items: [['Theme', '/settings/appearance']],
  },
  {
    section: 'Professional Growth',
    component: files.settingsPage,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'none',
    state: 'static',
    items: [
      ['Professional Development', '/settings/professional'],
      ['Capability Inventory', '/settings/professional/skills'],
      ['Professional Momentum', '/settings/professional/momentum'],
      ['Profile Highlights', '/settings/highlights'],
      ['Portfolio', '/settings/portfolio'],
      ['Credentials', '/settings/credentials'],
    ],
  },
  {
    section: 'Chef Network',
    component: files.settingsPage,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'none',
    state: 'static',
    items: [['Network Profile', '/settings/profile']],
  },
  {
    section: 'Legal & Protection',
    component: files.settingsPage,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'none',
    state: 'static',
    items: [
      ['Protection Hub', '/settings/protection'],
      ['Contract Templates', '/settings/contracts'],
      ['Food Safety & Compliance', '/settings/compliance'],
      ['GDPR & Privacy', '/settings/compliance/gdpr'],
      ['Emergency Contacts', '/settings/emergency'],
    ],
  },
  {
    section: 'API & Developer',
    component: files.settingsPage,
    source: 'hardcoded component',
    visibility: 'conditional',
    conditions: 'only when developerToolsEnabled',
    state: 'static',
    items: [
      ['API Keys', '/settings/api-keys'],
      ['Webhooks', '/settings/webhooks'],
    ],
  },
  {
    section: 'Account & Security',
    component: files.settingsPage,
    source: 'hardcoded component',
    visibility: 'conditional',
    conditions: 'System Incidents only when userIsAdmin',
    state: 'static',
    items: [
      ['Account Settings', '/settings/account'],
      ['System Health', '/settings/health'],
      ['System Incidents', '/settings/incidents'],
    ],
  },
]

const surfaceSections = [
  {
    section: 'Breadcrumb Bar',
    component: files.breadcrumbBar,
    source: 'hardcoded component',
    visibility: 'conditional',
    conditions: 'shown for non-dashboard routes in chef main content',
    state: 'generated',
    type: 'generated',
    items: [['Breadcrumb segments', 'current pathname']],
  },
  {
    section: 'Recent Pages',
    component: files.recentPages,
    source: 'other origin',
    visibility: 'conditional',
    conditions: 'only when recent pages exist in localStorage; excludes /settings and /api',
    state: 'dynamic',
    type: 'generated',
    items: [['Recent', 'history-backed list']],
  },
  {
    section: 'Browse Everything',
    component: files.allFeatures,
    source: 'config',
    visibility: 'always visible',
    conditions: 'none',
    state: 'generated',
    type: 'menu',
    items: [['Browse Everything', 'expands full navGroups inventory']],
  },
  {
    section: 'Network Header Links',
    component: files.networkPage,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'none',
    state: 'static',
    type: 'link',
    items: [
      ['Notifications', '/network/notifications'],
      ['Saved', '/network/saved'],
      ['Profile', '/settings/profile'],
      ['Privacy notice', '/settings'],
    ],
  },
  {
    section: 'Network Tabs',
    component: files.networkPage,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'none',
    state: 'dynamic',
    type: 'tab',
    items: [
      ['Feed', '/network?tab=feed'],
      ['Channels', '/network?tab=channels'],
      ['Discover', '/network?tab=discover'],
      ['Connections', '/network?tab=connections'],
      ['Collab', '/network?tab=collab'],
    ],
  },
  {
    section: 'Event Detail Mobile Tabs',
    component: files.eventDetailMobileNav,
    source: 'hardcoded component',
    visibility: 'conditional',
    conditions: 'mobile event detail only',
    state: 'dynamic',
    type: 'tab',
    items: [
      ['Overview', 'current event route?tab=overview'],
      ['Money', 'current event route?tab=money'],
      ['Ops', 'current event route?tab=ops'],
      ['Wrap-up', 'current event route?tab=wrap'],
    ],
  },
  {
    section: 'Quotes Filter Tabs',
    component: files.quotesTabs,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'quotes list page',
    state: 'dynamic',
    type: 'tab',
    items: [
      ['All', '/quotes?status=all'],
      ['Draft', '/quotes?status=draft'],
      ['Sent', '/quotes?status=sent'],
      ['Accepted', '/quotes?status=accepted'],
      ['Rejected', '/quotes?status=rejected'],
      ['Expired', '/quotes?status=expired'],
    ],
  },
  {
    section: 'Activity Filters',
    component: files.activityFilters,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'activity page',
    state: 'dynamic',
    type: 'tab',
    items: [
      ['My Activity', '/activity (local filter)'],
      ['Client Activity', '/activity (local filter)'],
      ['All', '/activity (local filter)'],
    ],
  },
  {
    section: 'Client Preview Tabs',
    component: files.clientPreviewTabs,
    source: 'hardcoded component',
    visibility: 'conditional',
    conditions: 'Open Live Profile only when slug exists',
    state: 'dynamic',
    type: 'tab',
    items: [
      ['Public Profile', '/settings/client-preview (local tab)'],
      ['Client Portal', '/settings/client-preview (local tab)'],
      ['Open Live Profile', '/chef/${slug}'],
    ],
  },
  {
    section: 'Professional Development Tabs',
    component: files.professionalTabs,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'professional settings page',
    state: 'dynamic',
    type: 'tab',
    items: [
      ['Achievements', '/settings/professional (local tab)'],
      ['Learning Goals', '/settings/professional (local tab)'],
    ],
  },
  {
    section: 'HACCP Tabs',
    component: files.haccpTabs,
    source: 'hardcoded component',
    visibility: 'always visible',
    conditions: 'HACCP settings page',
    state: 'dynamic',
    type: 'tab',
    items: [
      ['Reference Document', '/settings/compliance/haccp (local tab)'],
      ['Guided Review', '/settings/compliance/haccp (local tab)'],
    ],
  },
]

const adminItems = [
  ['Overview', '/admin', 'LayoutDashboard', 'permission-based', 'admin user'],
  ['Live Presence', '/admin/presence', 'Radio', 'permission-based', 'admin user'],
  ['Chefs', '/admin/users', 'Users', 'permission-based', 'admin user'],
  ['Clients', '/admin/clients', 'UserCheck', 'permission-based', 'admin user'],
  ['Analytics', '/admin/analytics', 'BarChart3', 'permission-based', 'admin user'],
  ['Financials', '/admin/financials', 'DollarSign', 'permission-based', 'admin user'],
  ['All Events', '/admin/events', 'CalendarRange', 'permission-based', 'admin user'],
  ['Audit Log', '/admin/audit', 'ScrollText', 'permission-based', 'admin user'],
  ['System Health', '/admin/system', 'Activity', 'permission-based', 'admin user'],
  ['Communications', '/admin/communications', 'Megaphone', 'permission-based', 'admin user'],
  ['Feature Flags', '/admin/flags', 'ToggleLeft', 'permission-based', 'admin user'],
  ['Referral Partners', '/admin/referral-partners', 'Handshake', 'permission-based', 'admin user'],
  ['Feedback', '/admin/feedback', 'MessageSquare', 'permission-based', 'admin user'],
  ['Animations', '/admin/animations', 'Sparkles', 'permission-based', 'admin user'],
  ['Early Signups', '/admin/beta', 'Rocket', 'permission-based', 'admin user'],
  ['Surveys', '/admin/beta-surveys', 'ClipboardList', 'permission-based', 'admin user'],
  ['Silent Failures', '/admin/silent-failures', 'ShieldAlert', 'permission-based', 'admin user'],
  ['Cannabis Tier', '/admin/cannabis', 'Leaf', 'conditional', 'feature disabled; commented out in source; admin-only area'],
]

const duplicates = [
  ['/admin', 'Admin | Overview'],
  ['/calendar', 'Calendar | Calendar Date'],
  ['/circles', 'Dinner Circles | Circles'],
  ['/clients', 'Clients | Client Directory'],
  ['/clients/new', 'Add Client | New Client | Client'],
  ['/culinary', 'Culinary | Culinary Hub'],
  ['/culinary/prep', 'Prep Workspace | Prep'],
  ['/culinary/prep/shopping', 'Shopping Lists | Shopping List'],
  ['/daily', 'Daily View | Daily Ops'],
  ['/dashboard', 'Dashboard | Home'],
  ['/events/new', 'Create Event | New Event | Event'],
  ['/expenses/new', 'Add Expense | New Expense'],
  ['/financials', 'Finance | Financial Hub | Money'],
  ['/import', 'Smart Import | Data Import'],
  ['/inquiries/new', 'New Inquiry | Inquiry'],
  ['/intelligence', 'Intelligence Hub | Full Dashboard'],
  ['/inventory', 'Inventory Hub | Inventory Item'],
  ['/marketplace', 'Marketplace | Command Center'],
  ['/meal-prep', 'Meal Prep | Dashboard'],
  ['/menus/new', 'New Menu | Menu'],
  ['/menus/upload', 'Menu Upload | Upload Menu'],
  ['/network', 'Chef Network | Community Hub'],
  ['/network/saved', 'Saved Chefs | Saved Posts'],
  ['/operations/equipment', 'Equipment | Maintenance Schedule'],
  ['/queue', 'Priority Queue | Queue'],
  ['/quotes/new', 'New Quote | Quote'],
  ['/receipts', 'Receipt Library | Upload Receipt'],
  ['/recipes/photos', 'Step Photos | Photo Upload'],
  ['/social/planner', 'Content Planner | Post Planner'],
  ['/wix-submissions', 'Wix Submissions | Wix Forms'],
]

const inconsistencies = [
  ['Clients', '/clients | /admin/clients'],
  ['Command Center', '/marketplace | /admin/command-center'],
  ['Communication', '/clients/communication | /settings/communication'],
  ['Daily Ops', '/stations/daily-ops | /daily'],
  ['Dashboard', '/dashboard | /meal-prep'],
  ['Notifications', '/network/notifications | /notifications | /admin/notifications | /settings/notifications'],
  ['Overview', '/finance/overview | /admin'],
  ['Reports', '/reports | /commerce/reports | /finance/reporting'],
  ['Surveys', '/surveys | /admin/beta-surveys'],
  ['Templates', '/culinary/menus/templates | /marketing/templates | /settings/contracts | /proposals/templates'],
]

const orphans = [
  ['/chef/cannabis/handbook', abs('app/(chef)/chef/cannabis/handbook/page.tsx')],
  ['/chef/cannabis/rsvps', abs('app/(chef)/chef/cannabis/rsvps/page.tsx')],
  ['/prospecting/openclaw', abs('app/(chef)/prospecting/openclaw/page.tsx')],
  ['/stations/orders/print', abs('app/(chef)/stations/orders/print/page.tsx')],
]

const entryPoints = [
  ['Clients', '/clients | /clients/new | /admin/clients | /settings/navigation | command palette: New Client'],
  ['Events', '/events | /events/new | /calendar | /production | /admin/events | /settings/navigation | command palette: New Event'],
  ['Recipes', '/recipes | /recipes/new | /culinary/recipes | /recipes/photos | command palette: New Recipe'],
  ['Clients, Events, related core areas', '/inquiries | /inquiries/new | /quotes | /quotes/new | /contracts | /calls | /financials | /network'],
]

let out = ''
out += '# Chef Portal Navigation Map\n\n'
out += '## Verification\n'
for (const file of Object.values(files)) out += `- scanned: ${file}\n`
out += '\n'
out += 'UNVERIFIED markers indicate dynamic, callback-driven, or otherwise non-static targets that were not confirmable as a concrete route/page file.\n\n'

out += '## Hierarchical Tree\n\n'
out += `### Surface: Chef Desktop Sidebar\ncomponent: ${files.chefSidebar}\nsource: config + hardcoded component\n\n`
out += `#### standaloneTop\n${renderConfigTree(nav.standaloneTop, files.chefSidebar, `config (${files.navConfig})`)}\n\n`
for (const group of nav.navGroups) {
  out += `#### navGroup: ${group.label} (${group.id})\nmodule: ${group.module || 'none'}\n${renderConfigTree(group.items, files.chefSidebar, `config (${files.navConfig})`)}\n\n`
}
out += `#### standaloneBottom\n${renderConfigTree(nav.standaloneBottom, files.chefSidebar, `config (${files.navConfig})`)}\n\n`
out += `#### Community accordion\n${renderConfigTree(nav.communitySectionItems, files.chefSidebar, `config (${files.chefNavConfig})`)}\n\n`
out += `#### Quick create list\n${renderConfigTree(nav.QUICK_CREATE_ITEMS, files.chefSidebar, `config (${files.chefNavConfig})`)}\n\n`
totalNavigationItems += 1
out += `${renderNode({
  label: 'Cannabis',
  type: 'section',
  href: 'none',
  component: files.chefSidebar,
  source: `config (${files.chefNavConfig})`,
  visibility: 'conditional',
  conditions: 'feature disabled; exported array is empty',
  state: 'static',
  icon: 'none',
})}\n\n`

out += `### Surface: Chef Mobile Navigation\ncomponent: ${files.chefMobileNav}\nsource: config + hardcoded component\n\n`
out += `#### mobileTabItems\n${renderConfigTree(nav.mobileTabItems, files.chefMobileNav, `config (${files.navConfig})`)}\n\n`
out += `#### resolveStandaloneTop result surface\n${renderConfigTree(nav.standaloneTop, files.chefMobileNav, `config (${files.navConfig})`, {
  conditions: 'resolved through resolveStandaloneTop and user primary_nav_hrefs personalization',
})}\n\n`
out += `#### Community links\n${renderConfigTree(nav.communitySectionItems, files.chefMobileNav, `config (${files.chefNavConfig})`)}\n\n`

out += `### Surface: Action Bar\n${renderConfigTree(nav.actionBarItems, files.actionBar, `config (${files.navConfig})`)}\n\n`
out += `### Surface: Create Dropdown\n${renderConfigTree(nav.createDropdownItems, files.createMenuDropdown, `config (${files.navConfig})`)}\n\n`

out += `### Surface: Command Palette\n`
out += `#### primary shortcuts\n${renderConfigTree(nav.primaryShortcutOptions, files.commandPalette, `config (${files.navConfig})`, {
  conditions: 'mirrors getPrimaryShortcutOptions()',
})}\n\n`
out += '#### quick actions\n'
for (const [label, href, icon] of [
  ['New Event', '/events/new', 'Plus'],
  ['New Menu', '/menus/new', 'Plus'],
  ['New Client', '/clients/new', 'Plus'],
  ['New Quote', '/quotes/new', 'Plus'],
  ['New Inquiry', '/inquiries/new', 'Plus'],
  ['New Expense', '/expenses/new', 'Plus'],
  ['New Recipe', '/recipes/new', 'Plus'],
  ['Open Remy', 'UNVERIFIED', 'Sparkles'],
]) {
  totalNavigationItems += 1
  trackHref(href)
  out +=
    renderNode({
      label,
      type: href === 'UNVERIFIED' ? 'action' : 'link',
      href,
      component: files.commandPalette,
      source: 'hardcoded component',
      visibility: 'always visible',
      conditions: label === 'Open Remy' ? 'custom event callback, no route' : 'none',
      state: 'static',
      icon,
    }) + '\n'
}
out += '\n'

out += `### Surface: Settings Hub And Directory\ncomponent: ${files.settingsPage}\nsource: hardcoded component\n\n`
for (const section of settingsSections) {
  out += `#### ${section.section}\n`
  for (const [label, href] of section.items) {
    totalNavigationItems += 1
    trackHref(href)
    out +=
      renderNode({
        label,
        type: 'link',
        href,
        component: section.component,
        source: section.source,
        visibility: section.visibility,
        conditions: section.conditions,
        state: section.state,
        icon: 'none',
      }) + '\n'
  }
  out += '\n'
}

for (const section of surfaceSections) {
  out += `### Surface: ${section.section}\n`
  for (const [label, href] of section.items) {
    totalNavigationItems += 1
    trackHref(href)
    out +=
      renderNode({
        label,
        type: section.type,
        href,
        component: section.component,
        source: section.source,
        visibility: section.visibility,
        conditions: section.conditions,
        state: section.state,
        icon: 'none',
      }) + '\n'
  }
  out += '\n'
}

out += `### Surface: Admin Shell\ncomponent: ${files.adminShell}\nsource: admin nav config rendered by admin shell\n\n`
for (const [label, href, icon, visibility, conditions] of adminItems) {
  totalNavigationItems += 1
  trackHref(href)
  out +=
    renderNode({
      label,
      type: 'link',
      href,
      component: files.adminShell,
      source: 'hardcoded component',
      visibility,
      conditions,
      state: 'static',
      icon,
    }) + '\n'
}
totalNavigationItems += 1
trackHref('/')
out +=
  renderNode({
    label: 'Sign Out',
    type: 'action',
    href: '/',
    component: files.adminShell,
    source: 'hardcoded component',
    visibility: 'permission-based',
    conditions: 'admin user',
    state: 'static',
    icon: 'LogOut',
  }) + '\n\n'

out += '## Duplicates\n'
for (const [route, labels] of duplicates) out += `- ${route}: ${labels}\n`
out += '\n'

out += '## Inconsistencies\n'
for (const [label, routes] of inconsistencies) out += `- ${label}: ${routes}\n`
out += `- /social/compose: configured nav target present, but no static page file was confirmed; only ${abs('app/(chef)/social/compose/[eventId]/page.tsx')} exists.\n\n`

out += '## Orphans\n'
for (const [route, file] of orphans) out += `- ${route} -> ${file}\n`
out += '\n'

out += '## Entry Points\n'
for (const [entity, points] of entryPoints) out += `- ${entity}: ${points}\n`
out += '\n'

out += '## Flat List Of Unique Routes\n'
for (const route of [...uniqueRoutes].sort()) out += `- ${route}\n`
out += '\n'

out += '## Flat List Of Unique Pages/Components\n'
for (const file of [...uniquePageComponents].sort()) out += `- ${file}\n`
out += '\n'

out += '## Counts\n'
out += `- total navigation items: ${totalNavigationItems}\n`
out += `- total routes: ${uniqueRoutes.size}\n`
out += `- deepest nesting level: ${Math.max(deepestNestingLevel, 2)}\n`
out += `- total unique pages/components: ${uniquePageComponents.size}\n`

fs.writeFileSync(path.join(cwd, 'chef-navigation-map.md'), out, 'utf8')
console.log('wrote chef-navigation-map.md')
